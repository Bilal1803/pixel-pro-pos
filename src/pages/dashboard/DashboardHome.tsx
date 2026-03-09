import { Card } from "@/components/ui/card";
import { DollarSign, TrendingUp, ShoppingCart, Smartphone } from "lucide-react";

const stats = [
  { label: "Выручка сегодня", value: "127 500 ₽", icon: DollarSign, change: "+12%" },
  { label: "Прибыль", value: "34 200 ₽", icon: TrendingUp, change: "+8%" },
  { label: "Продажи", value: "14", icon: ShoppingCart, change: "+3" },
  { label: "На складе", value: "89", icon: Smartphone, change: "−2" },
];

const recentSales = [
  { id: 1, device: "iPhone 14 Pro 128GB", price: "52 000 ₽", customer: "Иванов А.", date: "Сегодня, 14:23" },
  { id: 2, device: "Samsung S23 256GB", price: "38 000 ₽", customer: "Петров Б.", date: "Сегодня, 12:05" },
  { id: 3, device: "iPhone 13 128GB", price: "32 000 ₽", customer: "Сидорова В.", date: "Сегодня, 10:41" },
  { id: 4, device: "Xiaomi 13T 256GB", price: "22 500 ₽", customer: "Козлов Д.", date: "Вчера, 18:30" },
  { id: 5, device: "iPhone 15 256GB", price: "64 000 ₽", customer: "Морозов Е.", date: "Вчера, 16:12" },
];

const recentDevices = [
  { id: 1, model: "iPhone 14 Pro", memory: "128GB", imei: "35467890123456", status: "available", price: "48 000 ₽" },
  { id: 2, model: "Samsung S24", memory: "256GB", imei: "35467890123457", status: "testing", price: "—" },
  { id: 3, model: "iPhone 13", memory: "128GB", imei: "35467890123458", status: "reserved", price: "30 000 ₽" },
  { id: 4, model: "Pixel 8", memory: "128GB", imei: "35467890123459", status: "available", price: "35 000 ₽" },
];

const statusLabels: Record<string, { label: string; className: string }> = {
  available: { label: "В наличии", className: "bg-success/10 text-success" },
  testing: { label: "Проверка", className: "bg-warning/10 text-warning" },
  reserved: { label: "Резерв", className: "bg-primary/10 text-primary" },
  sold: { label: "Продано", className: "bg-muted text-muted-foreground" },
  defective: { label: "Дефект", className: "bg-destructive/10 text-destructive" },
};

const DashboardHome = () => {
  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-5 card-shadow">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{s.label}</span>
              <s.icon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="mt-2 text-2xl font-bold">{s.value}</div>
            <p className="mt-1 text-xs text-muted-foreground">{s.change} vs вчера</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Sales */}
        <Card className="card-shadow">
          <div className="border-b p-4">
            <h3 className="font-semibold">Последние продажи</h3>
          </div>
          <div className="divide-y">
            {recentSales.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-medium">{s.device}</p>
                  <p className="text-xs text-muted-foreground">{s.customer} · {s.date}</p>
                </div>
                <span className="text-sm font-semibold">{s.price}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Devices */}
        <Card className="card-shadow">
          <div className="border-b p-4">
            <h3 className="font-semibold">Последние устройства</h3>
          </div>
          <div className="divide-y">
            {recentDevices.map((d) => (
              <div key={d.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-medium">{d.model} {d.memory}</p>
                  <p className="text-xs text-muted-foreground">IMEI: {d.imei}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusLabels[d.status].className}`}>
                    {statusLabels[d.status].label}
                  </span>
                  <span className="text-sm font-semibold">{d.price}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default DashboardHome;
