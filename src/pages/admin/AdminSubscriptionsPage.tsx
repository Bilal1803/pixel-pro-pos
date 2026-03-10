import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CalendarPlus, CheckCircle, Clock } from "lucide-react";

const AdminSubscriptionsPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [trialDialog, setTrialDialog] = useState<{ id: string; companyName: string } | null>(null);
  const [trialDays, setTrialDays] = useState("7");

  const { data: subscriptions = [], isLoading } = useQuery({
    queryKey: ["admin-subs"],
    queryFn: async () => {
      const { data } = await supabase.from("subscriptions").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["admin-companies-sub"],
    queryFn: async () => {
      const { data } = await supabase.from("companies").select("id, name");
      return data || [];
    },
  });

  const companyMap = Object.fromEntries(companies.map((c: any) => [c.id, c.name]));

  const updatePlan = useMutation({
    mutationFn: async ({ id, plan }: { id: string; plan: string }) => {
      const planLimits: Record<string, any> = {
        start: { max_stores: 1, max_employees: 2, max_devices: 30, repairs_enabled: false, ai_enabled: false },
        business: { max_stores: 3, max_employees: 20, max_devices: 200, repairs_enabled: true, ai_enabled: true },
        premier: { max_stores: 10, max_employees: 999999, max_devices: 999999, repairs_enabled: true, ai_enabled: true },
      };
      const { error } = await supabase.from("subscriptions").update({ plan, ...planLimits[plan] }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-subs"] });
      toast({ title: "Подписка обновлена" });
    },
  });

  const activatePaid = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("subscriptions").update({ paid: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-subs"] });
      toast({ title: "Оплата активирована" });
    },
  });

  const extendTrial = useMutation({
    mutationFn: async ({ id, days }: { id: string; days: number }) => {
      const newEnd = new Date();
      newEnd.setDate(newEnd.getDate() + days);
      const { error } = await supabase.from("subscriptions").update({ trial_ends_at: newEnd.toISOString(), paid: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-subs"] });
      setTrialDialog(null);
      toast({ title: `Пробный период продлён на ${trialDays} дн.` });
    },
  });

  const planLabels: Record<string, string> = { start: "Старт", business: "Бизнес", premier: "Премьер" };

  const getTrialStatus = (s: any) => {
    if (s.paid) return { label: "Оплачено", variant: "default" as const, expired: false };
    if (!s.trial_ends_at) return { label: "Нет триала", variant: "secondary" as const, expired: false };
    const end = new Date(s.trial_ends_at);
    if (end < new Date()) return { label: "Истёк", variant: "destructive" as const, expired: true };
    const daysLeft = Math.ceil((end.getTime() - Date.now()) / 86400000);
    return { label: `${daysLeft} дн.`, variant: "outline" as const, expired: false };
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Подписки</h1>

      {isLoading ? (
        <div className="text-muted-foreground">Загрузка...</div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Компания</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Тариф</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Статус</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Магазины</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Сотр.</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Устр.</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Тариф</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Действия</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((s: any) => {
                  const status = getTrialStatus(s);
                  return (
                    <tr key={s.id} className="border-b last:border-0">
                      <td className="px-4 py-3 font-medium">{companyMap[s.company_id] || s.company_id}</td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary">{planLabels[s.plan] || s.plan}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={status.variant}>
                          {status.expired ? <Clock className="h-3 w-3 mr-1" /> : null}
                          {status.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">{s.max_stores}</td>
                      <td className="px-4 py-3">{s.max_employees > 9999 ? "∞" : s.max_employees}</td>
                      <td className="px-4 py-3">{s.max_devices > 9999 ? "∞" : s.max_devices}</td>
                      <td className="px-4 py-3">
                        <Select value={s.plan} onValueChange={(v) => updatePlan.mutate({ id: s.id, plan: v })}>
                          <SelectTrigger className="w-28 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="start">Старт</SelectItem>
                            <SelectItem value="business">Бизнес</SelectItem>
                            <SelectItem value="premier">Премьер</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {!s.paid && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs gap-1"
                              onClick={() => activatePaid.mutate(s.id)}
                            >
                              <CheckCircle className="h-3 w-3" />
                              Оплачено
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs gap-1"
                            onClick={() => {
                              setTrialDays("7");
                              setTrialDialog({ id: s.id, companyName: companyMap[s.company_id] || "Компания" });
                            }}
                          >
                            <CalendarPlus className="h-3 w-3" />
                            Триал
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Dialog open={!!trialDialog} onOpenChange={() => setTrialDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Продлить пробный период</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Компания: <strong>{trialDialog?.companyName}</strong></p>
          <div className="space-y-2">
            <Label>Количество дней</Label>
            <Input type="number" min="1" max="365" value={trialDays} onChange={(e) => setTrialDays(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTrialDialog(null)}>Отмена</Button>
            <Button onClick={() => trialDialog && extendTrial.mutate({ id: trialDialog.id, days: parseInt(trialDays) || 7 })}>
              Продлить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSubscriptionsPage;
