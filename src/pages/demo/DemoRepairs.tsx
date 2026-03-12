import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";

const statusLabels: Record<string, { label: string; color: string }> = {
  accepted: { label: "Принят", color: "bg-blue-100 text-blue-700" },
  in_progress: { label: "В работе", color: "bg-yellow-100 text-yellow-700" },
  waiting_parts: { label: "Ожидание запчастей", color: "bg-orange-100 text-orange-700" },
  ready: { label: "Готов", color: "bg-green-100 text-green-700" },
  done: { label: "Выдан", color: "bg-muted text-muted-foreground" },
};

const repairs = [
  { id: "r1", device: "iPhone 12 — замена экрана", client: "Олег С.", status: "in_progress", price: 8500, date: "2026-03-12T09:00:00Z" },
  { id: "r2", device: "Samsung S22 — замена батареи", client: "Наталья М.", status: "waiting_parts", price: 4200, date: "2026-03-11T15:00:00Z" },
  { id: "r3", device: "iPhone 14 — замена стекла", client: "Дмитрий К.", status: "accepted", price: 6000, date: "2026-03-12T11:30:00Z" },
  { id: "r4", device: "Xiaomi 13T — разъём зарядки", client: null, status: "ready", price: 3500, date: "2026-03-10T14:00:00Z" },
  { id: "r5", device: "iPhone 11 — замена камеры", client: "Елена П.", status: "done", price: 7800, date: "2026-03-09T10:00:00Z" },
];

const DemoRepairs = () => {
  const handleAction = () => toast({ title: "Демо-режим", description: "В демо-режиме изменения не сохраняются" });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Ремонт</h1>
        <button onClick={handleAction} className="text-sm text-primary font-medium hover:underline">+ Новый ремонт</button>
      </div>
      <div className="space-y-2">
        {repairs.map((r) => {
          const s = statusLabels[r.status] || { label: r.status, color: "" };
          return (
            <Card key={r.id}>
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{r.device}</p>
                  <p className="text-xs text-muted-foreground">{r.client || "Без клиента"} · {new Date(r.date).toLocaleDateString("ru", { day: "numeric", month: "short" })}</p>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="text-sm font-bold text-foreground">{r.price.toLocaleString("ru")} ₽</p>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${s.color}`}>{s.label}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default DemoRepairs;
