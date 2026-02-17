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
    const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };
    const failResponse = (status: number, code: string, reason: string, emailSent = false) =>
      new Response(JSON.stringify({ success: false, email_sent: emailSent, code, reason }), {
        status,
        headers: jsonHeaders,
      });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return failResponse(401, "UNAUTHORIZED", "Unauthorized");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return failResponse(401, "UNAUTHORIZED", "Unauthorized");
    }

    const { proposal_id, resend = false } = await req.json();
    if (!proposal_id) {
      return failResponse(400, "VALIDATION_ERROR", "proposal_id is required");
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: proposal, error: propError } = await adminClient
      .from("proposals")
      .select("*, proposal_templates(description, sections)")
      .eq("id", proposal_id)
      .single();

    if (propError || !proposal) {
      return failResponse(404, "PROPOSAL_NOT_FOUND", "Proposal not found");
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
      return failResponse(500, "OWNERSHIP_RESOLUTION_FAILED", "Ownership resolution failed");
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

      try {
        const preferredPort = smtp.port || 587;
        client = createSmtpClient(preferredPort);

        const fromAddress = resolvedFromName ? `${resolvedFromName} <${smtp.user}>` : smtp.user;

        await client.send({
          from: fromAddress,
          to: proposal.recipient_email,
          subject,
          content: "auto",
          html: bodyHtml,
        });

        if (resend) {
          const { error: historyError } = await adminClient
            .from("proposal_history")
            .insert({
              proposal_id,
              old_status: proposal.status,
              new_status: proposal.status || "sent",
              changed_by: claimsData.claims.email || claimsData.claims.sub || "system",
              notes: "Proposal email resent",
            });

          if (historyError) {
            console.warn("[send-proposal-email] resend succeeded, but failed to write history", {
              proposal_id,
              error: historyError,
            });
          }

          return new Response(
            JSON.stringify({ success: true, email_sent: true, resend: true }),
            { status: 200, headers: jsonHeaders }
          );
        }

        const allowedStatusToSent = new Set(["draft", "viewed", "negotiating"]);
        if (!allowedStatusToSent.has(proposal.status)) {
          console.info("[send-proposal-email] email sent without status transition", {
            proposal_id,
            current_status: proposal.status,
          });

          return new Response(
            JSON.stringify({
              success: true,
              email_sent: true,
              code: "STATUS_TRANSITION_SKIPPED",
              reason: `Email sent, status '${proposal.status}' not eligible for automatic transition to 'sent'`,
            }),
            { status: 200, headers: jsonHeaders }
          );
        }

        const { error: statusUpdateError } = await adminClient
          .from("proposals")
          .update({ status: "sent" })
          .eq("id", proposal_id)
          .in("status", Array.from(allowedStatusToSent));

        if (statusUpdateError) {
          console.error("[send-proposal-email] email sent but failed to update proposal status", {
            proposal_id,
            error: statusUpdateError,
          });

          return failResponse(500, "PROPOSAL_STATUS_UPDATE_FAILED", "Email sent, but proposal status update failed", true);
        }

        return new Response(
          JSON.stringify({ success: true, email_sent: true }),
          { status: 200, headers: jsonHeaders }
        );
      } catch (emailErr) {
        const shouldTryFallback =
          (smtp.port || 587) === 587 &&
          String(emailErr).toLowerCase().includes("invalidcontenttype");

        if (shouldTryFallback) {
          console.warn("[send-proposal-email] STARTTLS failed on 587, retrying with implicit TLS on 465");

          if (client) {
            await client.close();
            client = null;
          }

          try {
            client = createSmtpClient(465);

            const fromAddress = resolvedFromName ? `${resolvedFromName} <${smtp.user}>` : smtp.user;

            await client.send({
              from: fromAddress,
              to: proposal.recipient_email,
              subject,
              content: "auto",
              html: bodyHtml,
            });

            if (resend) {
              const { error: historyError } = await adminClient
                .from("proposal_history")
                .insert({
                  proposal_id,
                  old_status: proposal.status,
                  new_status: proposal.status || "sent",
                  changed_by: claimsData.claims.email || claimsData.claims.sub || "system",
                  notes: "Proposal email resent",
                });

              if (historyError) {
                console.warn("[send-proposal-email] resend succeeded, but failed to write history", {
                  proposal_id,
                  error: historyError,
                });
              }

              return new Response(
                JSON.stringify({ success: true, email_sent: true, resend: true }),
                { status: 200, headers: jsonHeaders }
              );
            }

            const allowedStatusToSent = new Set(["draft", "viewed", "negotiating"]);
            if (!allowedStatusToSent.has(proposal.status)) {
              return new Response(
                JSON.stringify({
                  success: true,
                  email_sent: true,
                  code: "STATUS_TRANSITION_SKIPPED",
                  reason: `Email sent, status '${proposal.status}' not eligible for automatic transition to 'sent'`,
                }),
                { status: 200, headers: jsonHeaders }
              );
            }

            const { error: statusUpdateError } = await adminClient
              .from("proposals")
              .update({ status: "sent" })
              .eq("id", proposal_id)
              .in("status", Array.from(allowedStatusToSent));

            if (statusUpdateError) {
              return failResponse(500, "PROPOSAL_STATUS_UPDATE_FAILED", "Email sent, but proposal status update failed", true);
            }

            return new Response(
              JSON.stringify({ success: true, email_sent: true }),
              { status: 200, headers: jsonHeaders }
            );
          } catch (fallbackErr) {
            console.error("SMTP fallback error:", fallbackErr);
            return failResponse(502, "SMTP_SEND_FAILED", `Unable to send email: ${String(fallbackErr)}`);
          }
        }

        console.error("SMTP error:", emailErr);
        return failResponse(502, "SMTP_SEND_FAILED", `Unable to send email: ${String(emailErr)}`);
      } finally {
        if (client) await client.close();
      }
    }

    return failResponse(503, "SMTP_NOT_CONFIGURED", "SMTP not configured");
  } catch (err) {
    console.error("Error in send-proposal-email:", err);
    return new Response(
      JSON.stringify({ success: false, email_sent: false, code: "INTERNAL_ERROR", reason: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
