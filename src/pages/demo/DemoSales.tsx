import { useDemo } from "@/contexts/DemoContext";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";

const paymentLabels: Record<string, string> = {
  cash: "Наличные",
  card: "Карта",
  transfer: "Перевод",
  installments: "Рассрочка",
};

const DemoSales = () => {
  const { sales } = useDemo();

  const handleAction = () => {
    toast({ title: "Демо-режим", description: "В демо-режиме изменения не сохраняются" });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Продажи</h1>
        <button onClick={handleAction} className="text-sm text-primary font-medium hover:underline">+ Новая продажа</button>
      </div>

      <div className="space-y-2">
        {sales.map((s) => (
          <Card key={s.id}>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm text-foreground">{s.device}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.client || "Без клиента"} · {paymentLabels[s.payment_method] || s.payment_method}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{new Date(s.created_at).toLocaleString("ru", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm text-foreground">{s.total.toLocaleString("ru")} ₽</p>
                  <p className="text-[10px] text-green-600">+{s.profit.toLocaleString("ru")} ₽</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default DemoSales;
