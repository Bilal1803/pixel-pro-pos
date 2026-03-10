import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, Users, Smartphone, ShoppingCart, Package, Wrench } from "lucide-react";

const AdminAnalyticsPage = () => {
  const { data: companies = [] } = useQuery({
    queryKey: ["admin-analytics-companies"],
    queryFn: async () => {
      const { data } = await supabase.from("companies").select("id");
      return data || [];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["admin-analytics-profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id");
      return data || [];
    },
  });

  const { data: devices = [] } = useQuery({
    queryKey: ["admin-analytics-devices"],
    queryFn: async () => {
      const { data } = await supabase.from("devices").select("id, status");
      return data || [];
    },
  });

  const { data: sales = [] } = useQuery({
    queryKey: ["admin-analytics-sales"],
    queryFn: async () => {
      const { data } = await supabase.from("sales").select("id, total");
      return data || [];
    },
  });

  const { data: repairs = [] } = useQuery({
    queryKey: ["admin-analytics-repairs"],
    queryFn: async () => {
      const { data } = await supabase.from("repairs").select("id");
      return data || [];
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ["admin-analytics-products"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("id, stock");
      return data || [];
    },
  });

  const totalSalesAmount = sales.reduce((s: number, x: any) => s + (x.total || 0), 0);
  const availableDevices = devices.filter((d: any) => d.status === "available").length;
  const totalStock = products.reduce((s: number, p: any) => s + (p.stock || 0), 0);

  const metrics = [
    { label: "Компании", value: companies.length, icon: Building2, color: "text-primary" },
    { label: "Пользователи", value: profiles.length, icon: Users, color: "text-warning" },
    { label: "Устройства на складах", value: availableDevices, sub: `из ${devices.length}`, icon: Smartphone, color: "text-success" },
    { label: "Продажи (всего)", value: sales.length, sub: `на ${totalSalesAmount.toLocaleString("ru")} ₽`, icon: ShoppingCart, color: "text-destructive" },
    { label: "Товары (аксессуары)", value: `${totalStock} шт.`, icon: Package, color: "text-primary" },
    { label: "Ремонты", value: repairs.length, icon: Wrench, color: "text-warning" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Аналитика платформы</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {metrics.map((m) => (
          <Card key={m.label}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{m.label}</p>
                  <p className="text-2xl font-bold mt-1">{m.value}</p>
                  {(m as any).sub && <p className="text-xs text-muted-foreground mt-0.5">{(m as any).sub}</p>}
                </div>
                <m.icon className={`h-8 w-8 ${m.color} opacity-80`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminAnalyticsPage;
