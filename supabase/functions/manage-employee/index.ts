import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Не авторизован" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Не авторизован" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: callerProfile } = await callerClient
      .from("profiles")
      .select("company_id")
      .eq("user_id", caller.id)
      .single();

    if (!callerProfile) {
      return new Response(JSON.stringify({ error: "Профиль не найден" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is owner
    const { data: callerRole } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .single();

    if (!callerRole || callerRole.role !== "owner") {
      return new Response(JSON.stringify({ error: "Только владелец может управлять сотрудниками" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, targetUserId, role, phone, fullName } = await req.json();

    if (!targetUserId) {
      return new Response(JSON.stringify({ error: "targetUserId обязателен" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify target belongs to same company
    const { data: targetProfile } = await adminClient
      .from("profiles")
      .select("company_id")
      .eq("user_id", targetUserId)
      .single();

    if (!targetProfile || targetProfile.company_id !== callerProfile.company_id) {
      return new Response(JSON.stringify({ error: "Сотрудник не найден в вашей компании" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prevent self-modification
    if (targetUserId === caller.id) {
      return new Response(JSON.stringify({ error: "Нельзя изменить свой аккаунт" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update") {
      // Update profile fields
      const profileUpdate: Record<string, string> = {};
      if (phone !== undefined) profileUpdate.phone = phone;
      if (fullName !== undefined) profileUpdate.full_name = fullName;

      if (Object.keys(profileUpdate).length > 0) {
        await adminClient
          .from("profiles")
          .update(profileUpdate)
          .eq("user_id", targetUserId);
      }

      // Update role
      if (role && (role === "employee" || role === "manager")) {
        await adminClient
          .from("user_roles")
          .update({ role })
          .eq("user_id", targetUserId);
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "deactivate") {
      // Ban the user via admin API (prevents login)
      const { error: banError } = await adminClient.auth.admin.updateUserById(targetUserId, {
        ban_duration: "876000h", // ~100 years
      });

      if (banError) {
        return new Response(JSON.stringify({ error: banError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "delete") {
      // Delete user entirely
      const { error: deleteError } = await adminClient.auth.admin.deleteUser(targetUserId);

      if (deleteError) {
        return new Response(JSON.stringify({ error: deleteError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Неизвестное действие" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
