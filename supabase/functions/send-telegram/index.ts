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

    // --- Auth: verify caller is authenticated ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Не авторизован" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await callerClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Неверный токен" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;

    // Get caller's company
    const { data: callerProfile } = await callerClient
      .from("profiles")
      .select("company_id")
      .eq("user_id", userId)
      .single();

    if (!callerProfile) {
      return new Response(JSON.stringify({ error: "Профиль не найден" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { event_type, message } = await req.json();
    const company_id = callerProfile.company_id;

    if (!message) {
      return new Response(JSON.stringify({ error: "message обязателен" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Get telegram settings for this company
    const { data: settings, error: settingsError } = await adminClient
      .from("telegram_settings")
      .select("bot_token, chat_id, notify_sales, notify_shifts, notify_cash, notify_ai")
      .eq("company_id", company_id)
      .single();

    if (settingsError || !settings) {
      return new Response(JSON.stringify({ skipped: true, reason: "Telegram не настроен" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if this event type should be notified
    const shouldNotify = 
      (event_type === "sale" && settings.notify_sales) ||
      (event_type === "shift_open" && settings.notify_shifts) ||
      (event_type === "shift_close" && settings.notify_shifts) ||
      (event_type === "cash" && settings.notify_cash) ||
      !event_type;

    if (!shouldNotify) {
      return new Response(JSON.stringify({ skipped: true, reason: "Уведомление отключено" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const botToken = settings.bot_token || Deno.env.get("TELEGRAM_BOT_TOKEN");
    const chatId = settings.chat_id;

    if (!botToken || !chatId) {
      return new Response(JSON.stringify({ skipped: true, reason: "Токен или chat_id не указан" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send message via Telegram Bot API
    const tgResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
      }),
    });

    const tgData = await tgResponse.json();

    if (!tgResponse.ok) {
      console.error("Telegram API error:", tgData);
      return new Response(JSON.stringify({ error: "Ошибка отправки в Telegram", details: tgData }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("send-telegram error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
