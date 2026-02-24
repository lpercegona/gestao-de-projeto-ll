import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function safeClose(client: SMTPClient | null) {
  if (!client) return;
  try {
    if (typeof (client as any)?.close === "function") {
      await client.close();
    }
  } catch (_) {
    /* ignore close errors on partially-initialized connections */
  }
}

async function trySendTest(
  smtp_host: string,
  port: number,
  smtp_user: string,
  smtp_pass: string,
): Promise<{ success: boolean; error?: string }> {
  let client: SMTPClient | null = null;
  try {
    client = new SMTPClient({
      connection: {
        hostname: smtp_host,
        port,
        tls: port === 465,
        auth: { username: smtp_user, password: smtp_pass || "" },
      },
    });

    await client.send({
      from: smtp_user,
      to: smtp_user,
      subject: "[Teste SMTP] Conexão verificada",
      content: "Este é um e-mail automático de teste de conexão SMTP. Pode ser ignorado.",
      html: "<p>Este é um e-mail automático de teste de conexão SMTP. Pode ser ignorado.</p>",
    });

    await safeClose(client);
    client = null;
    return { success: true };
  } catch (err) {
    await safeClose(client);
    client = null;
    return { success: false, error: String(err) };
  }
}

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

    // Attempt on preferred port
    const result = await trySendTest(smtp_host, port, smtp_user, smtp_pass);

    if (result.success) {
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fallback to 465 if preferred port was not already 465
    if (port !== 465) {
      console.warn(`[test-smtp-connection] Port ${port} failed, retrying on 465`);
      const fallback = await trySendTest(smtp_host, 465, smtp_user, smtp_pass);

      if (fallback.success) {
        return new Response(
          JSON.stringify({ success: true, fallback_port: 465 }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      console.error("[test-smtp-connection] Fallback 465 also failed:", fallback.error);
      return new Response(
        JSON.stringify({ success: false, error: fallback.error }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.error("[test-smtp-connection] Failed:", result.error);
    return new Response(
      JSON.stringify({ success: false, error: result.error }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Error in test-smtp-connection:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
