import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Square, ChevronDown, ChevronUp } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import SectionHelp from "@/components/SectionHelp";
import { SECTION_TIPS } from "@/data/sectionTips";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useSalaryData } from "@/hooks/useSalaryData";

const ShiftsPage = () => {
  const { companyId, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [openStart, setOpenStart] = useState(false);
  const [openClose, setOpenClose] = useState<string | null>(null);
  const [cashStart, setCashStart] = useState("");
  const [cashEnd, setCashEnd] = useState("");
  const [expandedShift, setExpandedShift] = useState<string | null>(null);

  const { data: shifts = [], isLoading } = useQuery({
    queryKey: ["shifts", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("shifts")
        .select("*, profiles!shifts_employee_id_fkey(full_name)")
        .eq("company_id", companyId)
        .order("start_time", { ascending: false });
      if (error) {
        const { data: d2 } = await supabase.from("shifts").select("*").eq("company_id", companyId).order("start_time", { ascending: false });
        return d2 || [];
      }
      return data;
    },
    enabled: !!companyId,
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["shift-profiles", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase.from("profiles").select("user_id, full_name").eq("company_id", companyId);
      return data || [];
    },
    enabled: !!companyId,
  });

  // Cash operations for all shifts
  const { data: allCashOps = [] } = useQuery({
    queryKey: ["shift-cash-ops", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase.from("cash_operations").select("shift_id, type, amount").eq("company_id", companyId);
      return data || [];
    },
    enabled: !!companyId,
  });

  // Cash sales grouped by shift
  const { data: allSales = [] } = useQuery({
    queryKey: ["shift-sales-data", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase.from("sales").select("employee_id, total, payment_method, created_at").eq("company_id", companyId);
      return data || [];
    },
    enabled: !!companyId,
  });

  const getEmployeeName = (employeeId: string) => {
    const p = profiles.find((p: any) => p.user_id === employeeId);
    return p?.full_name || "—";
  };

  const getShiftCashBreakdown = (shift: any) => {
    const shiftOps = allCashOps.filter((o: any) => o.shift_id === shift.id);
    const deposits = shiftOps.filter((o: any) => o.type === "deposit").reduce((s: number, o: any) => s + o.amount, 0);
    const withdrawals = shiftOps.filter((o: any) => o.type === "withdraw").reduce((s: number, o: any) => s + o.amount, 0);
    
    // Cash sales during this shift
    const shiftCashSales = allSales
      .filter((s: any) => s.employee_id === shift.employee_id && s.payment_method === "cash" && s.created_at >= shift.start_time && (!shift.end_time || s.created_at <= shift.end_time))
      .reduce((sum: number, s: any) => sum + (s.total || 0), 0);
    
    const systemCash = (shift.cash_start || 0) + shiftCashSales + deposits - withdrawals;
    const diff = shift.cash_end != null ? (shift.cash_end - systemCash) : null;

    return { deposits, withdrawals, shiftCashSales, systemCash, diff };
  };

  const activeShift = shifts.find((s: any) => s.status === "active" && s.employee_id === user?.id);

  const openShift = useMutation({
    mutationFn: async () => {
      if (!companyId || !user) throw new Error("No company");
      const { error } = await supabase.from("shifts").insert({
        company_id: companyId,
        employee_id: user.id,
        cash_start: cashStart ? Number(cashStart) : 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      toast({ title: "Смена открыта" });
      setOpenStart(false);
      setCashStart("");
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const closeShift = useMutation({
    mutationFn: async (shiftId: string) => {
      const { error } = await supabase.from("shifts").update({
        status: "closed",
        end_time: new Date().toISOString(),
        cash_end: cashEnd ? Number(cashEnd) : null,
      }).eq("id", shiftId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      toast({ title: "Смена закрыта" });
      setOpenClose(null);
      setCashEnd("");
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Смены</h1>
        <div className="flex gap-2">
          {activeShift && (
            <Dialog open={openClose === activeShift.id} onOpenChange={(v) => setOpenClose(v ? activeShift.id : null)}>
              <DialogTrigger asChild>
                <Button variant="destructive"><Square className="mr-2 h-4 w-4" /> Закрыть смену</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Закрыть смену</DialogTitle></DialogHeader>
                <form onSubmit={(e) => { e.preventDefault(); closeShift.mutate(activeShift.id); }} className="space-y-3">
                  {(() => {
                    const bd = getShiftCashBreakdown(activeShift);
                    return (
                      <Card className="p-3 space-y-1 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">Касса на начало:</span><span className="font-medium">{(activeShift.cash_start || 0).toLocaleString("ru")} ₽</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Продажи наличными:</span><span className="font-medium text-emerald-600">+{bd.shiftCashSales.toLocaleString("ru")} ₽</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Внесения:</span><span className="font-medium text-emerald-600">+{bd.deposits.toLocaleString("ru")} ₽</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Изъятия:</span><span className="font-medium text-destructive">−{bd.withdrawals.toLocaleString("ru")} ₽</span></div>
                        <div className="flex justify-between border-t pt-1"><span className="font-semibold">Касса по системе:</span><span className="font-bold">{bd.systemCash.toLocaleString("ru")} ₽</span></div>
                      </Card>
                    );
                  })()}
                  <div><Label>Фактическая касса</Label><Input type="number" value={cashEnd} onChange={(e) => setCashEnd(e.target.value)} placeholder="0" /></div>
                  {cashEnd && (() => {
                    const bd = getShiftCashBreakdown(activeShift);
                    const diff = (Number(cashEnd) || 0) - bd.systemCash;
                    return (
                      <Card className={`p-3 ${diff === 0 ? "bg-emerald-500/10" : "bg-destructive/10"}`}>
                        <p className="text-xs text-muted-foreground">Разница</p>
                        <p className={`text-xl font-bold ${diff === 0 ? "text-emerald-600" : "text-destructive"}`}>
                          {diff > 0 ? "+" : ""}{diff.toLocaleString("ru")} ₽
                        </p>
                      </Card>
                    );
                  })()}
                  <Button type="submit" className="w-full" variant="destructive" disabled={closeShift.isPending}>
                    {closeShift.isPending ? "Закрытие..." : "Закрыть смену"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
          {!activeShift && (
            <Dialog open={openStart} onOpenChange={setOpenStart}>
              <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" /> Открыть смену</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Открыть смену</DialogTitle></DialogHeader>
                <form onSubmit={(e) => { e.preventDefault(); openShift.mutate(); }} className="space-y-3">
                  <div><Label>Касса на начало</Label><Input type="number" value={cashStart} onChange={(e) => setCashStart(e.target.value)} placeholder="0" /></div>
                  <Button type="submit" className="w-full" disabled={openShift.isPending}>
                    {openShift.isPending ? "Открытие..." : "Открыть смену"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <SectionHelp tips={SECTION_TIPS.shifts} sectionKey="shifts" />

      <Card className="card-shadow overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Загрузка...</div>
        ) : shifts.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">Нет смен. Откройте первую смену.</div>
        ) : (
          <div className="divide-y">
            {shifts.map((s: any) => {
              const bd = getShiftCashBreakdown(s);
              const isExpanded = expandedShift === s.id;
              return (
                <div key={s.id}>
                  <div
                    className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => setExpandedShift(isExpanded ? null : s.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="font-medium">{s.profiles?.full_name || getEmployeeName(s.employee_id)}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(s.start_time).toLocaleString("ru")}
                          {s.end_time ? ` — ${new Date(s.end_time).toLocaleString("ru")}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        s.status === "active" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                      }`}>
                        {s.status === "active" ? "Активна" : "Закрыта"}
                      </span>
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1">
                      <Card className="p-4 space-y-2 text-sm bg-muted/30">
                        <div className="flex justify-between"><span className="text-muted-foreground">Касса на начало:</span><span className="font-medium">{(s.cash_start || 0).toLocaleString("ru")} ₽</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Продажи наличными:</span><span className="font-medium text-emerald-600">+{bd.shiftCashSales.toLocaleString("ru")} ₽</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Внесения:</span><span className="font-medium text-emerald-600">+{bd.deposits.toLocaleString("ru")} ₽</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Изъятия:</span><span className="font-medium text-destructive">−{bd.withdrawals.toLocaleString("ru")} ₽</span></div>
                        <div className="flex justify-between border-t pt-2"><span className="font-semibold">Касса по системе:</span><span className="font-bold">{bd.systemCash.toLocaleString("ru")} ₽</span></div>
                        {s.cash_end != null && (
                          <>
                            <div className="flex justify-between"><span className="text-muted-foreground">Факт. касса:</span><span className="font-medium">{s.cash_end.toLocaleString("ru")} ₽</span></div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Разница:</span>
                              <span className={`font-semibold ${bd.diff === 0 ? "text-emerald-600" : "text-destructive"}`}>
                                {(bd.diff || 0) > 0 ? "+" : ""}{(bd.diff || 0).toLocaleString("ru")} ₽
                              </span>
                            </div>
                          </>
                        )}
                      </Card>
                      <ShiftSalaryInfo companyId={companyId!} employeeId={s.employee_id} from={s.start_time} to={s.end_time} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};

export default ShiftsPage;
