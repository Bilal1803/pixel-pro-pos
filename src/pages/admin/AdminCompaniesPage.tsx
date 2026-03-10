import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Building2, Ban, CheckCircle, Trash2, Eye, Search, LogIn } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useToast as useToast2 } from "@/hooks/use-toast";

const AdminCompaniesPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [impersonating, setImpersonating] = useState<string | null>(null);

  const handleImpersonate = async (userId: string) => {
    setImpersonating(userId);
    try {
      const { data, error } = await supabase.functions.invoke("impersonate-user", {
        body: { targetUserId: userId },
      });
      if (error) throw error;
      if (data?.url) {
        const redirectUrl = `${data.url}&redirect_to=${window.location.origin}/dashboard`;
        window.open(redirectUrl, "_blank");
        toast({ title: "Сессия пользователя открыта в новой вкладке" });
      }
    } catch (err: any) {
      toast({ title: "Ошибка", description: err.message, variant: "destructive" });
    } finally {
      setImpersonating(null);
    }
  };

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ["admin-companies"],
    queryFn: async () => {
      const { data } = await supabase.from("companies").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ["admin-subscriptions-all"],
    queryFn: async () => {
      const { data } = await supabase.from("subscriptions").select("*");
      return data || [];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*");
      return data || [];
    },
  });

  const updatePlan = useMutation({
    mutationFn: async ({ companyId, plan }: { companyId: string; plan: string }) => {
      const planLimits: Record<string, any> = {
        start: { max_stores: 1, max_employees: 2, max_devices: 30, repairs_enabled: false, ai_enabled: false },
        business: { max_stores: 3, max_employees: 20, max_devices: 200, repairs_enabled: true, ai_enabled: true },
        premier: { max_stores: 10, max_employees: 999999, max_devices: 999999, repairs_enabled: true, ai_enabled: true },
      };
      const limits = planLimits[plan];
      const { error } = await supabase.from("subscriptions").update({ plan, ...limits }).eq("company_id", companyId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-subscriptions-all"] });
      toast({ title: "Тариф обновлён" });
    },
  });

  const toggleBlock = useMutation({
    mutationFn: async ({ companyId, blocked }: { companyId: string; blocked: boolean }) => {
      const { error } = await supabase.from("companies").update({ is_blocked: blocked } as any).eq("id", companyId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-companies"] });
      toast({ title: "Статус обновлён" });
    },
  });

  const getSub = (companyId: string) => subscriptions.find((s: any) => s.company_id === companyId);
  const getOwner = (companyId: string) => profiles.find((p: any) => p.company_id === companyId);
  const getEmployeeCount = (companyId: string) => profiles.filter((p: any) => p.company_id === companyId).length;

  const planLabels: Record<string, { label: string; className: string }> = {
    start: { label: "Старт", className: "bg-muted text-muted-foreground" },
    business: { label: "Бизнес", className: "bg-primary/10 text-primary" },
    premier: { label: "Премьер", className: "bg-warning/10 text-warning" },
  };

  const filtered = companies.filter((c: any) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Компании</h1>
        <Badge variant="secondary">{companies.length} всего</Badge>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Поиск по названию..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Загрузка...</div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Компания</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Владелец</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Сотрудники</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Тариф</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Статус</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Дата</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Действия</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c: any) => {
                  const sub = getSub(c.id);
                  const plan = sub?.plan || "start";
                  const pl = planLabels[plan] || planLabels.start;
                  const owner = getOwner(c.id);
                  const isBlocked = c.is_blocked;
                  return (
                    <tr key={c.id} className="border-b last:border-0">
                      <td className="px-4 py-3 font-medium">{c.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <div>{owner?.full_name || "—"}</div>
                        <div className="text-xs">{owner?.email || ""}</div>
                      </td>
                      <td className="px-4 py-3">{getEmployeeCount(c.id)}</td>
                      <td className="px-4 py-3">
                        <Select value={plan} onValueChange={(v) => updatePlan.mutate({ companyId: c.id, plan: v })}>
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
                        {isBlocked ? (
                          <Badge variant="destructive">Заблокирована</Badge>
                        ) : sub?.paid ? (
                          <Badge className="bg-success/10 text-success">Оплачено</Badge>
                        ) : (
                          <Badge variant="secondary">Пробный</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{new Date(c.created_at).toLocaleDateString("ru")}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setSelected(c)} title="Подробнее">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => toggleBlock.mutate({ companyId: c.id, blocked: !isBlocked })}
                            title={isBlocked ? "Разблокировать" : "Заблокировать"}
                          >
                            {isBlocked ? <CheckCircle className="h-4 w-4 text-success" /> : <Ban className="h-4 w-4 text-destructive" />}
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

      {/* Company detail dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selected?.name}</DialogTitle>
          </DialogHeader>
          {selected && (() => {
            const sub = getSub(selected.id);
            const owner = getOwner(selected.id);
            const empCount = getEmployeeCount(selected.id);
            return (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-muted-foreground">Владелец:</span> {owner?.full_name || "—"}</div>
                  <div><span className="text-muted-foreground">Email:</span> {owner?.email || "—"}</div>
                  <div><span className="text-muted-foreground">Телефон:</span> {selected.phone || owner?.phone || "—"}</div>
                  <div><span className="text-muted-foreground">Сотрудников:</span> {empCount}</div>
                  <div><span className="text-muted-foreground">Тариф:</span> {sub?.plan || "start"}</div>
                  <div><span className="text-muted-foreground">Оплата:</span> {sub?.paid ? "Да" : "Нет"}</div>
                  <div><span className="text-muted-foreground">Создана:</span> {new Date(selected.created_at).toLocaleDateString("ru")}</div>
                  <div><span className="text-muted-foreground">Адрес:</span> {selected.address || "—"}</div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCompaniesPage;
