import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type AppRole = "admin" | "manager" | "collaborator" | "editor";

interface ManageUserRequest {
  action: "create" | "update" | "delete" | "reset_password";
  email?: string;
  password?: string;
  full_name?: string;
  role?: AppRole;
  userId?: string;
}

const VALID_ROLES: AppRole[] = ["admin", "manager", "collaborator", "editor"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Verify caller is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    const body: ManageUserRequest = await req.json();
    const { action, email, password, full_name, role, userId } = body;

    console.log(`[admin-manage-user] Action: ${action}, userId: ${userId}, email: ${email}`);

    switch (action) {
      case "create": {
        if (!email || !role) {
          return new Response(
            JSON.stringify({ error: "Email and role are required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (!VALID_ROLES.includes(role)) {
          return new Response(
            JSON.stringify({ error: `Invalid role. Must be one of: ${VALID_ROLES.join(", ")}` }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Check if user already exists
        const { data: { users: existingUsers } } = await supabase.auth.admin.listUsers();
        const existingUser = existingUsers?.find(u => u.email?.toLowerCase() === email.toLowerCase());

        let newUserId: string;

        if (existingUser) {
          // Check if user already has a role
          const { data: existingRole } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", existingUser.id)
            .single();

          if (existingRole) {
            return new Response(
              JSON.stringify({ error: "Este usuário já é membro do time" }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          newUserId = existingUser.id;

          // Update profile if name provided
          if (full_name) {
            await supabase
              .from("profiles")
              .update({ full_name })
              .eq("user_id", newUserId);
          }
        } else {
          // Create new user
          const userPassword = password || crypto.randomUUID();

          const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
            email,
            password: userPassword,
            email_confirm: true,
            user_metadata: { full_name },
          });

          if (createError) {
            console.error("[admin-manage-user] Create user error:", createError);
            throw createError;
          }

          newUserId = newUser.user.id;

          // If no password was provided, send password reset email
          if (!password) {
            await supabase.auth.admin.generateLink({
              type: "recovery",
              email,
            });
          }
        }

        // Add role
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({ user_id: newUserId, role });

        if (roleError) {
          console.error("[admin-manage-user] Role insert error:", roleError);
          throw roleError;
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: existingUser
              ? "Usuário existente adicionado ao time"
              : "Novo usuário criado com sucesso",
            user_id: newUserId,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "update": {
        if (!userId) {
          return new Response(
            JSON.stringify({ error: "userId is required for update" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Update email if provided
        if (email) {
          const { error: emailError } = await supabase.auth.admin.updateUserById(userId, {
            email,
          });
          if (emailError) {
            console.error("[admin-manage-user] Email update error:", emailError);
            throw emailError;
          }
        }

        // Update name in profile
        if (full_name !== undefined) {
          const { error: profileError } = await supabase
            .from("profiles")
            .update({ full_name })
            .eq("user_id", userId);

          if (profileError) {
            console.error("[admin-manage-user] Profile update error:", profileError);
            throw profileError;
          }
        }

        // Update role if provided
        if (role) {
          if (!VALID_ROLES.includes(role)) {
            return new Response(
              JSON.stringify({ error: `Invalid role. Must be one of: ${VALID_ROLES.join(", ")}` }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          const { error: roleError } = await supabase
            .from("user_roles")
            .update({ role })
            .eq("user_id", userId);

          if (roleError) {
            console.error("[admin-manage-user] Role update error:", roleError);
            throw roleError;
          }
        }

        return new Response(
          JSON.stringify({ success: true, message: "Usuário atualizado com sucesso" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "reset_password": {
        if (!userId || !password) {
          return new Response(
            JSON.stringify({ error: "userId and password are required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Password validation
        if (password.length < 6) {
          return new Response(
            JSON.stringify({ error: "A senha deve ter pelo menos 6 caracteres" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { error: passwordError } = await supabase.auth.admin.updateUserById(userId, {
          password,
        });

        if (passwordError) {
          console.error("[admin-manage-user] Password reset error:", passwordError);
          throw passwordError;
        }

        return new Response(
          JSON.stringify({ success: true, message: "Senha alterada com sucesso" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "delete": {
        if (!userId) {
          return new Response(
            JSON.stringify({ error: "userId is required for delete" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Prevent deleting yourself
        if (userId === callerUser.id) {
          return new Response(
            JSON.stringify({ error: "Você não pode remover seu próprio usuário" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Count admins to prevent removing last admin
        const { data: adminRoles } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "admin");

        const { data: targetRole } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .single();

        if (targetRole?.role === "admin" && (adminRoles?.length || 0) <= 1) {
          return new Response(
            JSON.stringify({ error: "Não é possível remover o último administrador" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Remove role first
        await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userId);

        return new Response(
          JSON.stringify({ success: true, message: "Usuário removido do time" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Invalid action. Must be create, update, delete, or reset_password" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error: unknown) {
    console.error("[admin-manage-user] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
