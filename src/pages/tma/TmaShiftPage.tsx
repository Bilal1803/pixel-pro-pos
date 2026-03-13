import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Play, Square, Plus, Minus, Award } from "lucide-react";
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
      const { data } = await supabase.from("profiles").select("store_id").eq("user_id", user.id).maybeSingle();
      return data;
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  const { data: activeShift, isLoading } = useQuery({
    queryKey: ["tma-active-shift", user?.id],
    queryFn: async () => {
      if (!user || !companyId) return null;
      const { data } = await supabase.from("shifts").select("*").eq("employee_id", user.id).eq("status", "active").eq("company_id", companyId).maybeSingle();
      return data;
    },
    enabled: !!user && !!companyId,
    staleTime: 10_000,
  });

  const { data: shiftSales = [] } = useQuery({
    queryKey: ["tma-shift-sales", activeShift?.id],
    queryFn: async () => {
      if (!activeShift || !companyId || !user) return [];
      const { data } = await supabase.from("sales").select("total, payment_method").eq("company_id", companyId).eq("employee_id", user.id).gte("created_at", activeShift.start_time);
      return data || [];
    },
    enabled: !!activeShift,
    staleTime: 10_000,
  });

  const { data: cashOps = [] } = useQuery({
    queryKey: ["tma-cash-ops", activeShift?.id],
    queryFn: async () => {
      if (!activeShift) return [];
      const { data } = await supabase.from("cash_operations").select("*").eq("shift_id", activeShift.id).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!activeShift,
    staleTime: 10_000,
  });

  // Salary accruals for this shift
  const { data: shiftSalary = 0 } = useQuery({
    queryKey: ["tma-salary", companyId, user?.id, activeShift?.start_time],
    queryFn: async () => {
      if (!activeShift || !companyId || !user) return 0;
      const { data } = await supabase
        .from("salary_accruals")
        .select("amount")
        .eq("company_id", companyId)
        .eq("employee_id", user.id)
        .gte("created_at", activeShift.start_time);
      return (data || []).reduce((s, a) => s + (a.amount || 0), 0);
    },
    enabled: !!activeShift && !!companyId && !!user,
    staleTime: 30_000,
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
        company_id: companyId, employee_id: user.id,
        store_id: profile?.store_id || null, cash_start: Number(cashStart) || 0, status: "active",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setCashStart("");
      queryClient.invalidateQueries({ queryKey: ["tma-active-shift"] });
      toast({ title: "Смена открыта" });
      if (companyId) {
        sendTelegramNotification(companyId, "shift_open",
          `▶️ <b>Смена открыта</b>\n\n💵 Касса: <b>${Number(cashStart || 0).toLocaleString("ru")} ₽</b>\n🕐 ${format(new Date(), "HH:mm dd.MM.yyyy")}`);
      }
    },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const closeShift = useMutation({
    mutationFn: async () => {
      if (!activeShift) throw new Error("Нет активной смены");
      const { error } = await supabase.from("shifts").update({
        status: "closed", end_time: new Date().toISOString(), cash_end: Number(cashEnd) || 0,
      }).eq("id", activeShift.id);
      if (error) throw error;
    },
    onSuccess: () => {
      const finalDiff = (Number(cashEnd) || 0) - systemCash;
      const diffText = finalDiff === 0 ? "✅ Без расхождений" : `⚠️ Разница: ${finalDiff > 0 ? "+" : ""}${finalDiff.toLocaleString("ru")} ₽`;
      setCashEnd(""); setCloseOpen(false);
      queryClient.invalidateQueries({ queryKey: ["tma-active-shift"] });
      toast({ title: "Смена закрыта" });
      if (companyId) {
        sendTelegramNotification(companyId, "shift_close",
          `⏹ <b>Смена закрыта</b>\n\n📊 Продаж: <b>${shiftSales.length}</b>\n💰 Выручка: <b>${shiftRevenue.toLocaleString("ru")} ₽</b>\n💵 Наличные: ${cashSales.toLocaleString("ru")} ₽\n💳 Карта: ${cardSales.toLocaleString("ru")} ₽\n🏆 Заработок: ${shiftSalary.toLocaleString("ru")} ₽\n🏦 Система: ${systemCash.toLocaleString("ru")} ₽\n💰 Факт: ${(Number(cashEnd) || 0).toLocaleString("ru")} ₽\n${diffText}`);
      }
    },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  if (isLoading) {
    return <div className="py-20 text-center text-gray-400">Загрузка...</div>;
  }

  if (!activeShift) {
    return (
      <div className="space-y-6 pt-6">
        <div className="text-center space-y-3">
          <div className="mx-auto h-16 w-16 rounded-full bg-blue-50 flex items-center justify-center">
            <Play className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-lg font-bold text-gray-900">Открыть смену</h1>
          <p className="text-sm text-gray-500">Введите сумму наличных в кассе</p>
        </div>
        <div className="space-y-3">
          <Input
            type="number" placeholder="0"
            className="h-14 text-center text-2xl font-bold rounded-xl bg-white border-gray-200"
            value={cashStart} onChange={(e) => setCashStart(e.target.value)}
          />
          <Button className="w-full h-14 text-base rounded-xl bg-blue-600 hover:bg-blue-700" onClick={() => openShift.mutate()} disabled={openShift.isPending}>
            <Play className="h-5 w-5 mr-2" />
            {openShift.isPending ? "Открытие..." : "Начать смену"}
          </Button>
        </div>
      </div>
    );
  }

  const diff = (Number(cashEnd) || 0) - systemCash;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Смена</h1>
          <p className="text-xs text-gray-500">с {format(new Date(activeShift.start_time), "HH:mm")}</p>
        </div>
        <Button size="sm" className="rounded-xl bg-red-500 hover:bg-red-600 text-white" onClick={() => setCloseOpen(true)}>
          <Square className="h-4 w-4 mr-1" /> Закрыть
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Продажи", value: String(shiftSales.length) },
          { label: "Выручка", value: `${shiftRevenue.toLocaleString("ru")} ₽` },
          { label: "Наличные", value: `${cashSales.toLocaleString("ru")} ₽` },
          { label: "Карта / перевод", value: `${cardSales.toLocaleString("ru")} ₽` },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-3.5 shadow-sm">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className="text-lg font-bold text-gray-900 mt-0.5">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Salary earned this shift */}
      <div className="bg-purple-50 rounded-xl border border-purple-100 p-4 shadow-sm flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
          <Award className="h-5 w-5 text-purple-600" />
        </div>
        <div>
          <p className="text-xs text-purple-600 font-medium">Заработок за смену</p>
          <p className="text-2xl font-bold text-purple-700">{shiftSalary.toLocaleString("ru")} ₽</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
        <p className="text-xs text-gray-500 mb-1">Касса по системе</p>
        <p className="text-2xl font-bold text-gray-900">{systemCash.toLocaleString("ru")} ₽</p>
      </div>

      {cashOps.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Операции</p>
          <div className="space-y-1.5">
            {cashOps.map((op: any) => (
              <div key={op.id} className="flex items-center justify-between bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
                <div className="flex items-center gap-2">
                  {op.type === "deposit" ? <Plus className="h-4 w-4 text-emerald-500" /> : <Minus className="h-4 w-4 text-red-500" />}
                  <span className="text-sm text-gray-700">{op.reason || (op.type === "deposit" ? "Внесение" : "Изъятие")}</span>
                </div>
                <span className={`text-sm font-semibold ${op.type === "deposit" ? "text-emerald-600" : "text-red-600"}`}>
                  {op.type === "deposit" ? "+" : "−"}{op.amount.toLocaleString("ru")} ₽
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={closeOpen} onOpenChange={setCloseOpen}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Закрытие смены</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="text-gray-500">Продажи: <strong className="text-gray-900">{shiftSales.length}</strong></div>
              <div className="text-gray-500">Выручка: <strong className="text-gray-900">{shiftRevenue.toLocaleString("ru")} ₽</strong></div>
              <div className="text-gray-500">Наличные: <strong className="text-gray-900">{cashSales.toLocaleString("ru")} ₽</strong></div>
              <div className="text-gray-500">Карта: <strong className="text-gray-900">{cardSales.toLocaleString("ru")} ₽</strong></div>
            </div>
            <div className="bg-purple-50 rounded-xl p-3">
              <p className="text-xs text-purple-600">Заработок за смену</p>
              <p className="text-xl font-bold text-purple-700">{shiftSalary.toLocaleString("ru")} ₽</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500">Касса по системе</p>
              <p className="text-xl font-bold text-gray-900">{systemCash.toLocaleString("ru")} ₽</p>
            </div>
            <div>
              <Label className="text-gray-700">Фактическая касса</Label>
              <Input type="number" placeholder="0" className="mt-1 h-12 text-lg font-bold bg-white border-gray-200" value={cashEnd} onChange={(e) => setCashEnd(e.target.value)} />
            </div>
            {cashEnd && (
              <div className={`rounded-xl p-3 ${diff === 0 ? "bg-emerald-50" : "bg-red-50"}`}>
                <p className="text-xs text-gray-500">Разница</p>
                <p className={`text-xl font-bold ${diff === 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {diff > 0 ? "+" : ""}{diff.toLocaleString("ru")} ₽
                </p>
              </div>
            )}
            <DialogFooter>
              <Button className="w-full bg-red-500 hover:bg-red-600 text-white" onClick={() => closeShift.mutate()} disabled={closeShift.isPending}>
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
