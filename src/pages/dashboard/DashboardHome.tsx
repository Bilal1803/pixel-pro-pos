import { Card } from "@/components/ui/card";
import { DollarSign, TrendingUp, ShoppingCart, Smartphone } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const DashboardHome = () => {
  const { companyId } = useAuth();

  const { data: devices = [] } = useQuery({
    queryKey: ["devices-dash", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase.from("devices").select("*").eq("company_id", companyId);
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: sales = [] } = useQuery({
    queryKey: ["sales-dash", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase.from("sales").select("*, clients(name), sale_items(name, price, cost_price)").eq("company_id", companyId).order("created_at", { ascending: false }).limit(10);
      return data || [];
    },
    enabled: !!companyId,
  });

  const today = new Date().toISOString().split("T")[0];
  const todaySales = sales.filter((s: any) => s.created_at?.startsWith(today));
  const todayRevenue = todaySales.reduce((sum: number, s: any) => sum + (s.total || 0), 0);
  const todayProfit = todaySales.reduce((sum: number, s: any) => {
    const itemProfit = (s.sale_items || []).reduce((p: number, i: any) => p + ((i.price || 0) - (i.cost_price || 0)), 0);
    return sum + itemProfit;
  }, 0);
  const inStock = devices.filter(d => d.status === "available").length;

  const stats = [
    { label: "Выручка сегодня", value: `${todayRevenue.toLocaleString("ru")} ₽`, icon: DollarSign },
    { label: "Прибыль сегодня", value: `${todayProfit.toLocaleString("ru")} ₽`, icon: TrendingUp },
    { label: "Продажи сегодня", value: `${todaySales.length}`, icon: ShoppingCart },
    { label: "На складе", value: `${inStock}`, icon: Smartphone },
  ];

  const recentDevices = devices.slice(0, 5);

  const statusLabels: Record<string, { label: string; className: string }> = {
    available: { label: "В наличии", className: "bg-success/10 text-success" },
    testing: { label: "Проверка", className: "bg-warning/10 text-warning" },
    reserved: { label: "Резерв", className: "bg-primary/10 text-primary" },
    sold: { label: "Продано", className: "bg-muted text-muted-foreground" },
    defective: { label: "Дефект", className: "bg-destructive/10 text-destructive" },
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-5 card-shadow">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{s.label}</span>
              <s.icon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="mt-2 text-2xl font-bold">{s.value}</div>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="card-shadow">
          <div className="border-b p-4"><h3 className="font-semibold">Последние продажи</h3></div>
          {sales.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">Нет продаж</div>
          ) : (
            <div className="divide-y">
              {sales.slice(0, 5).map((s: any) => (
                <div key={s.id} className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-sm font-medium">{s.sale_items?.map((i: any) => i.name).join(", ") || "—"}</p>
                    <p className="text-xs text-muted-foreground">{s.clients?.name || "Без клиента"} · {new Date(s.created_at).toLocaleString("ru")}</p>
                  </div>
                  <span className="text-sm font-semibold">{s.total} ₽</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="card-shadow">
          <div className="border-b p-4"><h3 className="font-semibold">Последние устройства</h3></div>
          {recentDevices.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">Нет устройств</div>
          ) : (
            <div className="divide-y">
              {recentDevices.map((d) => (
                <div key={d.id} className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-sm font-medium">{d.model} {d.memory || ""}</p>
                    <p className="text-xs text-muted-foreground">IMEI: {d.imei}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusLabels[d.status]?.className || ""}`}>
                      {statusLabels[d.status]?.label || d.status}
                    </span>
                    <span className="text-sm font-semibold">{d.sale_price ? `${d.sale_price} ₽` : "—"}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default DashboardHome;
