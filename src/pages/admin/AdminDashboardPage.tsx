import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, CreditCard, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

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

  const { data: subscriptions = [] } = useQuery({
    queryKey: ["admin-dash-subs"],
    queryFn: async () => {
      const { data } = await supabase.from("subscriptions").select("plan, paid, created_at");
      return data || [];
    },
  });

  const today = new Date().toISOString().slice(0, 10);
  const newToday = profiles.filter((p: any) => p.created_at?.slice(0, 10) === today).length;
  const activeSubs = subscriptions.filter((s: any) => s.paid).length;

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

  const stats = [
    { label: "Компании", value: companies.length, icon: Building2, color: "text-primary" },
    { label: "Активные подписки", value: activeSubs, icon: CreditCard, color: "text-success" },
    { label: "Новые сегодня", value: newToday, icon: Users, color: "text-warning" },
    { label: "MRR", value: `${mrr.toLocaleString("ru")} ₽`, icon: TrendingUp, color: "text-destructive" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Дашборд платформы</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <p className="text-2xl font-bold mt-1">{s.value}</p>
                </div>
                <s.icon className={`h-8 w-8 ${s.color} opacity-80`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Рост пользователей и компаний</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Line type="monotone" dataKey="users" name="Пользователи" stroke="hsl(var(--primary))" strokeWidth={2} />
                <Line type="monotone" dataKey="companies" name="Компании" stroke="hsl(var(--warning))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Доход по месяцам (₽)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
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
      </div>
    </div>
  );
};

export default AdminDashboardPage;
