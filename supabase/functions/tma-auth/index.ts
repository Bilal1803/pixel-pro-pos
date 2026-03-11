import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
    let telegramUser: { first_name?: string; last_name?: string; username?: string } = {};

    // If initData is provided, validate it cryptographically
    if (initData && botToken) {
      const validated = await validateInitData(initData, botToken);
      if (!validated) {
        return new Response(JSON.stringify({ error: "Невалидные данные Telegram" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      try {
        const user = JSON.parse(validated.user || "{}");
        telegramId = user.id?.toString() || null;
        telegramUser = {
          first_name: user.first_name,
          last_name: user.last_name,
          username: user.username,
        };
      } catch {
        return new Response(JSON.stringify({ error: "Не удалось получить данные пользователя" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else if (rawTelegramId) {
      // Fallback for development/testing
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
      // Return 200 with error field so the client can handle gracefully
      return new Response(JSON.stringify({
        error: "not_found",
        message: "Сотрудник не найден. Используйте код приглашения.",
        telegramUser,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get auth user
    const { data: authUser, error: authError } = await adminClient.auth.admin.getUserById(profile.user_id);

    if (authError || !authUser?.user) {
      return new Response(JSON.stringify({ error: "Пользователь не найден в системе" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate a magic link token
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: "magiclink",
      email: authUser.user.email!,
    });

    if (linkError || !linkData) {
      console.error("generateLink error:", linkError);
      return new Response(JSON.stringify({ error: "Не удалось создать сессию" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract the token from the action_link
    // The action_link looks like: https://xxx.supabase.co/auth/v1/verify?token=TOKEN&type=magiclink&redirect_to=...
    const actionLink = linkData.properties?.action_link || "";
    const linkUrl = new URL(actionLink);
    const token = linkUrl.searchParams.get("token");

    if (!token) {
      console.error("No token in action_link:", actionLink);
      return new Response(JSON.stringify({ error: "Не удалось создать токен авторизации" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the OTP to get a session
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey);

    const { data: sessionData, error: sessionError } = await userClient.auth.verifyOtp({
      email: authUser.user.email!,
      token: token,
      type: "email",
    });

    if (sessionError || !sessionData.session) {
      console.error("verifyOtp error:", sessionError);
      return new Response(JSON.stringify({ error: "Не удалось авторизовать" }), {
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
    console.error("tma-auth error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
