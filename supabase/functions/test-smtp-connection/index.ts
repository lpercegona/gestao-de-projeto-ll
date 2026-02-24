import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Test SMTP connectivity using raw Deno TCP/TLS connections.
 * This avoids denomailer which throws UncaughtExceptions that crash the isolate.
 */
async function testSmtpRaw(
  host: string,
  port: number,
  user: string,
  pass: string,
): Promise<{ success: boolean; error?: string }> {
  let conn: Deno.Conn | null = null;

  try {
    // Connect with a 10s timeout
    const connectPromise = port === 465
      ? Deno.connectTls({ hostname: host, port })
      : Deno.connect({ hostname: host, port });

    conn = await Promise.race([
      connectPromise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Connection timeout")), 10000)
      ),
    ]);

    const decoder = new TextDecoder();
    const encoder = new TextEncoder();

    // Helper to read a response line
    const readResponse = async (): Promise<string> => {
      const buf = new Uint8Array(1024);
      const n = await Promise.race([
        conn!.read(buf),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Read timeout")), 8000)
        ),
      ]);
      if (n === null) throw new Error("Connection closed by server");
      return decoder.decode(buf.subarray(0, n));
    };

    // Helper to send a command and read response
    const sendCmd = async (cmd: string): Promise<string> => {
      await conn!.write(encoder.encode(cmd + "\r\n"));
      return await readResponse();
    };

    // Read server greeting
    const greeting = await readResponse();
    if (!greeting.startsWith("220")) {
      return { success: false, error: `Server rejected connection: ${greeting.trim()}` };
    }

    // EHLO
    const ehloResp = await sendCmd(`EHLO test`);

    // For port 587 (STARTTLS), upgrade to TLS
    if (port !== 465) {
      const starttlsResp = await sendCmd("STARTTLS");
      if (!starttlsResp.startsWith("220")) {
        return { success: false, error: `STARTTLS failed: ${starttlsResp.trim()}` };
      }

      // Upgrade connection to TLS
      const tlsConn = await Deno.startTls(conn as Deno.TcpConn, { hostname: host });
      conn = tlsConn;

      // Re-EHLO after TLS
      await sendCmd("EHLO test");
    }

    // AUTH LOGIN
    const authResp = await sendCmd("AUTH LOGIN");
    if (!authResp.startsWith("334")) {
      return { success: false, error: `AUTH LOGIN not supported: ${authResp.trim()}` };
    }

    // Send username (base64)
    const userResp = await sendCmd(btoa(user));
    if (!userResp.startsWith("334")) {
      return { success: false, error: `Auth failed (username rejected): ${userResp.trim()}` };
    }

    // Send password (base64)
    const passResp = await sendCmd(btoa(pass));
    if (!passResp.startsWith("235")) {
      return { success: false, error: `Auth failed (invalid credentials): ${passResp.trim()}` };
    }

    // QUIT
    try { await sendCmd("QUIT"); } catch (_) { /* ignore */ }

    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  } finally {
    if (conn) {
      try { conn.close(); } catch (_) { /* ignore */ }
    }
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
    const result = await testSmtpRaw(smtp_host, port, smtp_user, smtp_pass);

    if (result.success) {
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fallback to 465 if preferred port was not already 465
    if (port !== 465) {
      console.warn(`[test-smtp-connection] Port ${port} failed (${result.error}), retrying on 465`);
      const fallback = await testSmtpRaw(smtp_host, 465, smtp_user, smtp_pass);

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
