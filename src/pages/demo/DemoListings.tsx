import { useDemo } from "@/contexts/DemoContext";
import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

const listingLabels: Record<string, { label: string; color: string; icon: string }> = {
  not_listed: { label: "Не опубликовано", color: "bg-red-100 text-red-700", icon: "📢" },
  listed: { label: "Опубликовано", color: "bg-green-100 text-green-700", icon: "✔" },
  needs_relist: { label: "Перевыложить", color: "bg-amber-100 text-amber-700", icon: "🔄" },
};

const DemoListings = () => {
  const { devices } = useDemo();
  const [filter, setFilter] = useState<"all" | "not_listed" | "listed" | "needs_relist">("all");

  const relevant = devices.filter((d) => d.status !== "sold");
  const filtered = relevant.filter((d) => filter === "all" || d.listing_status === filter);

  const handleAction = () => {
    toast({ title: "Демо-режим", description: "В демо-режиме изменения не сохраняются" });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Объявления</h1>
        <button onClick={handleAction} className="text-sm text-primary font-medium hover:underline">AI Анализ</button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {([["all", "Все"], ["not_listed", "📢 Не опубликованы"], ["listed", "✔ Опубликованы"], ["needs_relist", "🔄 Перевыложить"]] as const).map(([v, l]) => (
          <button
            key={v}
            onClick={() => setFilter(v)}
            className={`px-3 py-1 rounded-full text-xs font-medium border whitespace-nowrap transition-colors ${
              filter === v ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:bg-muted"
            }`}
          >
            {l} ({v === "all" ? relevant.length : relevant.filter((d) => d.listing_status === v).length})
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map((d) => {
          const ls = listingLabels[d.listing_status] || listingLabels.not_listed;
          return (
            <Card key={d.id}>
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span>{ls.icon}</span>
                    <p className="text-sm font-medium text-foreground">{d.brand} {d.model} {d.memory}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{d.color} · {d.sale_price.toLocaleString("ru")} ₽</p>
                  {d.listing_url && <p className="text-[10px] text-primary truncate max-w-[200px]">{d.listing_url}</p>}
                </div>
                <div className="shrink-0 ml-3">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${ls.color}`}>{ls.label}</span>
                  {d.listing_status === "not_listed" && (
                    <button onClick={handleAction} className="block mt-1 text-[10px] text-primary hover:underline">Опубликовать</button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default DemoListings;
