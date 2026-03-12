import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Minus, ArrowDownToLine, ArrowUpFromLine, Banknote } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { sendTelegramNotification } from "@/lib/telegram";

const TmaCashPage = () => {
  const { companyId, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [opType, setOpType] = useState<"deposit" | "withdraw">("deposit");

  const { data: profile } = useQuery({
    queryKey: ["tma-profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("store_id").eq("user_id", user.id).maybeSingle();
      return data;
    },
    enabled: !!user,
    staleTime: 5 * 60_000,
  });

  const { data: activeShift } = useQuery({
    queryKey: ["tma-active-shift", user?.id],
    queryFn: async () => {
      if (!user || !companyId) return null;
      const { data } = await supabase.from("shifts").select("*").eq("employee_id", user.id).eq("status", "active").eq("company_id", companyId).maybeSingle();
      return data;
    },
    enabled: !!user && !!companyId,
    staleTime: 30_000,
  });

  const { data: cashOps = [] } = useQuery({
    queryKey: ["tma-cash-ops", activeShift?.id],
    queryFn: async () => {
      if (!activeShift) return [];
      const { data } = await supabase.from("cash_operations").select("*").eq("shift_id", activeShift.id).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!activeShift,
    staleTime: 15_000,
  });

  const { data: cashSalesTotal = 0 } = useQuery({
    queryKey: ["tma-cash-sales-total", companyId, activeShift?.id],
    queryFn: async () => {
      if (!companyId || !activeShift || !user) return 0;
      const { data } = await supabase.from("sales")
        .select("total")
        .eq("company_id", companyId)
        .eq("payment_method", "cash")
        .eq("employee_id", user.id)
        .gte("created_at", activeShift.start_time);
      return (data || []).reduce((s, sale) => s + (sale.total || 0), 0);
    },
    enabled: !!companyId && !!activeShift && !!user,
    staleTime: 30_000,
  });

  const deposits = cashOps.filter(o => o.type === "deposit" || o.type === "sale_cash").reduce((s, o) => s + o.amount, 0);
  const withdrawals = cashOps.filter(o => o.type === "withdraw").reduce((s, o) => s + o.amount, 0);
  const currentCash = (activeShift?.cash_start || 0) + deposits - withdrawals;

  const submitOp = useMutation({
    mutationFn: async () => {
      if (!companyId || !user || !activeShift) throw new Error("Откройте смену");
      const { error } = await supabase.from("cash_operations").insert({
        company_id: companyId, employee_id: user.id,
        store_id: profile?.store_id || null, shift_id: activeShift.id,
        type: opType, amount: Number(amount), reason: reason.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      const label = opType === "deposit" ? "Внесение" : "Изъятие";
      const emoji = opType === "deposit" ? "📥" : "📤";
      const amountNum = Number(amount);
      setAmount(""); setReason("");
      queryClient.invalidateQueries({ queryKey: ["tma-cash-ops"] });
      toast({ title: `${label} записано` });
      if (companyId) {
        sendTelegramNotification(companyId, "cash",
          `${emoji} <b>${label}</b>\n\n💵 Сумма: <b>${amountNum.toLocaleString("ru")} ₽</b>${reason.trim() ? `\n📝 ${reason.trim()}` : ""}`);
      }
    },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  if (!activeShift) {
    return (
      <div className="py-16 text-center space-y-3">
        <div className="mx-auto h-14 w-14 rounded-full bg-amber-50 flex items-center justify-center">
          <Banknote className="h-7 w-7 text-amber-600" />
        </div>
        <p className="text-base font-bold text-gray-900">Смена не открыта</p>
        <p className="text-sm text-gray-500">Откройте смену в разделе «Смена»</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-bold text-gray-900">Касса</h1>

      <div className="bg-white rounded-xl border border-gray-100 p-5 text-center shadow-sm">
        <p className="text-xs text-gray-500 mb-1">Наличные в кассе</p>
        <p className="text-3xl font-bold text-gray-900">{currentCash.toLocaleString("ru")} ₽</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setOpType("deposit")}
          className={`flex items-center justify-center gap-2 rounded-xl border p-4 text-sm font-medium transition-all active:scale-95 ${
            opType === "deposit" ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "bg-white border-gray-200 text-gray-600"
          }`}
        >
          <ArrowDownToLine className="h-5 w-5" /> Внести
        </button>
        <button
          onClick={() => setOpType("withdraw")}
          className={`flex items-center justify-center gap-2 rounded-xl border p-4 text-sm font-medium transition-all active:scale-95 ${
            opType === "withdraw" ? "border-red-300 bg-red-50 text-red-700" : "bg-white border-gray-200 text-gray-600"
          }`}
        >
          <ArrowUpFromLine className="h-5 w-5" /> Изъять
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <Label className="text-gray-700">Сумма</Label>
          <Input type="number" placeholder="0" className="mt-1 h-12 text-lg font-bold rounded-xl bg-white border-gray-200" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div>
          <Label className="text-gray-700">Причина</Label>
          <Input placeholder="Необязательно" className="mt-1 h-12 rounded-xl bg-white border-gray-200" value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        <Button className="w-full h-12 text-base rounded-xl bg-blue-600 hover:bg-blue-700" onClick={() => submitOp.mutate()} disabled={submitOp.isPending || !amount || Number(amount) <= 0}>
          {submitOp.isPending ? "Сохранение..." : opType === "deposit" ? "Внести деньги" : "Изъять деньги"}
        </Button>
      </div>

      {cashOps.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">История операций</p>
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
    </div>
  );
};

export default TmaCashPage;
