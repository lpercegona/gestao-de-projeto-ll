import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6";

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

    // SMTP config
    const smtpHost = Deno.env.get("SMTP_HOST");
    const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "587", 10);
    const smtpUser = Deno.env.get("SMTP_USER");
    const smtpPass = Deno.env.get("SMTP_PASS");

    // Verify user
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

    const { proposal_id } = await req.json();
    if (!proposal_id) {
      return new Response(JSON.stringify({ error: "proposal_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch proposal
    const { data: proposal, error: propError } = await adminClient
      .from("proposals")
      .select("*, proposal_templates(description, sections)")
      .eq("id", proposal_id)
      .single();

    if (propError || !proposal) {
      return new Response(JSON.stringify({ error: "Proposal not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch email template
    const { data: emailTemplate } = await adminClient
      .from("email_templates")
      .select("*")
      .eq("slug", "proposal_sent")
      .single();

    const baseUrl = req.headers.get("origin") || `https://${req.headers.get("host")}`;
    const proposalLink = `${baseUrl}/proposal/${proposal.share_token}`;

    // Build email content
    let subject = emailTemplate?.subject || "Nova proposta: {{titulo_proposta}}";
    let bodyHtml = emailTemplate?.body_html || `<p>Olá {{nome_cliente}},</p><p>Você recebeu uma nova proposta.</p><p><a href="{{link_proposta}}">Ver proposta</a></p>`;

    const replacements: Record<string, string> = {
      "{{nome_cliente}}": proposal.recipient_name || "",
      "{{email_cliente}}": proposal.recipient_email || "",
      "{{titulo_proposta}}": proposal.title || "",
      "{{link_proposta}}": proposalLink,
    };

    for (const [key, value] of Object.entries(replacements)) {
      subject = subject.replaceAll(key, value);
      bodyHtml = bodyHtml.replaceAll(key, value);
    }

    // Update status to sent
    await adminClient
      .from("proposals")
      .update({ status: "sent" })
      .eq("id", proposal_id);

    // Send email via SMTP
    if (smtpHost && smtpUser && smtpPass) {
      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
        });

        await transporter.sendMail({
          from: smtpUser,
          to: proposal.recipient_email,
          subject,
          html: bodyHtml,
        });

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

    // No SMTP config
    return new Response(
      JSON.stringify({ success: true, email_sent: false, reason: "SMTP not configured" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error in send-proposal-email:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
