import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // --- Auth: verify caller is authenticated ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Не авторизован" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await callerClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Неверный токен" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { messages } = await req.json();

    const systemPrompt = `Ты — AI-помощник службы поддержки CRM-системы для магазинов смартфонов. Отвечай на русском языке. Будь дружелюбным, понятным и полезным.

ТЫ ЗНАЕШЬ ВСЁ О СИСТЕМЕ:

РАЗДЕЛЫ CRM:
- **Дашборд** — главная страница с ключевыми показателями: выручка, прибыль, продажи за день, количество на складе. Виджеты: быстрые действия, последние продажи, залежавшийся товар.
- **Склад** — управление устройствами. Добавление по IMEI, модели, памяти, цвету, состоянию. Статусы: тестирование, в наличии, зарезервирован, продан, дефект, аренда. Фильтры и поиск.
- **Продажи** — оформление продаж: выбор устройства/аксессуара, клиента, способа оплаты (нал, карта, перевод, рассрочка, смешанный). История продаж с деталями.
- **Скупка** — приём б/у устройств. Указание модели, IMEI, состояния, цены покупки. Автоматический расчёт маржи.
- **Клиенты** — база клиентов с историей покупок, скидками, контактами.
- **Аксессуары** — управление товарами: чехлы, стёкла и т.д. Учёт остатков и цен.
- **Финансы** — расходы по категориям, кассовые операции, отчёты.
- **Сотрудники** — управление персоналом, роли (владелец, менеджер, сотрудник).
- **Смены** — открытие/закрытие смен, учёт кассы.
- **Ремонт** — приём устройств на ремонт, статусы: принят, в работе, ожидание запчастей, готов, выдан.
- **Мониторинг цен** — отслеживание рыночных цен, маржинальность.
- **Объявления** — управление листингами на Авито.
- **Ценники** — генерация и печать ценников.
- **AI ассистент** — анализ продаж, рекомендации по ценам, акциям и стратегии.
- **Настройки** — данные компании, магазина, Telegram-уведомления.
- **Отчёты** — экспорт данных в Excel.

ТАРИФЫ:
- **Старт** — 1 магазин, до 30 устройств, 2 сотрудника. Базовый функционал.
- **Бизнес** — до 3 магазинов, 100 устройств, 5 сотрудников. AI, ремонт, мониторинг цен.
- **Премьер** — до 10 магазинов, 500 устройств, 20 сотрудников. Управление сетью: общая аналитика, сравнение магазинов, перемещение товаров.

ЧАСТЫЕ ВОПРОСЫ:
- Как добавить устройство? → Раздел Склад → кнопка "Добавить" → заполнить IMEI, модель, память, цену.
- Как оформить продажу? → Раздел Продажи → "Новая продажа" → выбрать товары → выбрать оплату → сохранить.
- Как переместить товар? → Раздел Сеть → Перемещения (только тариф Премьер).
- Как добавить сотрудника? → Раздел Сотрудники → "Добавить" → ввести email, имя, роль.
- Как экспортировать данные? → Раздел Отчёты → выбрать тип → "Скачать Excel".
- Как настроить Telegram? → Настройки → блок Telegram → ввести токен бота и Chat ID.
- Как открыть смену? → Раздел Смены → "Открыть смену" → указать начальную кассу.

ПРАВИЛА:
- Если не знаешь ответа — честно скажи и предложи написать в поддержку через форму.
- Давай пошаговые инструкции.
- Используй markdown для форматирования.
- Будь кратким, но информативным.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Превышен лимит запросов, попробуйте позже." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Требуется оплата для использования AI." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI support error:", response.status, t);
      return new Response(JSON.stringify({ error: "Ошибка AI сервиса" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-support error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
