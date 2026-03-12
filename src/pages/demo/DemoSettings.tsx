import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Settings, Bell, Store, CreditCard } from "lucide-react";

const DemoSettings = () => {
  const handleAction = () => toast({ title: "Демо-режим", description: "В демо-режиме изменения не сохраняются" });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Настройки</h1>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <Store className="h-5 w-5 text-primary" />
            <p className="text-sm font-semibold">Магазин</p>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Название</span><span className="font-medium text-foreground">Техно-Старт</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Адрес</span><span className="font-medium text-foreground">ул. Ленина, 42</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Телефон</span><span className="font-medium text-foreground">+7 999 123-45-67</span></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <CreditCard className="h-5 w-5 text-primary" />
            <p className="text-sm font-semibold">Способы оплаты</p>
          </div>
          <div className="space-y-2 text-sm">
            {["Наличные — 0% комиссия", "Карта — 1.5% комиссия", "Перевод — 0% комиссия", "Рассрочка — 5% комиссия"].map((m) => (
              <div key={m} className="flex items-center justify-between border-b pb-2 last:border-0">
                <span className="text-foreground">{m}</span>
                <span className="text-[10px] text-green-600">Активен</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <Bell className="h-5 w-5 text-primary" />
            <p className="text-sm font-semibold">Telegram-уведомления</p>
          </div>
          <div className="space-y-2 text-sm">
            {["Продажи", "Кассовые операции", "Смены", "AI анализ"].map((n) => (
              <div key={n} className="flex items-center justify-between border-b pb-2 last:border-0">
                <span className="text-foreground">{n}</span>
                <span className="text-[10px] text-green-600">Вкл</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <button onClick={handleAction} className="text-sm text-primary font-medium hover:underline">Сохранить изменения</button>
    </div>
  );
};

export default DemoSettings;
