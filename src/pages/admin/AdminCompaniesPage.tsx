import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Ban, CheckCircle, Eye, Search, LogIn, Trash2 } from "lucide-react";
import { useState } from "react";
import { usePlatformAdmin } from "@/hooks/usePlatformAdmin";

const AdminCompaniesPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { adminRole } = usePlatformAdmin();
  const isFullAdmin = adminRole === "full_admin";
  const canChangePlan = adminRole === "full_admin" || adminRole === "manager";
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [impersonating, setImpersonating] = useState<string | null>(null);
  const [editLimits, setEditLimits] = useState<any>(null);

  const handleImpersonate = async (userId: string) => {
    setImpersonating(userId);
    try {
      const { data, error } = await supabase.functions.invoke("impersonate-user", {
        body: { targetUserId: userId },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(`${data.url}&redirect_to=${window.location.origin}/dashboard`, "_blank");
        toast({ title: "Сессия открыта в новой вкладке" });
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

  const { data: stores = [] } = useQuery({
    queryKey: ["admin-stores-all"],
    queryFn: async () => {
      const { data } = await supabase.from("stores").select("id, company_id");
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
      const { error } = await supabase.from("subscriptions").update({ plan, ...planLimits[plan] }).eq("company_id", companyId);
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

  const updateLimits = useMutation({
    mutationFn: async ({ companyId, limits }: { companyId: string; limits: any }) => {
      const { error } = await supabase.from("subscriptions").update(limits).eq("company_id", companyId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-subscriptions-all"] });
      setEditLimits(null);
      toast({ title: "Лимиты обновлены" });
    },
  });

  const getSub = (companyId: string) => subscriptions.find((s: any) => s.company_id === companyId);
  const getOwner = (companyId: string) => profiles.find((p: any) => p.company_id === companyId);
  const getEmployeeCount = (companyId: string) => profiles.filter((p: any) => p.company_id === companyId).length;
  const getStoreCount = (companyId: string) => stores.filter((s: any) => s.company_id === companyId).length;

  const planLabels: Record<string, string> = { start: "Старт", business: "Бизнес", premier: "Премьер" };

  const filtered = companies.filter((c: any) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Компании</h1>
          <p className="text-sm text-muted-foreground">{companies.length} зарегистрировано</p>
        </div>
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
                <tr className="border-b bg-muted/30">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Компания</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Владелец</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Магазины</th>
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
                  const owner = getOwner(c.id);
                  const isBlocked = c.is_blocked;
                  return (
                    <tr key={c.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-medium">{c.name}</td>
                      <td className="px-4 py-3">
                        <div className="text-sm">{owner?.full_name || "—"}</div>
                        <div className="text-xs text-muted-foreground">{owner?.email || ""}</div>
                      </td>
                      <td className="px-4 py-3">{getStoreCount(c.id)}</td>
                      <td className="px-4 py-3">{getEmployeeCount(c.id)}</td>
                      <td className="px-4 py-3">
                        {canChangePlan ? (
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
                        ) : (
                          <Badge variant="secondary">{planLabels[plan]}</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isBlocked ? (
                          <Badge variant="destructive">Заблокирована</Badge>
                        ) : sub?.paid ? (
                          <Badge className="bg-success/10 text-success border-0">Оплачено</Badge>
                        ) : (
                          <Badge variant="secondary">Пробный</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(c.created_at).toLocaleDateString("ru")}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setSelected(c)} title="Подробнее">
                            <Eye className="h-4 w-4" />
                          </Button>
                          {isFullAdmin && (
                            <Button
                              size="icon" variant="ghost" className="h-8 w-8"
                              onClick={() => toggleBlock.mutate({ companyId: c.id, blocked: !isBlocked })}
                              title={isBlocked ? "Разблокировать" : "Заблокировать"}
                            >
                              {isBlocked ? <CheckCircle className="h-4 w-4 text-success" /> : <Ban className="h-4 w-4 text-destructive" />}
                            </Button>
                          )}
                          {owner && (
                            <Button
                              size="icon" variant="ghost" className="h-8 w-8"
                              disabled={impersonating === owner.user_id}
                              onClick={() => handleImpersonate(owner.user_id)}
                              title="Войти как пользователь"
                            >
                              <LogIn className="h-4 w-4" />
                            </Button>
                          )}
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
            const storeCount = getStoreCount(selected.id);
            return (
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div><span className="text-muted-foreground">Владелец:</span> {owner?.full_name || "—"}</div>
                  <div><span className="text-muted-foreground">Email:</span> {owner?.email || "—"}</div>
                  <div><span className="text-muted-foreground">Телефон:</span> {selected.phone || owner?.phone || "—"}</div>
                  <div><span className="text-muted-foreground">Сотрудников:</span> {empCount}</div>
                  <div><span className="text-muted-foreground">Магазинов:</span> {storeCount}</div>
                  <div><span className="text-muted-foreground">Тариф:</span> {planLabels[sub?.plan] || "start"}</div>
                  <div><span className="text-muted-foreground">Оплата:</span> {sub?.paid ? "Да" : "Нет"}</div>
                  <div><span className="text-muted-foreground">Создана:</span> {new Date(selected.created_at).toLocaleDateString("ru")}</div>
                  <div><span className="text-muted-foreground">Адрес:</span> {selected.address || "—"}</div>
                </div>
                {canChangePlan && sub && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground mb-2">Лимиты подписки</p>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>Магазины: {sub.max_stores}</div>
                      <div>Сотрудники: {sub.max_employees > 9999 ? "∞" : sub.max_employees}</div>
                      <div>Устройства: {sub.max_devices > 9999 ? "∞" : sub.max_devices}</div>
                    </div>
                    <Button
                      size="sm" variant="outline" className="mt-2 text-xs"
                      onClick={() => setEditLimits({ companyId: selected.id, max_stores: sub.max_stores, max_employees: sub.max_employees, max_devices: sub.max_devices })}
                    >
                      Изменить лимиты
                    </Button>
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Edit limits dialog */}
      <Dialog open={!!editLimits} onOpenChange={() => setEditLimits(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Изменить лимиты</DialogTitle></DialogHeader>
          {editLimits && (
            <div className="space-y-3">
              <div>
                <Label>Макс. магазинов</Label>
                <Input type="number" value={editLimits.max_stores} onChange={(e) => setEditLimits({ ...editLimits, max_stores: parseInt(e.target.value) || 1 })} />
              </div>
              <div>
                <Label>Макс. сотрудников</Label>
                <Input type="number" value={editLimits.max_employees} onChange={(e) => setEditLimits({ ...editLimits, max_employees: parseInt(e.target.value) || 2 })} />
              </div>
              <div>
                <Label>Макс. устройств</Label>
                <Input type="number" value={editLimits.max_devices} onChange={(e) => setEditLimits({ ...editLimits, max_devices: parseInt(e.target.value) || 30 })} />
              </div>
              <Button onClick={() => updateLimits.mutate({
                companyId: editLimits.companyId,
                limits: { max_stores: editLimits.max_stores, max_employees: editLimits.max_employees, max_devices: editLimits.max_devices },
              })}>
                Сохранить
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCompaniesPage;
