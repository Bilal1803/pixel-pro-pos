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
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is platform admin
    const authHeader = req.headers.get("Authorization")!;
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Не авторизован" }), { status: 401, headers: corsHeaders });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: isAdmin } = await adminClient.rpc("is_platform_admin", { _user_id: caller.id });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Нет доступа" }), { status: 403, headers: corsHeaders });
    }

    const { targetUserId } = await req.json();
    if (!targetUserId) {
      return new Response(JSON.stringify({ error: "targetUserId обязателен" }), { status: 400, headers: corsHeaders });
    }

    // Get target user email
    const { data: targetUser, error: userError } = await adminClient.auth.admin.getUserById(targetUserId);
    if (userError || !targetUser?.user) {
      return new Response(JSON.stringify({ error: "Пользователь не найден" }), { status: 404, headers: corsHeaders });
    }

    const email = targetUser.user.email;
    if (!email) {
      return new Response(JSON.stringify({ error: "У пользователя нет email" }), { status: 400, headers: corsHeaders });
    }

    // Generate magic link for impersonation
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: "magiclink",
      email,
    });

    if (linkError || !linkData) {
      return new Response(JSON.stringify({ error: linkError?.message || "Не удалось создать ссылку" }), { status: 500, headers: corsHeaders });
    }

    // The hashed_token can be used to construct the verification URL
    const tokenHash = linkData.properties?.hashed_token;
    const verifyUrl = `${supabaseUrl}/auth/v1/verify?token=${tokenHash}&type=magiclink`;

    return new Response(JSON.stringify({ url: verifyUrl }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
