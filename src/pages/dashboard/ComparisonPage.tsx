import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useStoreContext } from "@/contexts/StoreContext";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

const ComparisonPage = () => {
  const { companyId } = useAuth();
  const { stores } = useStoreContext();

  const { data: sales = [] } = useQuery({
    queryKey: ["comparison-sales", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase.from("sales").select("id, store_id, total, created_at, sale_items(price, cost_price)").eq("company_id", companyId);
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: devices = [] } = useQuery({
    queryKey: ["comparison-devices", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase.from("devices").select("id, store_id, status").eq("company_id", companyId);
      return data || [];
    },
    enabled: !!companyId,
  });

  const storeData = stores.map((store) => {
    const storeSales = sales.filter((s) => s.store_id === store.id);
    const revenue = storeSales.reduce((sum, s) => sum + (s.total || 0), 0);
    const profit = storeSales.reduce((sum, s) => {
      return sum + (s.sale_items || []).reduce((p: number, i: any) => p + ((i.price || 0) - (i.cost_price || 0)), 0);
    }, 0);
    const inStock = devices.filter((d) => d.store_id === store.id && ["available", "testing", "reserved"].includes(d.status)).length;
    const avgCheck = storeSales.length > 0 ? Math.round(revenue / storeSales.length) : 0;
    const margin = revenue > 0 ? Math.round((profit / revenue) * 100) : 0;

    return { ...store, revenue, profit, salesCount: storeSales.length, inStock, avgCheck, margin };
  });

  const maxRevenue = Math.max(...storeData.map((s) => s.revenue), 1);

  const chartData = storeData.map((s) => ({
    name: s.name.length > 15 ? s.name.slice(0, 15) + "…" : s.name,
    "Выручка": s.revenue,
    "Прибыль": s.profit,
    "Ср. чек": s.avgCheck,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Сравнение магазинов</h1>

      {stores.length < 2 ? (
        <Card className="p-8 text-center text-muted-foreground">
          Добавьте второй магазин, чтобы увидеть сравнение.
        </Card>
      ) : (
        <>
          {/* Chart */}
          <Card className="p-5 card-shadow">
            <h3 className="font-semibold mb-4">Сравнение показателей</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  formatter={(value: number) => `${value.toLocaleString("ru")} ₽`}
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                />
                <Legend />
                <Bar dataKey="Выручка" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Прибыль" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Comparison table */}
          <Card className="card-shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-4 font-medium">Магазин</th>
                  <th className="text-right p-4 font-medium">Выручка</th>
                  <th className="text-right p-4 font-medium">Прибыль</th>
                  <th className="text-right p-4 font-medium">Продажи</th>
                  <th className="text-right p-4 font-medium">Ср. чек</th>
                  <th className="text-right p-4 font-medium">Маржа</th>
                  <th className="text-right p-4 font-medium">На складе</th>
                </tr>
              </thead>
              <tbody>
                {storeData
                  .sort((a, b) => b.revenue - a.revenue)
                  .map((store, idx) => (
                    <tr key={store.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={idx === 0 ? "default" : "secondary"}
                            className="text-xs w-6 h-6 flex items-center justify-center rounded-full p-0"
                          >
                            {idx + 1}
                          </Badge>
                          <span className="font-medium">{store.name}</span>
                        </div>
                      </td>
                      <td className="text-right p-4 font-semibold">
                        {store.revenue.toLocaleString("ru")} ₽
                        <div className="h-1 mt-1 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${(store.revenue / maxRevenue) * 100}%` }}
                          />
                        </div>
                      </td>
                      <td className="text-right p-4">{store.profit.toLocaleString("ru")} ₽</td>
                      <td className="text-right p-4">{store.salesCount}</td>
                      <td className="text-right p-4">{store.avgCheck.toLocaleString("ru")} ₽</td>
                      <td className="text-right p-4">
                        <span className={store.margin > 20 ? "text-success" : store.margin < 10 ? "text-destructive" : ""}>
                          {store.margin}%
                        </span>
                      </td>
                      <td className="text-right p-4">{store.inStock}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
};

export default ComparisonPage;
