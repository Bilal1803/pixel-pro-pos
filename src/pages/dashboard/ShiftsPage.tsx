import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Square } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const ShiftsPage = () => {
  const { companyId, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [openStart, setOpenStart] = useState(false);
  const [openClose, setOpenClose] = useState<string | null>(null);
  const [cashStart, setCashStart] = useState("");
  const [cashEnd, setCashEnd] = useState("");

  const { data: shifts = [], isLoading } = useQuery({
    queryKey: ["shifts", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("shifts")
        .select("*, profiles!shifts_employee_id_fkey(full_name)")
        .eq("company_id", companyId)
        .order("start_time", { ascending: false });
      // If join fails, fallback without join
      if (error) {
        const { data: d2 } = await supabase.from("shifts").select("*").eq("company_id", companyId).order("start_time", { ascending: false });
        return d2 || [];
      }
      return data;
    },
    enabled: !!companyId,
  });

  // Get profiles to map employee names
  const { data: profiles = [] } = useQuery({
    queryKey: ["shift-profiles", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase.from("profiles").select("user_id, full_name").eq("company_id", companyId);
      return data || [];
    },
    enabled: !!companyId,
  });

  const getEmployeeName = (employeeId: string) => {
    const p = profiles.find((p: any) => p.user_id === employeeId);
    return p?.full_name || "—";
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
                  <div><Label>Касса на конец смены</Label><Input type="number" value={cashEnd} onChange={(e) => setCashEnd(e.target.value)} placeholder="0" /></div>
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

      <Card className="card-shadow overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Загрузка...</div>
        ) : shifts.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">Нет смен. Откройте первую смену.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Сотрудник</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Начало</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Конец</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Касса (начало)</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Касса (конец)</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Статус</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {shifts.map((s: any) => (
                  <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{s.profiles?.full_name || getEmployeeName(s.employee_id)}</td>
                    <td className="px-4 py-3">{new Date(s.start_time).toLocaleString("ru")}</td>
                    <td className="px-4 py-3">{s.end_time ? new Date(s.end_time).toLocaleString("ru") : "—"}</td>
                    <td className="px-4 py-3">{s.cash_start != null ? `${s.cash_start} ₽` : "—"}</td>
                    <td className="px-4 py-3">{s.cash_end != null ? `${s.cash_end} ₽` : "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        s.status === "active" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                      }`}>
                        {s.status === "active" ? "Активна" : "Закрыта"}
                      </span>
                    </td>
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

export default ShiftsPage;
