import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  // Special action: sync all profile passwords
  if (action === "sync-passwords") {
    return await handleSyncPasswords();
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ isAdmin: false, error: "No authorization header" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify the token and get claims
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      console.error("[check-admin] Auth error:", claimsError);
      return new Response(
        JSON.stringify({ isAdmin: false, error: "Invalid token" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub;
    console.log("[check-admin] Checking admin for user:", userId);

    // Use service role to bypass RLS and check admin role directly
    const supabaseServiceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseServiceRole);

    const { data: roleData, error: roleError } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError) {
      console.error("[check-admin] Role check error:", roleError);
      return new Response(
        JSON.stringify({ isAdmin: false, error: "Role check failed" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isAdmin = !!roleData;
    console.log("[check-admin] Result for", userId, ":", isAdmin);

    return new Response(
      JSON.stringify({ isAdmin, userId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[check-admin] Unexpected error:", error);
    return new Response(
      JSON.stringify({ isAdmin: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function handleSyncPasswords() {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, full_name, document");

    if (profilesError) {
      throw new Error(`Error fetching profiles: ${profilesError.message}`);
    }

    const defaultPassword = "ReiDasBombas2024!";
    const results = {
      total: profiles?.length || 0,
      passwordReset: 0,
      notFound: 0,
      errors: [] as string[],
    };

    for (const profile of profiles || []) {
      if (!profile.user_id) {
        results.errors.push(`Profile sem user_id: ${profile.full_name}`);
        continue;
      }

      try {
        const { data: authUser, error: getUserError } =
          await supabase.auth.admin.getUserById(profile.user_id);

        if (getUserError || !authUser?.user) {
          results.notFound++;
          results.errors.push(
            `User not found in auth: ${profile.user_id} (${profile.full_name || "sem nome"})`
          );
          continue;
        }

        const { error: updateError } =
          await supabase.auth.admin.updateUserById(profile.user_id, {
            password: defaultPassword,
            email_confirm: true,
          });

        if (updateError) {
          results.errors.push(
            `Error updating ${authUser.user.email}: ${updateError.message}`
          );
        } else {
          results.passwordReset++;
        }
      } catch (err) {
        results.errors.push(
          `Exception for ${profile.user_id}: ${(err as Error).message}`
        );
      }
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}
