import { useDemo } from "@/contexts/DemoContext";
import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

const statusLabels: Record<string, { label: string; color: string }> = {
  new: { label: "Новая", color: "bg-blue-100 text-blue-700" },
  in_progress: { label: "В работе", color: "bg-yellow-100 text-yellow-700" },
  done: { label: "Выполнена", color: "bg-green-100 text-green-700" },
};

const DemoTasks = () => {
  const { tasks } = useDemo();
  const [filter, setFilter] = useState<"all" | "listing" | "general">("all");

  const filtered = tasks.filter((t) => filter === "all" || t.category === filter);

  const handleAction = () => {
    toast({ title: "Демо-режим", description: "В демо-режиме изменения не сохраняются" });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Задачи</h1>
        <button onClick={handleAction} className="text-sm text-primary font-medium hover:underline">+ Новая задача</button>
      </div>

      <div className="flex gap-2">
        {([["all", "Все"], ["listing", "Объявления"], ["general", "Общие"]] as const).map(([v, l]) => (
          <button
            key={v}
            onClick={() => setFilter(v)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              filter === v ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:bg-muted"
            }`}
          >
            {l} ({v === "all" ? tasks.length : tasks.filter((t) => t.category === v).length})
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map((t) => {
          const s = statusLabels[t.status] || { label: t.status, color: "" };
          return (
            <Card key={t.id}>
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{t.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.category === "listing" ? "📢 Объявление" : "📋 Задача"}
                    {t.due_date && ` · Срок: ${new Date(t.due_date).toLocaleDateString("ru", { day: "numeric", month: "short" })}`}
                  </p>
                </div>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${s.color}`}>{s.label}</span>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default DemoTasks;
