import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Plus, Minus, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

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
      const { data } = await supabase.from("profiles").select("store_id").eq("user_id", user.id).single();
      return data;
    },
    enabled: !!user,
  });

  const { data: activeShift } = useQuery({
    queryKey: ["tma-active-shift", user?.id],
    queryFn: async () => {
      if (!user || !companyId) return null;
      const { data } = await supabase.from("shifts").select("*").eq("employee_id", user.id).eq("status", "active").eq("company_id", companyId).maybeSingle();
      return data;
    },
    enabled: !!user && !!companyId,
  });

  const { data: cashOps = [] } = useQuery({
    queryKey: ["tma-cash-ops", activeShift?.id],
    queryFn: async () => {
      if (!activeShift) return [];
      const { data } = await supabase.from("cash_operations").select("*").eq("shift_id", activeShift.id).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!activeShift,
  });

  // Today's cash sales
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const { data: cashSalesTotal = 0 } = useQuery({
    queryKey: ["tma-cash-sales-total", companyId, profile?.store_id],
    queryFn: async () => {
      if (!companyId || !activeShift) return 0;
      const { data } = await supabase.from("sales")
        .select("total")
        .eq("company_id", companyId)
        .eq("payment_method", "cash")
        .eq("employee_id", user!.id)
        .gte("created_at", activeShift.start_time);
      return (data || []).reduce((s, sale) => s + (sale.total || 0), 0);
    },
    enabled: !!companyId && !!activeShift,
  });

  const deposits = cashOps.filter(o => o.type === "deposit").reduce((s, o) => s + o.amount, 0);
  const withdrawals = cashOps.filter(o => o.type === "withdraw").reduce((s, o) => s + o.amount, 0);
  const currentCash = (activeShift?.cash_start || 0) + cashSalesTotal + deposits - withdrawals;

  const submitOp = useMutation({
    mutationFn: async () => {
      if (!companyId || !user || !activeShift) throw new Error("Откройте смену");
      const { error } = await supabase.from("cash_operations").insert({
        company_id: companyId,
        employee_id: user.id,
        store_id: profile?.store_id || null,
        shift_id: activeShift.id,
        type: opType,
        amount: Number(amount),
        reason: reason.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setAmount("");
      setReason("");
      queryClient.invalidateQueries({ queryKey: ["tma-cash-ops"] });
      toast({ title: opType === "deposit" ? "Внесение записано" : "Изъятие записано" });
    },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  if (!activeShift) {
    return (
      <div className="py-20 text-center space-y-2">
        <p className="text-lg font-bold">Смена не открыта</p>
        <p className="text-sm text-muted-foreground">Откройте смену в разделе «Смена»</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-bold">Касса</h1>

      <Card className="p-4 text-center">
        <p className="text-xs text-muted-foreground">Наличные в кассе</p>
        <p className="text-3xl font-bold mt-1">{currentCash.toLocaleString("ru")} ₽</p>
      </Card>

      {/* Operation type */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setOpType("deposit")}
          className={`flex items-center justify-center gap-2 rounded-xl border p-4 text-sm font-medium transition-all active:scale-95 ${
            opType === "deposit" ? "border-emerald-500 bg-emerald-500/10 text-emerald-600" : "bg-card"
          }`}
        >
          <ArrowDownToLine className="h-5 w-5" /> Внести
        </button>
        <button
          onClick={() => setOpType("withdraw")}
          className={`flex items-center justify-center gap-2 rounded-xl border p-4 text-sm font-medium transition-all active:scale-95 ${
            opType === "withdraw" ? "border-destructive bg-destructive/10 text-destructive" : "bg-card"
          }`}
        >
          <ArrowUpFromLine className="h-5 w-5" /> Изъять
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <Label>Сумма</Label>
          <Input
            type="number"
            placeholder="0"
            className="mt-1 h-12 text-lg font-bold rounded-xl"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div>
          <Label>Причина</Label>
          <Input
            placeholder="Необязательно"
            className="mt-1 h-12 rounded-xl"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        <Button
          className="w-full h-12 text-base rounded-xl"
          onClick={() => submitOp.mutate()}
          disabled={submitOp.isPending || !amount || Number(amount) <= 0}
        >
          {submitOp.isPending ? "Сохранение..." : opType === "deposit" ? "Внести деньги" : "Изъять деньги"}
        </Button>
      </div>

      {/* History */}
      {cashOps.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">История операций</p>
          <div className="space-y-1.5">
            {cashOps.map((op: any) => (
              <div key={op.id} className="flex items-center justify-between rounded-xl border p-3">
                <div className="flex items-center gap-2">
                  {op.type === "deposit" ? <Plus className="h-4 w-4 text-emerald-500" /> : <Minus className="h-4 w-4 text-destructive" />}
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
    </div>
  );
};

export default TmaCashPage;
