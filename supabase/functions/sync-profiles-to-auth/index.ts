import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Fetch all profiles
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
        // Check if user exists in auth
        const { data: authUser, error: getUserError } =
          await supabase.auth.admin.getUserById(profile.user_id);

        if (getUserError || !authUser?.user) {
          results.notFound++;
          results.errors.push(
            `User not found in auth: ${profile.user_id} (${profile.full_name || "sem nome"})`
          );
          continue;
        }

        // Reset password
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
});
