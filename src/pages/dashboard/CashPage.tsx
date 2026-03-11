import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowDownToLine, ArrowUpFromLine, Plus, Minus, ShoppingCart, RotateCcw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import SectionHelp from "@/components/SectionHelp";
import { SECTION_TIPS } from "@/data/sectionTips";

const CashPage = () => {
  const { companyId, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [opType, setOpType] = useState<"deposit" | "withdraw">("deposit");
  const [dialogOpen, setDialogOpen] = useState(false);

  // Active shift
  const { data: activeShift } = useQuery({
    queryKey: ["active-shift-cash", user?.id],
    queryFn: async () => {
      if (!user || !companyId) return null;
      const { data } = await supabase.from("shifts").select("*").eq("employee_id", user.id).eq("status", "active").eq("company_id", companyId).maybeSingle();
      return data;
    },
    enabled: !!user && !!companyId,
  });

  // Profile for store_id
  const { data: profile } = useQuery({
    queryKey: ["cash-profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("store_id").eq("user_id", user.id).single();
      return data;
    },
    enabled: !!user,
  });

  // Cash operations for active shift
  const { data: cashOps = [] } = useQuery({
    queryKey: ["cash-ops-page", activeShift?.id],
    queryFn: async () => {
      if (!activeShift) return [];
      const { data } = await supabase.from("cash_operations").select("*").eq("shift_id", activeShift.id).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!activeShift,
  });

  // Employee names
  const { data: profiles = [] } = useQuery({
    queryKey: ["cash-profiles", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase.from("profiles").select("user_id, full_name").eq("company_id", companyId);
      return data || [];
    },
    enabled: !!companyId,
  });

  // Cash sales during shift
  const { data: cashSalesTotal = 0 } = useQuery({
    queryKey: ["cash-sales-total-page", activeShift?.id, companyId],
    queryFn: async () => {
      if (!activeShift || !companyId || !user) return 0;
      const { data } = await supabase.from("sales")
        .select("total")
        .eq("company_id", companyId)
        .eq("payment_method", "cash")
        .eq("employee_id", user.id)
        .gte("created_at", activeShift.start_time);
      return (data || []).reduce((s, sale) => s + (sale.total || 0), 0);
    },
    enabled: !!activeShift && !!companyId && !!user,
  });

  // All cash operations for history (not just active shift)
  const { data: allCashOps = [] } = useQuery({
    queryKey: ["all-cash-ops", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase.from("cash_operations").select("*").eq("company_id", companyId).order("created_at", { ascending: false }).limit(100);
      return data || [];
    },
    enabled: !!companyId,
  });

  const deposits = cashOps.filter(o => o.type === "deposit").reduce((s, o) => s + o.amount, 0);
  const withdrawals = cashOps.filter(o => o.type === "withdraw").reduce((s, o) => s + o.amount, 0);
  const currentCash = (activeShift?.cash_start || 0) + cashSalesTotal + deposits - withdrawals;

  const getEmployeeName = (id: string | null) => {
    if (!id) return "—";
    const p = profiles.find((p: any) => p.user_id === id);
    return p?.full_name || "—";
  };

  const submitOp = useMutation({
    mutationFn: async () => {
      if (!companyId || !user || !activeShift) throw new Error("Откройте смену перед операцией с кассой");
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
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["cash-ops-page"] });
      queryClient.invalidateQueries({ queryKey: ["all-cash-ops"] });
      queryClient.invalidateQueries({ queryKey: ["cash-ops-dash"] });
      toast({ title: opType === "deposit" ? "Внесение записано" : "Изъятие записано" });
    },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Касса</h1>
        <div className="flex gap-2">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setOpType("deposit"); setDialogOpen(true); }}>
                <ArrowDownToLine className="mr-2 h-4 w-4" /> Внести
              </Button>
            </DialogTrigger>
            <DialogTrigger asChild>
              <Button variant="outline" onClick={() => { setOpType("withdraw"); setDialogOpen(true); }}>
                <ArrowUpFromLine className="mr-2 h-4 w-4" /> Изъять
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{opType === "deposit" ? "Внесение денег" : "Изъятие денег"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Сумма</Label>
                  <Input type="number" placeholder="0" className="mt-1" value={amount} onChange={e => setAmount(e.target.value)} />
                </div>
                <div>
                  <Label>Причина</Label>
                  <Input placeholder="Необязательно" className="mt-1" value={reason} onChange={e => setReason(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => submitOp.mutate()} disabled={submitOp.isPending || !amount || Number(amount) <= 0} className="w-full">
                  {submitOp.isPending ? "Сохранение..." : opType === "deposit" ? "Внести деньги" : "Изъять деньги"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <SectionHelp tips={SECTION_TIPS.cash || []} />

      {/* Balance card */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Наличные в кассе</p>
          <p className="text-2xl font-bold mt-1">{activeShift ? currentCash.toLocaleString("ru") : "—"} {activeShift ? "₽" : ""}</p>
          {!activeShift && <p className="text-xs text-muted-foreground mt-1">Смена не открыта</p>}
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Касса на начало</p>
          <p className="text-2xl font-bold mt-1">{activeShift ? `${(activeShift.cash_start || 0).toLocaleString("ru")} ₽` : "—"}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Продажи наличными</p>
          <p className="text-2xl font-bold mt-1 text-emerald-600">+{cashSalesTotal.toLocaleString("ru")} ₽</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Внесения / Изъятия</p>
          <p className="text-2xl font-bold mt-1">
            <span className="text-emerald-600">+{deposits.toLocaleString("ru")}</span>
            {" / "}
            <span className="text-destructive">−{withdrawals.toLocaleString("ru")}</span>
            {" ₽"}
          </p>
        </Card>
      </div>

      {/* Operation history */}
      <Card className="card-shadow overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">История операций</h2>
        </div>
        {allCashOps.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">Нет операций</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Тип</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Сумма</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Причина</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Сотрудник</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Дата</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {allCashOps.map((op: any) => (
                  <tr key={op.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        op.type === "deposit" ? "bg-emerald-500/10 text-emerald-600" : "bg-destructive/10 text-destructive"
                      }`}>
                        {op.type === "deposit" ? <Plus className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                        {op.type === "deposit" ? "Внесение" : "Изъятие"}
                      </span>
                    </td>
                    <td className={`px-4 py-3 font-semibold ${op.type === "deposit" ? "text-emerald-600" : "text-destructive"}`}>
                      {op.type === "deposit" ? "+" : "−"}{op.amount.toLocaleString("ru")} ₽
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{op.reason || "—"}</td>
                    <td className="px-4 py-3">{getEmployeeName(op.employee_id)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(op.created_at).toLocaleString("ru")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default CashPage;
