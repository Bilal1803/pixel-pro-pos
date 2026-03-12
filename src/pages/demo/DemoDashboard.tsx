import { useDemo } from "@/contexts/DemoContext";
import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, TrendingUp, Package, ShoppingCart, Wallet, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const DemoDashboard = () => {
  const { stats, sales, devices } = useDemo();

  const kpis = [
    { label: "Выручка сегодня", value: `${stats.todayRevenue.toLocaleString("ru")} ₽`, icon: DollarSign, color: "text-green-600" },
    { label: "Прибыль сегодня", value: `${stats.todayProfit.toLocaleString("ru")} ₽`, icon: TrendingUp, color: "text-primary" },
    { label: "На складе", value: stats.inStock, icon: Package, color: "text-foreground" },
    { label: "Средний чек", value: `${stats.avgCheck.toLocaleString("ru")} ₽`, icon: BarChart3, color: "text-amber-600" },
    { label: "Продажи сегодня", value: sales.filter((s) => s.created_at.startsWith(new Date().toISOString().slice(0, 10))).length, icon: ShoppingCart, color: "text-blue-600" },
    { label: "Касса", value: `${stats.currentCash.toLocaleString("ru")} ₽`, icon: Wallet, color: "text-green-600" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Дашборд</h1>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{k.label}</p>
                  <p className={`text-lg font-bold mt-1 ${k.color}`}>{k.value}</p>
                </div>
                <k.icon className={`h-6 w-6 ${k.color} opacity-60`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent sales */}
      <Card>
        <CardContent className="p-4">
          <p className="text-sm font-semibold mb-3">Последние продажи</p>
          <div className="space-y-2">
            {sales.slice(0, 4).map((s) => (
              <div key={s.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                <div>
                  <p className="font-medium text-foreground">{s.device}</p>
                  <p className="text-xs text-muted-foreground">{s.client || "Без клиента"} · {s.payment_method}</p>
                </div>
                <span className="font-bold text-foreground">{s.total.toLocaleString("ru")} ₽</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent devices */}
      <Card>
        <CardContent className="p-4">
          <p className="text-sm font-semibold mb-3">Устройства на складе</p>
          <div className="space-y-2">
            {devices.filter((d) => d.status === "available").slice(0, 4).map((d) => (
              <div key={d.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                <div>
                  <p className="font-medium text-foreground">{d.brand} {d.model} {d.memory}</p>
                  <p className="text-xs text-muted-foreground">IMEI: {d.imei.slice(0, 6)}...{d.imei.slice(-4)}</p>
                </div>
                <span className="font-bold text-primary">{d.sale_price.toLocaleString("ru")} ₽</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* CTA */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-6 text-center">
          <p className="font-semibold text-foreground">Понравился интерфейс?</p>
          <p className="text-sm text-muted-foreground mt-1">Создайте аккаунт и начните управлять своим магазином</p>
          <Button className="mt-4" asChild>
            <Link to="/register">Создать аккаунт бесплатно</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default DemoDashboard;
