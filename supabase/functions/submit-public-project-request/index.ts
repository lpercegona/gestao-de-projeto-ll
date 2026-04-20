import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { z } from 'https://esm.sh/zod@3.23.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TaskSchema = z.object({
  title: z.string().max(255).optional(),
  description: z.string().max(5000).optional(),
  dueDate: z.string().max(20).optional(),
});

const BodySchema = z.object({
  token: z.string().min(1).max(255),
  email: z.string().trim().email().max(255),
  name: z.string().trim().min(1).max(255),
  title: z.string().trim().min(1).max(255),
  briefing: z.string().min(1).max(20000),
  desired_deadline: z.string().nullable().optional(),
  requested_tasks: z.array(TaskSchema).max(50).optional(),
  custom_fields: z.record(z.string()).optional(),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const json = await req.json();
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const body = parsed.data;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Validate link is enabled
    const { data: linkData, error: linkErr } = await supabase
      .rpc('get_public_request_link', { p_token: body.token });
    if (linkErr || !linkData || linkData.length === 0) {
      return new Response(JSON.stringify({ error: 'Link inválido ou desativado' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate email -> client
    const { data: validData, error: validErr } = await supabase
      .rpc('validate_request_email', { p_token: body.token, p_email: body.email });
    if (validErr || !validData || validData.length === 0) {
      return new Response(JSON.stringify({ error: 'E-mail não vinculado a nenhum cliente' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const clientId = validData[0].client_id as string;

    // Capture IP
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
      || req.headers.get('cf-connecting-ip')
      || req.headers.get('x-real-ip')
      || null;

    const { data: inserted, error: insertErr } = await supabase
      .from('project_requests')
      .insert({
        client_id: clientId,
        title: body.title,
        briefing: body.briefing,
        desired_deadline: body.desired_deadline || null,
        created_by: linkData[0].owner_id,
        requested_tasks: (body.requested_tasks || []) as unknown as Record<string, unknown>[],
        source: 'public_link',
        requester_email: body.email,
        requester_name: body.name,
        requester_ip: ip,
      })
      .select('id')
      .single();

    if (insertErr) {
      return new Response(JSON.stringify({ error: insertErr.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, id: inserted?.id }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});