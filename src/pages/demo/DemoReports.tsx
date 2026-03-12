import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, ShoppingCart, Package, TrendingUp, BarChart3 } from "lucide-react";

const weekData = [
  { day: "Пн", revenue: 184500, sales: 4 },
  { day: "Вт", revenue: 127300, sales: 3 },
  { day: "Ср", revenue: 215800, sales: 5 },
  { day: "Чт", revenue: 98400, sales: 2 },
  { day: "Пт", revenue: 276900, sales: 6 },
  { day: "Сб", revenue: 189200, sales: 4 },
  { day: "Вс", revenue: 156700, sales: 3 },
];

const topModels = [
  { model: "iPhone 13 128GB", count: 8, revenue: 319920 },
  { model: "iPhone 14 128GB", count: 5, revenue: 274950 },
  { model: "Samsung S23 256GB", count: 4, revenue: 251960 },
  { model: "iPhone 15 128GB", count: 3, revenue: 209970 },
];

const maxRevenue = Math.max(...weekData.map((d) => d.revenue));

const DemoReports = () => (
  <div className="space-y-6">
    <h1 className="text-xl font-bold">Отчёты</h1>

    <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
      {[
        { label: "Выручка за неделю", value: `${weekData.reduce((s, d) => s + d.revenue, 0).toLocaleString("ru")} ₽`, icon: DollarSign, color: "text-green-600" },
        { label: "Продажи за неделю", value: weekData.reduce((s, d) => s + d.sales, 0), icon: ShoppingCart, color: "text-blue-600" },
        { label: "Средний чек", value: `${Math.round(weekData.reduce((s, d) => s + d.revenue, 0) / weekData.reduce((s, d) => s + d.sales, 0)).toLocaleString("ru")} ₽`, icon: BarChart3, color: "text-amber-600" },
        { label: "На складе", value: "6 устройств", icon: Package, color: "text-foreground" },
      ].map((k) => (
        <Card key={k.label}>
          <CardContent className="p-3">
            <k.icon className={`h-5 w-5 ${k.color} mb-1`} />
            <p className="text-[10px] text-muted-foreground">{k.label}</p>
            <p className={`text-sm font-bold ${k.color}`}>{k.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>

    <Card>
      <CardContent className="p-4">
        <p className="text-sm font-semibold mb-3">Выручка по дням</p>
        <div className="flex items-end gap-2" style={{ height: 120 }}>
          {weekData.map((d) => (
            <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full rounded-t bg-primary" style={{ height: `${(d.revenue / maxRevenue) * 100}%`, minHeight: 4 }} />
              <span className="text-[10px] text-muted-foreground">{d.day}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardContent className="p-4">
        <p className="text-sm font-semibold mb-3">Топ моделей</p>
        <div className="space-y-2">
          {topModels.map((m, i) => (
            <div key={m.model} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground w-4">{i + 1}</span>
                <div>
                  <p className="font-medium text-foreground">{m.model}</p>
                  <p className="text-[10px] text-muted-foreground">{m.count} продаж</p>
                </div>
              </div>
              <span className="font-bold text-foreground">{m.revenue.toLocaleString("ru")} ₽</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  </div>
);

export default DemoReports;
