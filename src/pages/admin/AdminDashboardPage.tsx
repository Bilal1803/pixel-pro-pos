import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, CreditCard, TrendingUp, Smartphone, ShoppingCart, Store, UserCog } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area } from "recharts";

const AdminDashboardPage = () => {
  const { data: companies = [] } = useQuery({
    queryKey: ["admin-dash-companies"],
    queryFn: async () => {
      const { data } = await supabase.from("companies").select("id, created_at");
      return data || [];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["admin-dash-profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, created_at");
      return data || [];
    },
  });

  const { data: stores = [] } = useQuery({
    queryKey: ["admin-dash-stores"],
    queryFn: async () => {
      const { data } = await supabase.from("stores").select("id");
      return data || [];
    },
  });

  const { data: devices = [] } = useQuery({
    queryKey: ["admin-dash-devices"],
    queryFn: async () => {
      const { data } = await supabase.from("devices").select("id");
      return data || [];
    },
  });

  const { data: sales = [] } = useQuery({
    queryKey: ["admin-dash-sales"],
    queryFn: async () => {
      const { data } = await supabase.from("sales").select("id, total, created_at");
      return data || [];
    },
  });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ["admin-dash-subs"],
    queryFn: async () => {
      const { data } = await supabase.from("subscriptions").select("plan, paid, created_at");
      return data || [];
    },
  });

  const today = new Date().toISOString().slice(0, 10);
  const currentMonth = new Date().toISOString().slice(0, 7);
  const salesToday = sales.filter((s: any) => s.created_at?.slice(0, 10) === today);
  const salesMonth = sales.filter((s: any) => s.created_at?.slice(0, 7) === currentMonth);
  const activeSubs = subscriptions.filter((s: any) => s.paid).length;
  const newToday = profiles.filter((p: any) => p.created_at?.slice(0, 10) === today).length;

  const priceMap: Record<string, number> = { start: 1990, business: 2990, premier: 7990 };
  const mrr = subscriptions
    .filter((s: any) => s.paid)
    .reduce((sum: number, s: any) => sum + (priceMap[s.plan] || 0), 0);

  // Monthly growth data (last 6 months)
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    const month = d.toISOString().slice(0, 7);
    const label = d.toLocaleDateString("ru", { month: "short" });
    return {
      month: label,
      users: profiles.filter((p: any) => p.created_at?.slice(0, 7) <= month).length,
      companies: companies.filter((c: any) => c.created_at?.slice(0, 7) <= month).length,
      revenue: subscriptions
        .filter((s: any) => s.paid && s.created_at?.slice(0, 7) <= month)
        .reduce((sum: number, s: any) => sum + (priceMap[s.plan] || 0), 0),
    };
  });

  // Daily sales (last 14 days)
  const dailySalesData = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    const day = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("ru", { day: "numeric", month: "short" });
    const daySales = sales.filter((s: any) => s.created_at?.slice(0, 10) === day);
    return {
      day: label,
      count: daySales.length,
      total: daySales.reduce((s: number, x: any) => s + (x.total || 0), 0),
    };
  });

  const stats = [
    { label: "Компании", value: companies.length, icon: Building2, color: "text-primary" },
    { label: "Пользователи", value: profiles.length, icon: Users, color: "text-chart-2" },
    { label: "Магазины", value: stores.length, icon: Store, color: "text-chart-3" },
    { label: "Устройства", value: devices.length, icon: Smartphone, color: "text-chart-4" },
    { label: "Продажи сегодня", value: salesToday.length, icon: ShoppingCart, color: "text-chart-5" },
    { label: "Продажи за месяц", value: salesMonth.length, icon: ShoppingCart, color: "text-warning" },
    { label: "Активные подписки", value: activeSubs, icon: CreditCard, color: "text-success" },
    { label: "MRR", value: `${mrr.toLocaleString("ru")} ₽`, icon: TrendingUp, color: "text-destructive" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Дашборд платформы</h1>
        <p className="text-sm text-muted-foreground mt-1">Обзор ключевых показателей системы</p>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">{s.label}</p>
                  <p className="text-xl font-bold mt-1">{s.value}</p>
                </div>
                <s.icon className={`h-7 w-7 ${s.color} opacity-70 shrink-0`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Рост пользователей и компаний</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Area type="monotone" dataKey="users" name="Пользователи" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.1)" strokeWidth={2} />
                <Area type="monotone" dataKey="companies" name="Компании" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2) / 0.1)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Доход по месяцам (₽)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Bar dataKey="revenue" name="Доход" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Продажи по дням (последние 14 дней)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dailySalesData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="day" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Bar dataKey="count" name="Количество продаж" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
