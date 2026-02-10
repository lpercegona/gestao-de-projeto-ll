import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's token
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Client with user's auth to verify permissions
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get the calling user
    const { data: { user: callingUser }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !callingUser) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if calling user is admin or master_admin
    const { data: callerRole, error: roleError } = await supabaseUser
      .from('user_roles')
      .select('role')
      .eq('user_id', callingUser.id)
      .maybeSingle();

    if (roleError || !callerRole || !['admin', 'master_admin'].includes(callerRole.role)) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { email, password, fullName, role, clientId } = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Email and password are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If role is client, clientId is required
    if (role === 'client' && !clientId) {
      return new Response(
        JSON.stringify({ error: 'Client must be selected when creating a client user' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin client to create user without affecting current session
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // If clientId is provided, verify it exists and get owner_id
    let clientOwnerId: string | null = null;
    if (clientId) {
      const { data: clientData, error: clientError } = await supabaseAdmin
        .from('clients')
        .select('id, owner_id')
        .eq('id', clientId)
        .maybeSingle();

      if (clientError || !clientData) {
        return new Response(
          JSON.stringify({ error: 'Client not found' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      clientOwnerId = clientData.owner_id;
    }

    // Create the new user via Admin API
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName?.trim() || '' }
    });

    if (createError) {
      console.error('Error creating user:', createError);
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!newUser.user) {
      return new Response(
        JSON.stringify({ error: 'Failed to create user' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const newUserId = newUser.user.id;

    // Update profile with owner_id (use client's owner for client users, or caller for others)
    const ownerIdToSet = role === 'client' && clientOwnerId ? clientOwnerId : callingUser.id;
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        owner_id: ownerIdToSet,
        full_name: fullName?.trim() || null
      })
      .eq('user_id', newUserId);

    if (profileError) {
      console.error('Error updating profile:', profileError);
    }

    // Assign role if provided
    if (role && role !== 'none') {
      const { error: roleInsertError } = await supabaseAdmin
        .from('user_roles')
        .insert({ user_id: newUserId, role });

      if (roleInsertError) {
        console.error('Error assigning role:', roleInsertError);
      }
    }

    // If role is client and clientId is provided, link user to client
    if (role === 'client' && clientId) {
      // Check if there are any existing users for this client
      const { data: existingUsers } = await supabaseAdmin
        .from('client_users')
        .select('id')
        .eq('client_id', clientId);

      const isPrimary = !existingUsers || existingUsers.length === 0;

      const { error: clientUserError } = await supabaseAdmin
        .from('client_users')
        .insert({
          client_id: clientId,
          user_id: newUserId,
          is_primary: isPrimary,
          created_by: callingUser.id
        });

      if (clientUserError) {
        console.error('Error linking user to client:', clientUserError);
      }

      // If this is a primary user, also update the clients table user_id field
      if (isPrimary) {
        await supabaseAdmin
          .from('clients')
          .update({ user_id: newUserId })
          .eq('id', clientId);
      }
    }

    // Generate invite link so user can set their password
    try {
      await supabaseAdmin.auth.admin.generateLink({
        type: 'invite',
        email: email.trim(),
      });
    } catch (inviteError) {
      console.error('Error generating invite link:', inviteError);
      // Non-fatal: user was created successfully, just couldn't send invite
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        user_id: newUserId,
        message: 'User created successfully. Invite link sent.' 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in create-user function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
