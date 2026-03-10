import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Handle GET for webhook setup confirmation
  if (req.method === "GET") {
    return new Response(JSON.stringify({ status: "Telegram webhook is active" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!botToken) {
      return new Response(JSON.stringify({ error: "Bot token not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const update = await req.json();
    const message = update?.message;

    if (!message?.text) {
      return new Response("ok", { status: 200 });
    }

    const chatId = message.chat.id;
    const text = message.text.trim();
    const userId = message.from?.id;
    const firstName = message.from?.first_name || "";

    let replyText = "";

    if (text === "/start") {
      replyText =
        `👋 Привет, ${firstName}!\n\n` +
        `Этот бот отправляет уведомления из CRM о продажах, сменах и кассовых операциях.\n\n` +
        `📌 <b>Ваш Chat ID:</b> <code>${chatId}</code>\n\n` +
        `Скопируйте этот Chat ID и вставьте его в настройки CRM (Дашборд → Настройки → Telegram).`;
    } else if (text === "/chatid" || text === "/id") {
      replyText = `📌 <b>Chat ID:</b> <code>${chatId}</code>`;
    } else if (text === "/help") {
      replyText =
        `📖 <b>Доступные команды:</b>\n\n` +
        `/start — приветствие и получение Chat ID\n` +
        `/chatid — показать Chat ID\n` +
        `/help — список команд`;
    } else {
      replyText =
        `Я бот для уведомлений из CRM. Используйте /help для списка команд.\n\n` +
        `📌 Ваш Chat ID: <code>${chatId}</code>`;
    }

    // Send reply
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: replyText,
        parse_mode: "HTML",
      }),
    });

    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error("telegram-webhook error:", err);
    return new Response("ok", { status: 200 }); // Always return 200 to Telegram
  }
});
