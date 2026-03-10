import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader! } },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: profile } = await supabase.from("profiles").select("company_id").eq("user_id", user.id).single();
    if (!profile) throw new Error("No profile");

    const companyId = profile.company_id;

    // Fetch business context + survey
    const [salesRes, devicesRes, productsRes, clientsRes, surveyRes] = await Promise.all([
      supabase.from("sales").select("*, sale_items(name, price, cost_price, item_type, quantity)").eq("company_id", companyId).order("created_at", { ascending: false }).limit(100),
      supabase.from("devices").select("*").eq("company_id", companyId),
      supabase.from("products").select("*").eq("company_id", companyId),
      supabase.from("clients").select("*").eq("company_id", companyId),
      supabase.from("ai_survey_answers").select("*").eq("company_id", companyId).maybeSingle(),
    ]);

    const sales = salesRes.data || [];
    const devices = devicesRes.data || [];
    const products = productsRes.data || [];
    const clients = clientsRes.data || [];

    // Build analytics summary
    const availableDevices = devices.filter((d: any) => ["testing", "available", "reserved"].includes(d.status));
    const totalRevenue = sales.reduce((s: number, sale: any) => s + (sale.total || 0), 0);
    const totalProfit = sales.reduce((s: number, sale: any) => {
      return s + (sale.sale_items || []).reduce((p: number, i: any) => p + ((i.price || 0) - (i.cost_price || 0)), 0);
    }, 0);

    // Model profitability
    const modelProfit: Record<string, { revenue: number; profit: number; count: number }> = {};
    sales.forEach((sale: any) => {
      (sale.sale_items || []).filter((i: any) => i.item_type === "device").forEach((item: any) => {
        const name = item.name;
        if (!modelProfit[name]) modelProfit[name] = { revenue: 0, profit: 0, count: 0 };
        modelProfit[name].revenue += item.price || 0;
        modelProfit[name].profit += (item.price || 0) - (item.cost_price || 0);
        modelProfit[name].count += 1;
      });
    });

    // Slow-moving devices (on stock > 14 days)
    const now = Date.now();
    const slowDevices = availableDevices
      .filter((d: any) => now - new Date(d.created_at).getTime() > 14 * 86400000)
      .map((d: any) => ({ model: d.model, memory: d.memory, days: Math.floor((now - new Date(d.created_at).getTime()) / 86400000), sale_price: d.sale_price }));

    const context = `
Ты — AI-ассистент CRM для магазина смартфонов. Отвечай на русском. Будь конкретен и полезен.

ДАННЫЕ МАГАЗИНА:
- Всего продаж: ${sales.length}, выручка: ${totalRevenue} ₽, прибыль: ${totalProfit} ₽
- На складе: ${availableDevices.length} устройств
- Аксессуаров: ${products.length} позиций
- Клиентов: ${clients.length}
- Средний чек: ${sales.length > 0 ? Math.round(totalRevenue / sales.length) : 0} ₽

ПРИБЫЛЬ ПО МОДЕЛЯМ (топ):
${Object.entries(modelProfit).sort((a, b) => b[1].profit - a[1].profit).slice(0, 10).map(([name, d]) => `${name}: ${d.count} продаж, прибыль ${d.profit} ₽`).join("\n")}

ЗАЛЕЖАВШИЙСЯ ТОВАР (>14 дней):
${slowDevices.length > 0 ? slowDevices.slice(0, 10).map((d: any) => `${d.model} ${d.memory || ""} — ${d.days} дн., цена ${d.sale_price || "?"} ₽`).join("\n") : "Нет"}

Ты можешь:
- Анализировать продажи и прибыль
- Рекомендовать скидки на залежавшийся товар
- Предлагать акции и бандлы (телефон + аксессуар)
- Анализировать клиентов и предлагать стратегии возврата
- Давать советы по ценообразованию
`;

    const { messages } = await req.json();

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: context },
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
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Ошибка AI сервиса" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
