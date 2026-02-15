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

    const smtpHost = Deno.env.get("SMTP_HOST");
    const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "587", 10);
    const smtpUser = Deno.env.get("SMTP_USER");
    const smtpPass = Deno.env.get("SMTP_PASS");

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

    const { contract_id } = await req.json();
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

    const { data: emailTemplate } = await adminClient
      .from("email_templates")
      .select("*")
      .eq("slug", "contract_sent")
      .single();

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

    await adminClient
      .from("contracts")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", contract_id);

    if (smtpHost && smtpUser && smtpPass) {
      try {
        const client = new SMTPClient({
          connection: {
            hostname: smtpHost,
            port: smtpPort,
            tls: smtpPort === 465,
            auth: {
              username: smtpUser,
              password: smtpPass,
            },
          },
        });

        await client.send({
          from: smtpUser,
          to: contract.contractor_email,
          subject,
          content: "auto",
          html: bodyHtml,
        });

        await client.close();

        return new Response(
          JSON.stringify({ success: true, email_sent: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (emailErr) {
        console.error("SMTP error:", emailErr);
        return new Response(
          JSON.stringify({ success: true, email_sent: false, email_error: String(emailErr) }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
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
