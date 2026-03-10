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
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { code, telegramId } = await req.json();

    if (!code) {
      return new Response(JSON.stringify({ error: "Код приглашения обязателен" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find the invitation
    const { data: invite, error: inviteError } = await adminClient
      .from("invitations")
      .select("*")
      .eq("code", code)
      .single();

    if (inviteError || !invite) {
      return new Response(JSON.stringify({ error: "Приглашение не найдено" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check status
    if (invite.status !== "pending") {
      console.log("Invite already used:", invite.status);
      return new Response(JSON.stringify({ error: "Приглашение уже использовано" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check expiry
    if (new Date(invite.expires_at) < new Date()) {
      // Mark as expired
      await adminClient.from("invitations").update({ status: "expired" }).eq("id", invite.id);
      return new Response(JSON.stringify({ error: "Приглашение просрочено" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create a user account with a random password (employee logs in via TMA)
    const email = `tma_${invite.code}@employee.local`;
    const password = crypto.randomUUID() + "Aa1!";

    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: invite.full_name,
        invited_company_id: invite.company_id,
        invited_role: invite.role,
        telegram_id: telegramId || null,
      },
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update profile with phone, store_id, and telegram_id
    if (newUser.user) {
      const updates: Record<string, unknown> = {};
      if (invite.phone) updates.phone = invite.phone;
      if (invite.store_id) updates.store_id = invite.store_id;
      if (telegramId) updates.telegram_id = telegramId.toString();
      
      if (Object.keys(updates).length > 0) {
        await adminClient
          .from("profiles")
          .update(updates)
          .eq("user_id", newUser.user.id);
      }
    }

    // Mark invitation as used
    await adminClient
      .from("invitations")
      .update({ status: "used", used_by: newUser.user?.id, used_at: new Date().toISOString() })
      .eq("id", invite.id);

    // Generate a session token for the employee
    // We'll use signInWithPassword since we know the password
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey);
    const { data: sessionData, error: sessionError } = await userClient.auth.signInWithPassword({
      email,
      password,
    });

    if (sessionError) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Аккаунт создан, но не удалось создать сессию",
        userId: newUser.user?.id 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      session: sessionData.session,
      user: sessionData.user,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
