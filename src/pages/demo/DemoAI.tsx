import { Card, CardContent } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import { useState } from "react";

const demoConversation = [
  { role: "user", text: "Какие модели лучше всего продаются?" },
  { role: "ai", text: "📊 Топ-3 по продажам за последний месяц:\n\n1. **iPhone 13 128GB** — 8 продаж, выручка 319 920 ₽\n2. **iPhone 14 128GB** — 5 продаж, выручка 274 950 ₽\n3. **Samsung S23 256GB** — 4 продажи, выручка 251 960 ₽\n\n💡 Рекомендую увеличить закупку iPhone 13 — высокий спрос и хорошая маржа (~23%)." },
  { role: "user", text: "Какие устройства слишком долго на складе?" },
  { role: "ai", text: "⏳ Устройства на складе более 14 дней:\n\n1. **iPhone 12 64GB** (White) — 5 дней, цена 29 990 ₽\n2. **Google Pixel 8 Pro 256GB** — 3 дня, цена 59 990 ₽\n\n📌 Пока критических зависаний нет. Рекомендую следить за Pixel 8 Pro — спрос ниже среднего." },
];

const suggestions = [
  "Какие цены стоит изменить?",
  "Какой средний чек за неделю?",
  "Какие аксессуары популярны?",
  "Анализ прибыли по категориям",
];

const DemoAI = () => {
  const [messages] = useState(demoConversation);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold">AI Ассистент</h1>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm whitespace-pre-line ${
                m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
              }`}>
                {m.text}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <button
            key={s}
            className="px-3 py-1.5 rounded-full border text-xs text-muted-foreground hover:bg-muted transition-colors"
            onClick={() => {}}
          >
            {s}
          </button>
        ))}
      </div>

      <p className="text-xs text-muted-foreground text-center">В демо-режиме AI отвечает на заранее подготовленные вопросы</p>
    </div>
  );
};

export default DemoAI;
