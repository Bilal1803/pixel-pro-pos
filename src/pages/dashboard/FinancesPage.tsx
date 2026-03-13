import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DollarSign, TrendingDown, TrendingUp, Plus, Wrench, CreditCard, Users } from "lucide-react";
import { useSalaryData } from "@/hooks/useSalaryData";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import SectionHelp from "@/components/SectionHelp";
import { SECTION_TIPS } from "@/data/sectionTips";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const FinancesPage = () => {
  const { companyId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ category: "", amount: "", description: "" });

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { data: sales = [] } = useQuery({
    queryKey: ["finances-sales", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase
        .from("sales")
        .select("total, payment_fee, created_at, sale_items(price, cost_price)")
        .eq("company_id", companyId)
        .gte("created_at", monthStart);
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: repairs = [] } = useQuery({
    queryKey: ["finances-repairs", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase
        .from("repairs")
        .select("price, status")
        .eq("company_id", companyId)
        .in("status", ["done", "ready"])
        .gte("created_at", monthStart);
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ["expenses", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .eq("company_id", companyId)
        .order("date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const { data: devices = [] } = useQuery({
    queryKey: ["finances-devices", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase
        .from("devices")
        .select("purchase_price")
        .eq("company_id", companyId);
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: products = [] } = useQuery({
    queryKey: ["finances-products", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase
        .from("products")
        .select("cost_price, stock")
        .eq("company_id", companyId);
      return data || [];
    },
    enabled: !!companyId,
  });

  const monthExpenses = expenses.filter((e: any) => new Date(e.date) >= new Date(monthStart));

  const totalRevenue = sales.reduce((s: number, sale: any) => s + (sale.total || 0), 0);
  const totalPaymentFees = sales.reduce((s: number, sale: any) => s + (sale.payment_fee || 0), 0);
  const salesProductRevenue = totalRevenue - totalPaymentFees;
  const repairRevenue = repairs.reduce((s: number, r: any) => s + (r.price || 0), 0);

  const costOfGoods = sales.reduce((s: number, sale: any) => {
    return s + (sale.sale_items || []).reduce((a: number, i: any) => a + (i.cost_price || 0), 0);
  }, 0);
  const totalExpenses = monthExpenses.reduce((s: number, e: any) => s + (e.amount || 0), 0);
  // Profit = product revenue + repair revenue - cost of goods - expenses (fees excluded from profit)
  const netProfit = salesProductRevenue + repairRevenue - costOfGoods - totalExpenses;

  const totalInventoryCost = 
    devices.reduce((s: number, d: any) => s + (d.purchase_price || 0), 0) +
    products.reduce((s: number, p: any) => s + ((p.cost_price || 0) * (p.stock || 0)), 0);

  const stats = [
    { label: "Выручка от товаров", value: `${salesProductRevenue.toLocaleString("ru")} ₽`, icon: DollarSign },
    { label: "Комиссии оплаты", value: `${totalPaymentFees.toLocaleString("ru")} ₽`, icon: CreditCard },
    { label: "Общий оборот", value: `${(totalRevenue + repairRevenue).toLocaleString("ru")} ₽`, icon: TrendingUp },
    { label: "Доход от ремонта", value: `${repairRevenue.toLocaleString("ru")} ₽`, icon: Wrench },
    { label: "Товары по себестоимости", value: `${totalInventoryCost.toLocaleString("ru")} ₽`, icon: DollarSign },
    { label: "Расходы за месяц", value: `${totalExpenses.toLocaleString("ru")} ₽`, icon: TrendingDown },
    { label: "Чистая прибыль", value: `${netProfit.toLocaleString("ru")} ₽`, icon: TrendingUp },
  ];

  const createExpense = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("No company");
      const { error } = await supabase.from("expenses").insert({
        company_id: companyId,
        category: form.category,
        amount: Number(form.amount),
        description: form.description || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast({ title: "Расход добавлен" });
      setOpen(false);
      setForm({ category: "", amount: "", description: "" });
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Финансы</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Добавить расход</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Новый расход</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createExpense.mutate(); }} className="space-y-3">
              <div><Label>Категория *</Label><Input placeholder="Аренда, Зарплата, Реклама..." value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required /></div>
              <div><Label>Сумма *</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></div>
              <div><Label>Описание</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <Button type="submit" className="w-full" disabled={createExpense.isPending || !form.category || !form.amount}>
                {createExpense.isPending ? "Добавление..." : "Добавить расход"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <SectionHelp tips={SECTION_TIPS.finances} sectionKey="finances" />

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

      <Card className="card-shadow overflow-hidden">
        <div className="border-b p-4"><h3 className="font-semibold">Расходы</h3></div>
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Загрузка...</div>
        ) : expenses.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">Нет расходов</div>
        ) : (
          <div className="divide-y">
            {expenses.map((e: any) => (
              <div key={e.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-medium">{e.category}</p>
                  <p className="text-xs text-muted-foreground">{e.description || ""} · {new Date(e.date).toLocaleDateString("ru")}</p>
                </div>
                <span className="text-sm font-semibold">{e.amount?.toLocaleString("ru")} ₽</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default FinancesPage;
