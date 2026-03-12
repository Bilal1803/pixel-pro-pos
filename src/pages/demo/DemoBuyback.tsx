import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";

const buybacks = [
  { id: "b1", model: "iPhone 12 64GB", color: "White", battery: "82%", condition: "Хорошее", price: 22000, client: "Сергей П.", date: "2026-03-12T14:00:00Z" },
  { id: "b2", model: "Samsung Galaxy S21 128GB", color: "Black", battery: "90%", condition: "Отличное", price: 18000, client: "Анна В.", date: "2026-03-11T16:30:00Z" },
  { id: "b3", model: "iPhone 11 128GB", color: "Green", battery: "78%", condition: "Среднее", price: 15000, client: null, date: "2026-03-11T11:00:00Z" },
];

const DemoBuyback = () => {
  const handleAction = () => toast({ title: "Демо-режим", description: "В демо-режиме изменения не сохраняются" });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Скупка</h1>
        <button onClick={handleAction} className="text-sm text-primary font-medium hover:underline">+ Новая скупка</button>
      </div>
      <div className="space-y-2">
        {buybacks.map((b) => (
          <Card key={b.id}>
            <CardContent className="p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{b.model}</p>
                <p className="text-xs text-muted-foreground">{b.color} · Батарея: {b.battery} · {b.condition}</p>
                <p className="text-xs text-muted-foreground">{b.client || "Без клиента"} · {new Date(b.date).toLocaleDateString("ru", { day: "numeric", month: "short" })}</p>
              </div>
              <span className="font-bold text-sm text-primary">{b.price.toLocaleString("ru")} ₽</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default DemoBuyback;
