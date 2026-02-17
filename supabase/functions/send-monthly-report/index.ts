import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function resolveFromName(adminClient: any, ownerId: string | null): Promise<string> {
  if (ownerId) {
    const { data } = await adminClient.from("smtp_settings").select("smtp_from_name").eq("owner_id", ownerId).maybeSingle();
    if (data?.smtp_from_name) return data.smtp_from_name;
  }
  const { data: global } = await adminClient.from("smtp_settings").select("smtp_from_name").is("owner_id", null).maybeSingle();
  if (global?.smtp_from_name) return global.smtp_from_name;
  return "";
}

async function getSmtpCredentials(adminClient: any, _ownerId: string | null) {
  // Keep global SMTP settings as default for everyone
  const { data: globalSmtp } = await adminClient
    .from("smtp_settings")
    .select("*")
    .is("owner_id", null)
    .maybeSingle();
  if (globalSmtp?.smtp_host && globalSmtp?.smtp_user) {
    return {
      host: globalSmtp.smtp_host,
      port: globalSmtp.smtp_port || 587,
      user: globalSmtp.smtp_user,
      pass: globalSmtp.smtp_pass || "",
    };
  }

  // Fallback to env vars
  const host = Deno.env.get("SMTP_HOST");
  const user = Deno.env.get("SMTP_USER");
  const pass = Deno.env.get("SMTP_PASS");
  const port = parseInt(Deno.env.get("SMTP_PORT") || "587", 10);
  if (host && user) {
    return { host, port, user, pass: pass || "" };
  }

  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { client_id } = await req.json();
    if (!client_id) {
      return new Response(JSON.stringify({ error: "client_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch client
    const { data: client, error: clientError } = await adminClient
      .from("clients")
      .select("*")
      .eq("id", client_id)
      .single();

    if (clientError || !client) {
      return new Response(JSON.stringify({ error: "Client not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calculate previous month
    const now = new Date();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const periodoRelatorio = prevMonth.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

    // Calculate total hours for previous month
    const startDate = prevMonth.toISOString().split("T")[0];
    const endDate = prevMonthEnd.toISOString().split("T")[0];

    // Get projects for this client
    const { data: projects } = await adminClient
      .from("projects")
      .select("id")
      .eq("client_id", client_id);

    const projectIds = (projects || []).map((p: any) => p.id);
    let totalHours = 0;

    if (projectIds.length > 0) {
      // Get tasks for these projects
      const { data: tasks } = await adminClient
        .from("tasks")
        .select("id")
        .in("project_id", projectIds);

      const taskIds = (tasks || []).map((t: any) => t.id);

      if (taskIds.length > 0) {
        const { data: entries } = await adminClient
          .from("time_entries")
          .select("hours")
          .in("task_id", taskIds)
          .gte("date", startDate)
          .lte("date", endDate);

        totalHours = (entries || []).reduce((sum: number, e: any) => sum + Number(e.hours), 0);
      }
    }

    // Get report share link
    const { data: reportShare } = await adminClient
      .from("report_shares")
      .select("share_token, is_public")
      .eq("client_id", client_id)
      .eq("is_public", true)
      .maybeSingle();

    const baseUrl = req.headers.get("origin") || `https://${req.headers.get("host")}`;
    const linkRelatorio = reportShare?.share_token
      ? `${baseUrl}/report/${reportShare.share_token}`
      : `${baseUrl}`;

    // Fetch email template
    const ownerId = client.owner_id;
    let emailTemplate = null;

    if (ownerId) {
      const { data: personal } = await adminClient
        .from("email_templates")
        .select("*")
        .eq("slug", "monthly_report_sent")
        .eq("owner_id", ownerId)
        .maybeSingle();
      emailTemplate = personal;
    }

    if (!emailTemplate) {
      const { data: global } = await adminClient
        .from("email_templates")
        .select("*")
        .eq("slug", "monthly_report_sent")
        .is("owner_id", null)
        .maybeSingle();
      emailTemplate = global;
    }

    const horasFormatadas = `${Math.floor(totalHours)}h ${Math.round((totalHours % 1) * 60)}min`;

    let subject = emailTemplate?.subject || "Relatório mensal: {{periodo_relatorio}}";
    let bodyHtml = emailTemplate?.body_html ||
      `<p>Olá {{nome_cliente}},</p><p>Seu relatório referente a {{periodo_relatorio}} está disponível.</p><p>Total de horas: {{horas_totais}}</p><p><a href="{{link_relatorio}}">Ver relatório</a></p>`;

    const replacements: Record<string, string> = {
      "{{nome_cliente}}": client.name || "",
      "{{periodo_relatorio}}": periodoRelatorio,
      "{{link_relatorio}}": linkRelatorio,
      "{{horas_totais}}": horasFormatadas,
    };

    for (const [key, value] of Object.entries(replacements)) {
      subject = subject.replaceAll(key, value);
      bodyHtml = bodyHtml.replaceAll(key, value);
    }

    // Get SMTP credentials
    const smtp = await getSmtpCredentials(adminClient, ownerId);

    if (!smtp) {
      // Update last sent anyway to avoid retries
      await adminClient
        .from("clients")
        .update({ auto_report_last_sent: new Date().toISOString() } as any)
        .eq("id", client_id);

      return new Response(
        JSON.stringify({ success: true, email_sent: false, reason: "SMTP not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    try {
      const smtpClient = new SMTPClient({
        connection: {
          hostname: smtp.host,
          port: smtp.port,
          tls: smtp.port === 465,
          auth: { username: smtp.user, password: smtp.pass },
        },
      });

      const resolvedFromName = await resolveFromName(adminClient, ownerId);
      const fromAddress = resolvedFromName ? `${resolvedFromName} <${smtp.user}>` : smtp.user;

      await smtpClient.send({
        from: fromAddress,
        to: client.email,
        subject,
        content: "auto",
        html: bodyHtml,
      });

      await smtpClient.close();

      // Update last sent
      await adminClient
        .from("clients")
        .update({ auto_report_last_sent: new Date().toISOString() } as any)
        .eq("id", client_id);

      // Create notification for admin
      if (ownerId) {
        const mesRelatorio = prevMonth.toLocaleDateString("pt-BR", { month: "long" });
        const empresaCliente = client.company || client.name;
        await adminClient.from("notifications").insert({
          user_id: ownerId,
          type: "auto_report_sent",
          title: "Relatório automático enviado",
          message: `O relatório mensal referente ao mês de ${mesRelatorio} foi enviado ao cliente ${empresaCliente}.`,
        });
      }

      return new Response(
        JSON.stringify({ success: true, email_sent: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (emailErr) {
      console.error("SMTP error:", emailErr);

      // Still update last sent to prevent spam retries
      await adminClient
        .from("clients")
        .update({ auto_report_last_sent: new Date().toISOString() } as any)
        .eq("id", client_id);

      return new Response(
        JSON.stringify({ success: true, email_sent: false, email_error: String(emailErr) }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (err) {
    console.error("Error in send-monthly-report:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
