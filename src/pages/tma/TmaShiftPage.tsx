import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Play, Square, Plus, Minus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { format } from "date-fns";
import { sendTelegramNotification } from "@/lib/telegram";

const TmaShiftPage = () => {
  const { companyId, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [cashStart, setCashStart] = useState("");
  const [cashEnd, setCashEnd] = useState("");
  const [closeOpen, setCloseOpen] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["tma-profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("store_id").eq("user_id", user.id).single();
      return data;
    },
    enabled: !!user,
  });

  const { data: activeShift, isLoading } = useQuery({
    queryKey: ["tma-active-shift", user?.id],
    queryFn: async () => {
      if (!user || !companyId) return null;
      const { data } = await supabase.from("shifts").select("*").eq("employee_id", user.id).eq("status", "active").eq("company_id", companyId).maybeSingle();
      return data;
    },
    enabled: !!user && !!companyId,
  });

  // Shift sales
  const { data: shiftSales = [] } = useQuery({
    queryKey: ["tma-shift-sales", activeShift?.id],
    queryFn: async () => {
      if (!activeShift || !companyId) return [];
      const { data } = await supabase.from("sales")
        .select("total, payment_method")
        .eq("company_id", companyId)
        .eq("employee_id", user!.id)
        .gte("created_at", activeShift.start_time);
      return data || [];
    },
    enabled: !!activeShift,
  });

  // Cash operations
  const { data: cashOps = [] } = useQuery({
    queryKey: ["tma-cash-ops", activeShift?.id],
    queryFn: async () => {
      if (!activeShift) return [];
      const { data } = await supabase.from("cash_operations").select("*").eq("shift_id", activeShift.id).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!activeShift,
  });

  const shiftRevenue = shiftSales.reduce((s, sale) => s + (sale.total || 0), 0);
  const cashSales = shiftSales.filter(s => s.payment_method === "cash").reduce((s, sale) => s + (sale.total || 0), 0);
  const cardSales = shiftSales.filter(s => s.payment_method !== "cash").reduce((s, sale) => s + (sale.total || 0), 0);
  const deposits = cashOps.filter(o => o.type === "deposit").reduce((s, o) => s + o.amount, 0);
  const withdrawals = cashOps.filter(o => o.type === "withdraw").reduce((s, o) => s + o.amount, 0);
  const systemCash = (activeShift?.cash_start || 0) + cashSales + deposits - withdrawals;

  const openShift = useMutation({
    mutationFn: async () => {
      if (!companyId || !user) throw new Error("Не авторизован");
      const { error } = await supabase.from("shifts").insert({
        company_id: companyId,
        employee_id: user.id,
        store_id: profile?.store_id || null,
        cash_start: Number(cashStart) || 0,
        status: "active",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setCashStart("");
      queryClient.invalidateQueries({ queryKey: ["tma-active-shift"] });
      toast({ title: "Смена открыта" });

      if (companyId) {
        sendTelegramNotification(
          companyId,
          "shift_open",
          `▶️ <b>Смена открыта</b>\n\n💵 Касса: <b>${Number(cashStart || 0).toLocaleString("ru")} ₽</b>\n🕐 ${format(new Date(), "HH:mm dd.MM.yyyy")}`
        );
      }
    },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const closeShift = useMutation({
    mutationFn: async () => {
      if (!activeShift) throw new Error("Нет активной смены");
      const { error } = await supabase.from("shifts").update({
        status: "closed",
        end_time: new Date().toISOString(),
        cash_end: Number(cashEnd) || 0,
      }).eq("id", activeShift.id);
      if (error) throw error;
    },
    onSuccess: () => {
      setCashEnd("");
      setCloseOpen(false);
      queryClient.invalidateQueries({ queryKey: ["tma-active-shift"] });
      toast({ title: "Смена закрыта" });
    },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  if (isLoading) {
    return <div className="py-20 text-center text-muted-foreground">Загрузка...</div>;
  }

  // No active shift — show open form
  if (!activeShift) {
    return (
      <div className="space-y-6 pt-4">
        <div className="text-center space-y-2">
          <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Play className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-lg font-bold">Открыть смену</h1>
          <p className="text-sm text-muted-foreground">Введите сумму наличных в кассе</p>
        </div>
        <div className="space-y-3">
          <Input
            type="number"
            placeholder="0"
            className="h-14 text-center text-2xl font-bold rounded-xl"
            value={cashStart}
            onChange={(e) => setCashStart(e.target.value)}
          />
          <Button className="w-full h-14 text-base rounded-xl" onClick={() => openShift.mutate()} disabled={openShift.isPending}>
            <Play className="h-5 w-5 mr-2" />
            {openShift.isPending ? "Открытие..." : "Начать смену"}
          </Button>
        </div>
      </div>
    );
  }

  // Active shift — show stats
  const diff = (Number(cashEnd) || 0) - systemCash;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">Смена</h1>
          <p className="text-xs text-muted-foreground">
            с {format(new Date(activeShift.start_time), "HH:mm")}
          </p>
        </div>
        <Button variant="destructive" size="sm" className="rounded-xl" onClick={() => setCloseOpen(true)}>
          <Square className="h-4 w-4 mr-1" /> Закрыть
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-3.5">
          <p className="text-xs text-muted-foreground">Продажи</p>
          <p className="text-lg font-bold">{shiftSales.length}</p>
        </Card>
        <Card className="p-3.5">
          <p className="text-xs text-muted-foreground">Выручка</p>
          <p className="text-lg font-bold">{shiftRevenue.toLocaleString("ru")} ₽</p>
        </Card>
        <Card className="p-3.5">
          <p className="text-xs text-muted-foreground">Наличные</p>
          <p className="text-lg font-bold">{cashSales.toLocaleString("ru")} ₽</p>
        </Card>
        <Card className="p-3.5">
          <p className="text-xs text-muted-foreground">Карта / перевод</p>
          <p className="text-lg font-bold">{cardSales.toLocaleString("ru")} ₽</p>
        </Card>
      </div>

      <Card className="p-4">
        <p className="text-xs text-muted-foreground mb-1">Касса по системе</p>
        <p className="text-2xl font-bold">{systemCash.toLocaleString("ru")} ₽</p>
      </Card>

      {/* Cash ops log */}
      {cashOps.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Операции</p>
          <div className="space-y-1.5">
            {cashOps.map((op: any) => (
              <div key={op.id} className="flex items-center justify-between rounded-xl border p-3">
                <div className="flex items-center gap-2">
                  {op.type === "deposit" ? (
                    <Plus className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Minus className="h-4 w-4 text-destructive" />
                  )}
                  <span className="text-sm">{op.reason || (op.type === "deposit" ? "Внесение" : "Изъятие")}</span>
                </div>
                <span className={`text-sm font-semibold ${op.type === "deposit" ? "text-emerald-500" : "text-destructive"}`}>
                  {op.type === "deposit" ? "+" : "−"}{op.amount.toLocaleString("ru")} ₽
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Close shift dialog */}
      <Dialog open={closeOpen} onOpenChange={setCloseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Закрытие смены</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Продажи:</span> <strong>{shiftSales.length}</strong></div>
              <div><span className="text-muted-foreground">Выручка:</span> <strong>{shiftRevenue.toLocaleString("ru")} ₽</strong></div>
              <div><span className="text-muted-foreground">Наличные:</span> <strong>{cashSales.toLocaleString("ru")} ₽</strong></div>
              <div><span className="text-muted-foreground">Карта:</span> <strong>{cardSales.toLocaleString("ru")} ₽</strong></div>
            </div>
            <Card className="p-3">
              <p className="text-xs text-muted-foreground">Касса по системе</p>
              <p className="text-xl font-bold">{systemCash.toLocaleString("ru")} ₽</p>
            </Card>
            <div>
              <Label>Фактическая касса</Label>
              <Input
                type="number"
                placeholder="0"
                className="mt-1 h-12 text-lg font-bold"
                value={cashEnd}
                onChange={(e) => setCashEnd(e.target.value)}
              />
            </div>
            {cashEnd && (
              <Card className={`p-3 ${diff === 0 ? "bg-emerald-500/10" : "bg-destructive/10"}`}>
                <p className="text-xs text-muted-foreground">Разница</p>
                <p className={`text-xl font-bold ${diff === 0 ? "text-emerald-500" : "text-destructive"}`}>
                  {diff > 0 ? "+" : ""}{diff.toLocaleString("ru")} ₽
                </p>
              </Card>
            )}
            <DialogFooter>
              <Button className="w-full" variant="destructive" onClick={() => closeShift.mutate()} disabled={closeShift.isPending}>
                {closeShift.isPending ? "Закрытие..." : "Закрыть смену"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TmaShiftPage;
