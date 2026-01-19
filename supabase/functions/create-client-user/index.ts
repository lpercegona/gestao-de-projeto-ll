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
    const { clientId, email, fullName, password } = await req.json();

    if (!clientId || !email) {
      return new Response(
        JSON.stringify({ error: 'Client ID and email are required' }),
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

    // Check if user already exists with this email
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());

    let userId: string;

    if (existingUser) {
      // User already exists - just link them to the client
      userId = existingUser.id;
      
      // Update the client with user_id
      const { error: clientUpdateError } = await supabaseAdmin
        .from('clients')
        .update({ user_id: userId })
        .eq('id', clientId);

      if (clientUpdateError) {
        console.error('Error linking user to client:', clientUpdateError);
        return new Response(
          JSON.stringify({ error: 'Failed to link existing user to client' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Ensure user has client role
      const { data: existingRole } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (!existingRole) {
        await supabaseAdmin
          .from('user_roles')
          .insert({ user_id: userId, role: 'client' });
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          user_id: userId,
          message: 'Existing user linked to client',
          isExisting: true
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate a random password if not provided
    const userPassword = password || Math.random().toString(36).slice(-12) + 'A1!';

    // Create the new user via Admin API
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim(),
      password: userPassword,
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

    userId = newUser.user.id;

    // Update profile with owner_id
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        owner_id: callingUser.id,
        full_name: fullName?.trim() || null
      })
      .eq('user_id', userId);

    if (profileError) {
      console.error('Error updating profile:', profileError);
    }

    // Assign client role
    const { error: roleInsertError } = await supabaseAdmin
      .from('user_roles')
      .insert({ user_id: userId, role: 'client' });

    if (roleInsertError) {
      console.error('Error assigning role:', roleInsertError);
    }

    // Link user to client
    const { error: clientLinkError } = await supabaseAdmin
      .from('clients')
      .update({ user_id: userId })
      .eq('id', clientId);

    if (clientLinkError) {
      console.error('Error linking user to client:', clientLinkError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        user_id: userId,
        temporaryPassword: password ? undefined : userPassword,
        message: 'Client user created successfully',
        isExisting: false
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in create-client-user function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
