import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Plus, Loader2, Award, AlertTriangle, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";

export const SalaryBonusCard = ({ employeeId, companyId }: { employeeId: string; companyId: string }) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"bonus" | "penalty">("bonus");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  const { data: bonuses = [] } = useQuery({
    queryKey: ["salary-bonuses", companyId, employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("salary_bonuses")
        .select("*")
        .eq("company_id", companyId)
        .eq("employee_id", employeeId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId && !!employeeId,
  });

  const createBonus = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("salary_bonuses").insert({
        company_id: companyId,
        employee_id: employeeId,
        type,
        amount: Number(amount),
        reason: reason || null,
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["salary-bonuses", companyId, employeeId] });
      toast.success(type === "bonus" ? "Премия начислена" : "Штраф начислен");
      setOpen(false);
      setAmount("");
      setReason("");
    },
    onError: () => toast.error("Ошибка"),
  });

  const deleteBonus = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("salary_bonuses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["salary-bonuses", companyId, employeeId] });
      toast.success("Удалено");
    },
  });

  const totalBonuses = bonuses.filter((b: any) => b.type === "bonus").reduce((s: number, b: any) => s + b.amount, 0);
  const totalPenalties = bonuses.filter((b: any) => b.type === "penalty").reduce((s: number, b: any) => s + b.amount, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex gap-3 text-sm">
          <span className="text-emerald-600 font-medium">Премии: +{totalBonuses.toLocaleString("ru")} ₽</span>
          <span className="text-destructive font-medium">Штрафы: −{totalPenalties.toLocaleString("ru")} ₽</span>
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setType("bonus"); setOpen(true); }}>
            <Award className="h-3 w-3 mr-1" /> Премия
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setType("penalty"); setOpen(true); }}>
            <AlertTriangle className="h-3 w-3 mr-1" /> Штраф
          </Button>
        </div>
      </div>

      {bonuses.length > 0 && (
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {bonuses.map((b: any) => (
            <div key={b.id} className="flex items-center justify-between p-2 rounded border text-sm">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Badge variant={b.type === "bonus" ? "default" : "destructive"} className="text-[10px]">
                    {b.type === "bonus" ? "Премия" : "Штраф"}
                  </Badge>
                  <span className={`font-medium ${b.type === "bonus" ? "text-emerald-600" : "text-destructive"}`}>
                    {b.type === "bonus" ? "+" : "−"}{b.amount.toLocaleString("ru")} ₽
                  </span>
                </div>
                {b.reason && <p className="text-xs text-muted-foreground mt-0.5 truncate">{b.reason}</p>}
                <p className="text-[10px] text-muted-foreground">{format(parseISO(b.created_at), "d MMM HH:mm", { locale: ru })}</p>
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => deleteBonus.mutate(b.id)}>
                <Trash2 className="h-3 w-3 text-muted-foreground" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{type === "bonus" ? "Начислить премию" : "Начислить штраф"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Сумма *</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className="mt-1" />
            </div>
            <div>
              <Label>Причина</Label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={type === "bonus" ? "Выполнение плана" : "Ошибка в продаже"} className="mt-1" />
            </div>
            <Button className="w-full" disabled={!amount || createBonus.isPending} onClick={() => createBonus.mutate()}>
              {createBonus.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {type === "bonus" ? "Начислить премию" : "Начислить штраф"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
