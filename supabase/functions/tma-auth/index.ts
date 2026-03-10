import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const encoder = new TextEncoder();

async function hmacSha256(key: ArrayBuffer | Uint8Array, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key instanceof Uint8Array ? key : new Uint8Array(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(data));
}

function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Validates Telegram WebApp initData using HMAC-SHA256 (Web Crypto API).
 */
async function validateInitData(initData: string, botToken: string): Promise<Record<string, string> | null> {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) return null;

    params.delete("hash");
    const entries = Array.from(params.entries());
    entries.sort((a, b) => a[0].localeCompare(b[0]));
    const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join("\n");

    const secretKey = await hmacSha256(encoder.encode("WebAppData"), botToken);
    const calculatedHash = bufToHex(await hmacSha256(secretKey, dataCheckString));

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
      const validated = await validateInitData(initData, botToken);
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
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
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
