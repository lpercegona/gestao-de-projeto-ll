import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const contract_id = body.contract_id || body.contractId;
    if (!contract_id) {
      return new Response(JSON.stringify({ error: "contract_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: contract, error: contractError } = await adminClient
      .from("contracts")
      .select("*")
      .eq("id", contract_id)
      .single();

    if (contractError || !contract) {
      return new Response(JSON.stringify({ error: "Contract not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch email template: personal first, then global fallback
    const creatorId = contract.created_by || contract.owner_id;
    let emailTemplate = null;

    if (creatorId) {
      const { data: personal } = await adminClient
        .from("email_templates")
        .select("*")
        .eq("slug", "contract_sent")
        .eq("owner_id", creatorId)
        .single();
      emailTemplate = personal;
    }

    if (!emailTemplate) {
      const { data: global } = await adminClient
        .from("email_templates")
        .select("*")
        .eq("slug", "contract_sent")
        .is("owner_id", null)
        .single();
      emailTemplate = global;
    }

    const baseUrl = req.headers.get("origin") || `https://${req.headers.get("host")}`;
    const contractLink = `${baseUrl}/contract/${contract.share_token}`;

    let subject = emailTemplate?.subject || "Novo contrato: {{titulo_contrato}}";
    let bodyHtml = emailTemplate?.body_html || `<p>Olá {{nome_cliente}},</p><p>Você recebeu um novo contrato para análise e assinatura.</p><p><a href="{{link_contrato}}">Ver e assinar contrato</a></p>`;

    const replacements: Record<string, string> = {
      "{{nome_cliente}}": contract.contractor_name || "",
      "{{email_cliente}}": contract.contractor_email || "",
      "{{titulo_contrato}}": contract.title || "",
      "{{link_contrato}}": contractLink,
    };

    for (const [key, value] of Object.entries(replacements)) {
      subject = subject.replaceAll(key, value);
      bodyHtml = bodyHtml.replaceAll(key, value);
    }

    // Status update moved to after successful email send

    // Resolve fromName independently: owner -> global -> empty
    const creatorOwnerId = contract.created_by || contract.owner_id;
    let resolvedFromName = "";

    if (creatorOwnerId) {
      const { data: ownerSettings } = await adminClient.from("smtp_settings").select("smtp_from_name").eq("owner_id", creatorOwnerId).maybeSingle();
      if (ownerSettings?.smtp_from_name) resolvedFromName = ownerSettings.smtp_from_name;
    }
    if (!resolvedFromName) {
      const { data: globalSettings } = await adminClient.from("smtp_settings").select("smtp_from_name").is("owner_id", null).maybeSingle();
      if (globalSettings?.smtp_from_name) resolvedFromName = globalSettings.smtp_from_name;
    }

    // Get SMTP credentials: keep global default for everyone, then env vars fallback
    let smtp: { host: string; port: number; user: string; pass: string } | null = null;

    const { data: globalSmtp } = await adminClient.from("smtp_settings").select("*").is("owner_id", null).maybeSingle();
    if (globalSmtp?.smtp_host && globalSmtp?.smtp_user) {
      smtp = { host: globalSmtp.smtp_host, port: globalSmtp.smtp_port || 587, user: globalSmtp.smtp_user, pass: globalSmtp.smtp_pass || "" };
    }
    if (!smtp) {
      const envHost = Deno.env.get("SMTP_HOST");
      const envUser = Deno.env.get("SMTP_USER");
      const envPass = Deno.env.get("SMTP_PASS");
      const envPort = parseInt(Deno.env.get("SMTP_PORT") || "587", 10);
      if (envHost && envUser && envPass) {
        smtp = { host: envHost, port: envPort, user: envUser, pass: envPass };
      }
    }

    if (smtp) {
      const createSmtpClient = (port: number) =>
        new SMTPClient({
          connection: {
            hostname: smtp.host,
            port,
            tls: port === 465,
            auth: { username: smtp.user, password: smtp.pass },
          },
        });

      let client: SMTPClient | null = null;
      const preferredPort = smtp.port || 587;

      try {
        client = createSmtpClient(preferredPort);

        const fromAddress = resolvedFromName ? `${resolvedFromName} <${smtp.user}>` : smtp.user;

        await client.send({
          from: fromAddress,
          to: contract.contractor_email,
          subject,
          content: "auto",
          html: bodyHtml,
        });

        // Update status to sent AFTER successful email delivery
        await adminClient
          .from("contracts")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", contract_id);

        return new Response(
          JSON.stringify({ success: true, email_sent: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (emailErr) {
        const shouldTryFallback = preferredPort !== 465;

        if (shouldTryFallback) {
          console.warn("[send-contract-email] STARTTLS failed on 587, retrying with implicit TLS on 465");

          if (client) {
            try { await client.close(); } catch (_) { /* ignore */ }
            client = null;
          }

          try {
            client = createSmtpClient(465);

            const fromAddress = resolvedFromName ? `${resolvedFromName} <${smtp.user}>` : smtp.user;

            await client.send({
              from: fromAddress,
              to: contract.contractor_email,
              subject,
              content: "auto",
              html: bodyHtml,
            });

            await adminClient
              .from("contracts")
              .update({ status: "sent", sent_at: new Date().toISOString() })
              .eq("id", contract_id);

            return new Response(
              JSON.stringify({ success: true, email_sent: true }),
              { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          } catch (fallbackErr) {
            console.error("SMTP fallback error:", fallbackErr);
            return new Response(
              JSON.stringify({ success: true, email_sent: false, email_error: String(fallbackErr) }),
              { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }

        console.error("SMTP error:", emailErr);
        return new Response(
          JSON.stringify({ success: true, email_sent: false, email_error: String(emailErr) }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } finally {
        if (client) {
          try { await client.close(); } catch (_) { /* ignore */ }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, email_sent: false, reason: "SMTP not configured" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error in send-contract-email:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
