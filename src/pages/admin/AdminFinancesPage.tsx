import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, CreditCard, XCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const priceMap: Record<string, number> = { start: 1990, business: 2990, premier: 7990 };

const AdminFinancesPage = () => {
  const { data: subscriptions = [] } = useQuery({
    queryKey: ["admin-fin-subs"],
    queryFn: async () => {
      const { data } = await supabase.from("subscriptions").select("*");
      return data || [];
    },
  });

  const paidSubs = subscriptions.filter((s: any) => s.paid);
  const cancelledSubs = subscriptions.filter((s: any) => !s.paid);
  const totalRevenue = paidSubs.reduce((sum: number, s: any) => sum + (priceMap[s.plan] || 0), 0);

  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7);
  const monthRevenue = paidSubs.reduce((sum: number, s: any) => sum + (priceMap[s.plan] || 0), 0);

  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    const month = d.toISOString().slice(0, 7);
    const label = d.toLocaleDateString("ru", { month: "short", year: "2-digit" });
    const revenue = paidSubs
      .filter((s: any) => s.created_at?.slice(0, 7) <= month)
      .reduce((sum: number, s: any) => sum + (priceMap[s.plan] || 0), 0);
    return { month: label, revenue };
  });

  const stats = [
    { label: "Общий доход", value: `${totalRevenue.toLocaleString("ru")} ₽`, icon: DollarSign, color: "text-success" },
    { label: "Доход за месяц", value: `${monthRevenue.toLocaleString("ru")} ₽`, icon: TrendingUp, color: "text-primary" },
    { label: "Активные подписки", value: paidSubs.length, icon: CreditCard, color: "text-warning" },
    { label: "Неоплаченные", value: cancelledSubs.length, icon: XCircle, color: "text-destructive" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Финансы платформы</h1>

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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Доход по месяцам (₽)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
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
  );
};

export default AdminFinancesPage;
