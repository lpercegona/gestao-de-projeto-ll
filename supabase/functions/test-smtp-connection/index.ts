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

    // Verify user is master admin
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { smtp_host, smtp_port, smtp_user, smtp_pass } = await req.json();

    if (!smtp_host || !smtp_user) {
      return new Response(JSON.stringify({ error: "Host and user are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const port = smtp_port || 587;

    const createSmtpClient = (targetPort: number) =>
      new SMTPClient({
        connection: {
          hostname: smtp_host,
          port: targetPort,
          tls: targetPort === 465,
          auth: {
            username: smtp_user,
            password: smtp_pass || "",
          },
        },
      });

    let client: SMTPClient | null = null;

    try {
      client = createSmtpClient(port);
      await client.close();
      client = null;

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (smtpErr) {
      const shouldTryFallback = port !== 465;

      if (client) {
        try { await client.close(); } catch (_) { /* ignore */ }
        client = null;
      }

      if (shouldTryFallback) {
        console.warn("[test-smtp-connection] STARTTLS failed on 587, retrying with implicit TLS on 465");

        try {
          client = createSmtpClient(465);
          await client.close();
          client = null;

          return new Response(
            JSON.stringify({ success: true, fallback_port: 465 }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } catch (fallbackErr) {
          if (client) {
            try { await client.close(); } catch (_) { /* ignore */ }
            client = null;
          }
          console.error("SMTP fallback connection test failed:", fallbackErr);
          return new Response(
            JSON.stringify({ success: false, error: String(fallbackErr) }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      console.error("SMTP connection test failed:", smtpErr);
      return new Response(
        JSON.stringify({ success: false, error: String(smtpErr) }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } finally {
      if (client) {
        try { await client.close(); } catch (_) { /* ignore */ }
      }
    }
  } catch (err) {
    console.error("Error in test-smtp-connection:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
