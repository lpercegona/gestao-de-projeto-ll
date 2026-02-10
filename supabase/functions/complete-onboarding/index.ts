import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type UsageType = 'provider' | 'client';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization header required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const {
      data: { user: callingUser },
      error: authError,
    } = await supabaseUser.auth.getUser();

    if (authError || !callingUser) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const usageType = body.usageType as UsageType | undefined;
    const companyName = (body.companyName as string | undefined)?.trim();
    const responsibleEmail = (body.responsibleEmail as string | undefined)?.trim().toLowerCase();
    const responsibleName = (body.responsibleName as string | undefined)?.trim();
    const appOrigin = (body.appOrigin as string | undefined)?.trim() || undefined;

    if (!usageType || !['provider', 'client'].includes(usageType)) {
      return new Response(JSON.stringify({ error: 'usageType inválido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (usageType === 'provider') {
      const { data: existingProviderRole } = await supabaseAdmin
        .from('user_roles')
        .select('id')
        .eq('user_id', callingUser.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (!existingProviderRole) {
        await supabaseAdmin.from('user_roles').insert({ user_id: callingUser.id, role: 'admin' });
      }

      await supabaseAdmin
        .from('profiles')
        .update({ owner_id: callingUser.id })
        .eq('user_id', callingUser.id);

      return new Response(JSON.stringify({ success: true, role: 'admin' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!companyName || !responsibleEmail) {
      return new Response(JSON.stringify({ error: 'companyName e responsibleEmail são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: existingClient } = await supabaseAdmin
      .from('clients')
      .select('id')
      .eq('owner_id', callingUser.id)
      .eq('name', companyName)
      .maybeSingle();

    if (existingClient) {
      return new Response(JSON.stringify({ error: 'Já existe um cliente com esse nome para este usuário' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: existingClientRole } = await supabaseAdmin
      .from('user_roles')
      .select('id')
      .eq('user_id', callingUser.id)
      .eq('role', 'client')
      .maybeSingle();

    if (!existingClientRole) {
      await supabaseAdmin.from('user_roles').insert({ user_id: callingUser.id, role: 'client' });
    }

    await supabaseAdmin
      .from('profiles')
      .update({ owner_id: callingUser.id })
      .eq('user_id', callingUser.id);

    const { data: createdClient, error: createClientError } = await supabaseAdmin
      .from('clients')
      .insert({
        name: companyName,
        company: companyName,
        email: responsibleEmail,
        owner_id: callingUser.id,
        created_by: callingUser.id,
        user_id: callingUser.id,
      })
      .select('id')
      .single();

    if (createClientError || !createdClient) {
      return new Response(JSON.stringify({ error: 'Não foi possível cadastrar o cliente' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: usersList, error: usersListError } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });

    if (usersListError) {
      return new Response(JSON.stringify({ error: 'Falha ao consultar usuários' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const existingResponsible = usersList.users.find((u) => u.email?.toLowerCase() === responsibleEmail);

    let responsibleUserId: string | null = existingResponsible?.id ?? null;

    if (!responsibleUserId) {
      const { data: invitedData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(responsibleEmail, {
        redirectTo: appOrigin ? `${appOrigin}/login` : undefined,
        data: {
          full_name: responsibleName || null,
        },
      });

      if (inviteError || !invitedData.user) {
        return new Response(JSON.stringify({ error: 'Não foi possível convidar o responsável' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      responsibleUserId = invitedData.user.id;
    }

    await supabaseAdmin
      .from('profiles')
      .update({
        owner_id: callingUser.id,
        full_name: responsibleName || undefined,
      })
      .eq('user_id', responsibleUserId);

    const { data: existingResponsibleRole } = await supabaseAdmin
      .from('user_roles')
      .select('id')
      .eq('user_id', responsibleUserId)
      .eq('role', 'admin')
      .maybeSingle();

    if (!existingResponsibleRole) {
      await supabaseAdmin.from('user_roles').insert({ user_id: responsibleUserId, role: 'admin' });
    }

    const { data: existingClientUser } = await supabaseAdmin
      .from('client_users')
      .select('id')
      .eq('client_id', createdClient.id)
      .eq('user_id', callingUser.id)
      .maybeSingle();

    if (!existingClientUser) {
      await supabaseAdmin
        .from('client_users')
        .insert({
          client_id: createdClient.id,
          user_id: callingUser.id,
          is_primary: true,
          created_by: callingUser.id,
        });
    }

    return new Response(
      JSON.stringify({
        success: true,
        role: 'client',
        clientId: createdClient.id,
        responsibleUserId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error: unknown) {
    console.error('Error in complete-onboarding function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
