import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Store, MapPin, Phone, Smartphone, DollarSign, TrendingUp, ArrowRight, Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useStoreContext } from "@/contexts/StoreContext";
import { useSubscription } from "@/hooks/useSubscription";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { toast } from "sonner";

const NetworkPage = () => {
  const { companyId } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { stores, setActiveStoreId } = useStoreContext();
  const { subscription } = useSubscription();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", address: "", phone: "" });

  const canAddStore = stores.length < (subscription?.max_stores ?? 1);

  const handleAddStore = async () => {
    if (!companyId || !form.name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("stores").insert({
      company_id: companyId,
      name: form.name.trim(),
      address: form.address.trim() || null,
      phone: form.phone.trim() || null,
    });
    setSaving(false);
    if (error) {
      toast.error("Не удалось создать магазин");
      return;
    }
    toast.success("Магазин добавлен");
    setForm({ name: "", address: "", phone: "" });
    setDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ["stores"] });
  };

  const { data: devices = [] } = useQuery({
    queryKey: ["network-devices", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase.from("devices").select("id, store_id, status, sale_price").eq("company_id", companyId);
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: sales = [] } = useQuery({
    queryKey: ["network-sales", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase.from("sales").select("id, store_id, total, created_at, sale_items(price, cost_price)").eq("company_id", companyId);
      return data || [];
    },
    enabled: !!companyId,
  });

  const storeStats = stores.map((store) => {
    const storeDevices = devices.filter((d) => d.store_id === store.id);
    const storeSales = sales.filter((s) => s.store_id === store.id);
    const revenue = storeSales.reduce((sum, s) => sum + (s.total || 0), 0);
    const profit = storeSales.reduce((sum, s) => {
      return sum + (s.sale_items || []).reduce((p: number, i: any) => p + ((i.price || 0) - (i.cost_price || 0)), 0);
    }, 0);
    const inStock = storeDevices.filter((d) => ["available", "testing", "reserved"].includes(d.status)).length;

    return {
      ...store,
      revenue,
      profit,
      salesCount: storeSales.length,
      inStock,
      avgCheck: storeSales.length > 0 ? Math.round(revenue / storeSales.length) : 0,
    };
  });

  const totalRevenue = storeStats.reduce((s, st) => s + st.revenue, 0);
  const totalProfit = storeStats.reduce((s, st) => s + st.profit, 0);
  const totalSales = storeStats.reduce((s, st) => s + st.salesCount, 0);
  const totalStock = storeStats.reduce((s, st) => s + st.inStock, 0);

  const chartData = storeStats.map((s) => ({
    name: s.name.length > 12 ? s.name.slice(0, 12) + "…" : s.name,
    revenue: s.revenue,
    profit: s.profit,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Сеть магазинов</h1>
        <Button variant="outline" onClick={() => navigate("/dashboard/comparison")}>
          Сравнение магазинов
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      {/* Network KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Выручка сети", value: `${totalRevenue.toLocaleString("ru")} ₽`, icon: DollarSign },
          { label: "Прибыль сети", value: `${totalProfit.toLocaleString("ru")} ₽`, icon: TrendingUp },
          { label: "Продаж всего", value: `${totalSales}`, icon: Store },
          { label: "На складах", value: `${totalStock}`, icon: Smartphone },
        ].map((s) => (
          <Card key={s.label} className="p-5 card-shadow">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{s.label}</span>
              <s.icon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="mt-2 text-2xl font-bold">{s.value}</div>
          </Card>
        ))}
      </div>

      {/* Chart */}
      {chartData.length > 1 && (
        <Card className="p-5 card-shadow">
          <h3 className="font-semibold mb-4">Топ магазинов по выручке и прибыли</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="name" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip
                formatter={(value: number) => `${value.toLocaleString("ru")} ₽`}
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
              />
              <Bar dataKey="revenue" fill="hsl(var(--primary))" name="Выручка" radius={[4, 4, 0, 0]} />
              <Bar dataKey="profit" fill="hsl(var(--success))" name="Прибыль" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Store cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {storeStats.map((store) => (
          <Card
            key={store.id}
            className="p-5 card-shadow hover:card-shadow-hover transition-shadow cursor-pointer"
            onClick={() => {
              setActiveStoreId(store.id);
              navigate("/dashboard");
            }}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <Store className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">{store.name}</h3>
                  {store.address && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {store.address}
                    </p>
                  )}
                </div>
              </div>
              <Badge variant="secondary" className="text-xs">
                {store.inStock} шт.
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Выручка</p>
                <p className="font-semibold">{store.revenue.toLocaleString("ru")} ₽</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Прибыль</p>
                <p className="font-semibold">{store.profit.toLocaleString("ru")} ₽</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Продажи</p>
                <p className="font-semibold">{store.salesCount}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Ср. чек</p>
                <p className="font-semibold">{store.avgCheck.toLocaleString("ru")} ₽</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default NetworkPage;
