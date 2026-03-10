import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { hmac } from "https://deno.land/x/hmac@v2.0.1/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Validates Telegram WebApp initData using HMAC-SHA256.
 * Returns parsed user data if valid, null otherwise.
 */
function validateInitData(initData: string, botToken: string): Record<string, string> | null {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) return null;

    // Remove hash from params and sort alphabetically
    params.delete("hash");
    const entries = Array.from(params.entries());
    entries.sort((a, b) => a[0].localeCompare(b[0]));
    const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join("\n");

    // Create secret key: HMAC-SHA256("WebAppData", bot_token)
    const secretKey = hmac("sha256", "WebAppData", botToken);
    // Calculate hash: HMAC-SHA256(secret_key, data_check_string)  
    const calculatedHash = hmac("sha256", secretKey, dataCheckString);

    if (calculatedHash !== hash) return null;

    const result: Record<string, string> = {};
    for (const [k, v] of entries) {
      result[k] = v;
    }
    result.hash = hash;
    return result;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { initData, telegramId: rawTelegramId } = await req.json();

    let telegramId: string | null = null;

    // If initData is provided, validate it cryptographically
    if (initData && botToken) {
      const validated = validateInitData(initData, botToken);
      if (!validated) {
        return new Response(JSON.stringify({ error: "Невалидные данные Telegram" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Extract user from validated data
      try {
        const user = JSON.parse(validated.user || "{}");
        telegramId = user.id?.toString() || null;
      } catch {
        return new Response(JSON.stringify({ error: "Не удалось получить данные пользователя" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else if (rawTelegramId) {
      // Fallback: trust telegramId directly (for development/testing)
      telegramId = rawTelegramId.toString();
    }

    if (!telegramId) {
      return new Response(JSON.stringify({ error: "Telegram ID не найден" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find profile by telegram_id
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("user_id, full_name, company_id")
      .eq("telegram_id", telegramId)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: "not_found", message: "Сотрудник не найден. Используйте ссылку приглашения." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate a session for this user using admin API
    // We'll get the user's email from auth.users and sign them in
    const { data: authUser, error: authError } = await adminClient.auth.admin.getUserById(profile.user_id);

    if (authError || !authUser?.user) {
      return new Response(JSON.stringify({ error: "Пользователь не найден в системе" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate a magic link / session using admin generateLink
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: "magiclink",
      email: authUser.user.email!,
    });

    if (linkError || !linkData) {
      return new Response(JSON.stringify({ error: "Не удалось создать сессию" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use the OTP token to verify and create session
    const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey);

    const { data: sessionData, error: sessionError } = await userClient.auth.verifyOtp({
      email: authUser.user.email!,
      token: linkData.properties?.hashed_token || "",
      type: "email",
    });

    if (sessionError || !sessionData.session) {
      return new Response(JSON.stringify({ error: "Не удалось авторизовать" }), {
        status: 500,
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
