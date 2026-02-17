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

    const { proposal_id } = await req.json();
    if (!proposal_id) {
      return new Response(JSON.stringify({ error: "proposal_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

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

    // Resolve effective owner id with priority:
    // 1) proposal.owner_id
    // 2) profiles.owner_id by proposal.created_by
    // 3) proposal.created_by
    let effectiveOwnerId: string | null = proposal.owner_id || null;
    let ownershipResolutionError = false;

    if (!effectiveOwnerId && proposal.created_by) {
      const { data: creatorProfile, error: creatorProfileError } = await adminClient
        .from("profiles")
        .select("owner_id")
        .eq("user_id", proposal.created_by)
        .maybeSingle();

      if (creatorProfileError) {
        ownershipResolutionError = true;
        console.error("[send-proposal-email] failed to resolve owner via profile", {
          proposal_id,
          created_by: proposal.created_by,
          error: creatorProfileError,
        });
      }

      if (!effectiveOwnerId && creatorProfile?.owner_id) {
        effectiveOwnerId = creatorProfile.owner_id;
        console.info("[send-proposal-email] owner resolved via profile", {
          proposal_id,
          created_by: proposal.created_by,
          effectiveOwnerId,
        });
      }
    }

    if (!effectiveOwnerId && proposal.created_by) {
      effectiveOwnerId = proposal.created_by;
      console.info("[send-proposal-email] owner fallback to proposal.created_by", {
        proposal_id,
        created_by: proposal.created_by,
        effectiveOwnerId,
      });
    }

    if (proposal.owner_id) {
      console.info("[send-proposal-email] owner resolved directly from proposal.owner_id", {
        proposal_id,
        created_by: proposal.created_by,
        effectiveOwnerId,
      });
    }

    if (!effectiveOwnerId) {
      console.warn("[send-proposal-email] no effective owner id resolved", { proposal_id });
    }

    if (ownershipResolutionError) {
      return new Response(
        JSON.stringify({ error: "Ownership resolution failed", code: "OWNERSHIP_RESOLUTION_FAILED" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch email template: personal first, then global fallback
    let emailTemplate = null;

    if (effectiveOwnerId) {
      const { data: personal } = await adminClient
        .from("email_templates")
        .select("*")
        .eq("slug", "proposal_sent")
        .eq("owner_id", effectiveOwnerId)
        .single();
      emailTemplate = personal;
    }

    if (!emailTemplate) {
      const { data: global } = await adminClient
        .from("email_templates")
        .select("*")
        .eq("slug", "proposal_sent")
        .is("owner_id", null)
        .single();
      emailTemplate = global;
    }

    const baseUrl = req.headers.get("origin") || `https://${req.headers.get("host")}`;
    const proposalLink = `${baseUrl}/proposal/${proposal.share_token}`;

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

    await adminClient
      .from("proposals")
      .update({ status: "sent" })
      .eq("id", proposal_id);

    // Resolve fromName independently: owner -> global -> empty
    let resolvedFromName = "";

    if (effectiveOwnerId) {
      const { data: ownerSettings } = await adminClient.from("smtp_settings").select("smtp_from_name").eq("owner_id", effectiveOwnerId).maybeSingle();
      if (ownerSettings?.smtp_from_name) resolvedFromName = ownerSettings.smtp_from_name;
    }
    if (!resolvedFromName) {
      const { data: globalSettings } = await adminClient.from("smtp_settings").select("smtp_from_name").is("owner_id", null).maybeSingle();
      if (globalSettings?.smtp_from_name) resolvedFromName = globalSettings.smtp_from_name;
    }

    // Get SMTP credentials: smtp_settings (owner -> global) -> env vars
    let smtp: { host: string; port: number; user: string; pass: string } | null = null;

    if (effectiveOwnerId) {
      const { data: ownerSmtp } = await adminClient.from("smtp_settings").select("*").eq("owner_id", effectiveOwnerId).maybeSingle();
      if (ownerSmtp?.smtp_host && ownerSmtp?.smtp_user) {
        smtp = { host: ownerSmtp.smtp_host, port: ownerSmtp.smtp_port || 587, user: ownerSmtp.smtp_user, pass: ownerSmtp.smtp_pass || "" };
      }
    }
    if (!smtp) {
      const { data: globalSmtp } = await adminClient.from("smtp_settings").select("*").is("owner_id", null).maybeSingle();
      if (globalSmtp?.smtp_host && globalSmtp?.smtp_user) {
        smtp = { host: globalSmtp.smtp_host, port: globalSmtp.smtp_port || 587, user: globalSmtp.smtp_user, pass: globalSmtp.smtp_pass || "" };
      }
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
      try {
        const client = new SMTPClient({
          connection: {
            hostname: smtp.host,
            port: smtp.port,
            tls: smtp.port === 465,
            auth: { username: smtp.user, password: smtp.pass },
          },
        });

        const fromAddress = resolvedFromName ? `${resolvedFromName} <${smtp.user}>` : smtp.user;

        await client.send({
          from: fromAddress,
          to: proposal.recipient_email,
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
      JSON.stringify({ success: false, email_sent: false, reason: "SMTP not configured", code: "SMTP_NOT_CONFIGURED" }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error in send-proposal-email:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
