import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, TrendingUp, TrendingDown, Minus, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const MonitoringPage = () => {
  const { companyId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ model: "", our_price: "", prices: "" });

  const { data: monitoring = [], isLoading } = useQuery({
    queryKey: ["price-monitoring", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("price_monitoring")
        .select("*")
        .eq("company_id", companyId)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const createEntry = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("No company");
      const pricesArr = form.prices.split(/[,;\s]+/).map(Number).filter(n => !isNaN(n) && n > 0);
      const avg = pricesArr.length > 0 ? Math.round(pricesArr.reduce((a, b) => a + b, 0) / pricesArr.length) : null;
      const { error } = await supabase.from("price_monitoring").insert({
        company_id: companyId,
        model: form.model,
        our_price: form.our_price ? Number(form.our_price) : null,
        prices: pricesArr,
        avg_price: avg,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["price-monitoring"] });
      toast({ title: "Модель добавлена" });
      setOpen(false);
      setForm({ model: "", our_price: "", prices: "" });
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("price_monitoring").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["price-monitoring"] });
      toast({ title: "Удалено" });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Мониторинг цен</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Добавить модель</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Новая модель для мониторинга</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createEntry.mutate(); }} className="space-y-3">
              <div><Label>Модель *</Label><Input placeholder="iPhone 14 Pro 128GB" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} required /></div>
              <div><Label>Наша цена</Label><Input type="number" value={form.our_price} onChange={(e) => setForm({ ...form, our_price: e.target.value })} /></div>
              <div><Label>Цены с Avito (через запятую)</Label><Input placeholder="49000, 50000, 51000, ..." value={form.prices} onChange={(e) => setForm({ ...form, prices: e.target.value })} /></div>
              <Button type="submit" className="w-full" disabled={createEntry.isPending || !form.model}>
                {createEntry.isPending ? "Добавление..." : "Добавить"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <p className="text-sm text-muted-foreground">
        Введите цены с Avito — система рассчитает среднюю рыночную цену и рекомендованную цену продажи.
      </p>

      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground">Загрузка...</div>
      ) : monitoring.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">Нет моделей для мониторинга</div>
      ) : (
        <div className="grid gap-4">
          {monitoring.map((m: any) => {
            const prices: number[] = m.prices || [];
            const avgPrice = m.avg_price || 0;
            const ourPrice = m.our_price || 0;
            const diff = ourPrice - avgPrice;
            const diffPercent = avgPrice > 0 ? ((diff / avgPrice) * 100).toFixed(1) : "0";
            const recommended = avgPrice > 0 ? Math.round(avgPrice * 0.95) : 0;

            return (
              <Card key={m.id} className="p-5 card-shadow">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{m.model}</h3>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteEntry.mutate(m.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </div>
                    {prices.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {prices.map((p: number, i: number) => (
                          <span key={i} className="rounded bg-muted px-2 py-0.5 text-xs font-mono">
                            {p.toLocaleString("ru")}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-6 text-sm sm:text-right">
                    <div>
                      <p className="text-muted-foreground">Средняя</p>
                      <p className="text-lg font-bold">{avgPrice > 0 ? `${avgPrice.toLocaleString("ru")} ₽` : "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Наша цена</p>
                      <p className="text-lg font-bold">{ourPrice > 0 ? `${ourPrice.toLocaleString("ru")} ₽` : "—"}</p>
                    </div>
                    {avgPrice > 0 && ourPrice > 0 && (
                      <div>
                        <p className="text-muted-foreground">Разница</p>
                        <p className={`text-lg font-bold flex items-center gap-1 ${diff > 0 ? "text-destructive" : diff < 0 ? "text-success" : ""}`}>
                          {diff > 0 ? <TrendingUp className="h-4 w-4" /> : diff < 0 ? <TrendingDown className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                          {diffPercent}%
                        </p>
                      </div>
                    )}
                    {avgPrice > 0 && (
                      <div>
                        <p className="text-muted-foreground">Рекомендация</p>
                        <p className="text-lg font-bold text-primary">{recommended.toLocaleString("ru")} ₽</p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MonitoringPage;
