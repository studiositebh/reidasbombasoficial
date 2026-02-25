import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    // Get authorization header to verify the caller is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the caller's JWT and check if they're an admin
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: callerUser }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !callerUser) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if caller is admin
    const { data: callerRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", callerUser.id)
      .single();

    if (callerRole?.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Unauthorized - Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch all users with roles (team members only)
    const { data: roles, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id, role, created_at")
      .order("created_at", { ascending: false });

    if (rolesError) {
      throw rolesError;
    }

    if (!roles || roles.length === 0) {
      return new Response(
        JSON.stringify({ users: [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user IDs
    const userIds = roles.map(r => r.user_id);

    // Fetch profiles for these users
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, full_name, phone")
      .in("user_id", userIds);

    if (profilesError) {
      throw profilesError;
    }

    // Fetch emails from auth.users using admin API
    const { data: { users: authUsers }, error: authUsersError } = await supabase.auth.admin.listUsers();

    if (authUsersError) {
      throw authUsersError;
    }

    // Create a map for quick lookups
    const profilesMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
    const authUsersMap = new Map(authUsers?.map(u => [u.id, u]) || []);

    // Combine all data
    const teamUsers = roles.map(role => {
      const profile = profilesMap.get(role.user_id);
      const authUser = authUsersMap.get(role.user_id);

      return {
        user_id: role.user_id,
        email: authUser?.email || null,
        full_name: profile?.full_name || null,
        phone: profile?.phone || null,
        role: role.role,
        role_created_at: role.created_at,
        user_created_at: authUser?.created_at || null,
      };
    });

    return new Response(
      JSON.stringify({ users: teamUsers }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error fetching team users:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
