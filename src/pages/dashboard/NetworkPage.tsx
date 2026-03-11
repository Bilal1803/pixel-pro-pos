import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Store, MapPin, Smartphone, DollarSign, TrendingUp, ArrowRight, Plus, Pencil, Trash2, UserPlus, Copy, UserX } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useStoreContext } from "@/contexts/StoreContext";
import { useSubscription } from "@/hooks/useSubscription";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { toast } from "sonner";

const NetworkPage = () => {
  const { companyId, user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { stores, activeStoreId, setActiveStoreId } = useStoreContext();
  const { subscription } = useSubscription();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", address: "", phone: "" });
  const [editingStore, setEditingStore] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", address: "", phone: "" });
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteStoreId, setDeleteStoreId] = useState<string | null>(null);

  // Employee management state
  const [employeesStoreId, setEmployeesStoreId] = useState<string | null>(null);
  const [inviteForm, setInviteForm] = useState({ fullName: "", phone: "", role: "employee" });
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const canAddStore = stores.length < (subscription?.max_stores ?? 1);

  const handleAddStore = async () => {
    if (!companyId || !form.name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("stores").insert({
      company_id: companyId,
      name: form.name.trim(),
      address: form.address.trim() || null,
      phone: form.phone.trim() || null,
    });
    setSaving(false);
    if (error) {
      toast.error("Не удалось создать магазин");
      return;
    }
    toast.success("Магазин добавлен");
    setForm({ name: "", address: "", phone: "" });
    setDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ["stores"] });
  };

  const openEditDialog = (store: { id: string; name: string; address: string | null; phone: string | null }) => {
    setEditingStore(store.id);
    setEditForm({ name: store.name, address: store.address || "", phone: store.phone || "" });
    setEditDialogOpen(true);
  };

  const handleEditStore = async () => {
    if (!editingStore || !editForm.name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("stores").update({
      name: editForm.name.trim(),
      address: editForm.address.trim() || null,
      phone: editForm.phone.trim() || null,
    }).eq("id", editingStore);
    setSaving(false);
    if (error) {
      toast.error("Не удалось обновить магазин");
      return;
    }
    toast.success("Магазин обновлён");
    setEditDialogOpen(false);
    setEditingStore(null);
    queryClient.invalidateQueries({ queryKey: ["stores"] });
  };

  const handleDeleteStore = async () => {
    if (!deleteStoreId) return;
    const { error } = await supabase.from("stores").delete().eq("id", deleteStoreId);
    if (error) {
      toast.error("Не удалось удалить магазин. Возможно, к нему привязаны данные.");
      return;
    }
    toast.success("Магазин удалён");
    setDeleteStoreId(null);
    if (deleteStoreId === activeStoreId) setActiveStoreId(null);
    queryClient.invalidateQueries({ queryKey: ["stores"] });
  };

  

  const { data: devices = [] } = useQuery({
    queryKey: ["network-devices", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase.from("devices").select("id, store_id, status, sale_price").eq("company_id", companyId);
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: sales = [] } = useQuery({
    queryKey: ["network-sales", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase.from("sales").select("id, store_id, total, created_at, sale_items(price, cost_price)").eq("company_id", companyId);
      return data || [];
    },
    enabled: !!companyId,
  });

  // Profiles for employees per store
  const { data: profiles = [] } = useQuery({
    queryKey: ["network-profiles", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase.from("profiles").select("*").eq("company_id", companyId);
      return data || [];
    },
    enabled: !!companyId,
  });

  const profileUserIds = profiles.map((p: any) => p.user_id);
  const { data: roles = [] } = useQuery({
    queryKey: ["network-roles", profileUserIds],
    queryFn: async () => {
      if (profileUserIds.length === 0) return [];
      const { data } = await supabase.from("user_roles").select("*").in("user_id", profileUserIds);
      return data || [];
    },
    enabled: profileUserIds.length > 0,
  });

  const getRoleForUser = (userId: string) => {
    const r = roles.find((r: any) => r.user_id === userId);
    return r?.role || "employee";
  };

  const roleLabels: Record<string, string> = { owner: "Владелец", manager: "Менеджер", employee: "Сотрудник" };

  const getStoreEmployees = (storeId: string) => profiles.filter((p: any) => p.store_id === storeId);

  // Create invitation for a specific store
  const createInvitation = useMutation({
    mutationFn: async (storeId: string) => {
      if (!companyId || !user) throw new Error("Не авторизован");
      const { data, error } = await supabase
        .from("invitations")
        .insert({
          company_id: companyId,
          full_name: inviteForm.fullName,
          phone: inviteForm.phone || null,
          role: inviteForm.role as any,
          store_id: storeId,
          created_by: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
      setInviteLink(data.code);
      toast.success("Приглашение создано");
    },
    onError: (e: any) => {
      toast.error(e.message);
    },
  });

  // Deactivate employee
  const deactivateEmployee = useMutation({
    mutationFn: async (targetUserId: string) => {
      const { data, error } = await supabase.functions.invoke("manage-employee", {
        body: { action: "deactivate", targetUserId },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["network-profiles"] });
      toast.success("Доступ отключён");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Код скопирован");
  };

  const handleInviteSubmit = () => {
    if (!inviteForm.fullName || !employeesStoreId) return;
    createInvitation.mutate(employeesStoreId);
  };

  const handleInviteClose = () => {
    setInviteOpen(false);
    setInviteLink(null);
    setInviteForm({ fullName: "", phone: "", role: "employee" });
  };

  const storeStats = stores.map((store) => {
    const storeDevices = devices.filter((d) => d.store_id === store.id);
    const storeSales = sales.filter((s) => s.store_id === store.id);
    const revenue = storeSales.reduce((sum, s) => sum + (s.total || 0), 0);
    const profit = storeSales.reduce((sum, s) => {
      return sum + (s.sale_items || []).reduce((p: number, i: any) => p + ((i.price || 0) - (i.cost_price || 0)), 0);
    }, 0);
    const inStock = storeDevices.filter((d) => ["available", "testing", "reserved"].includes(d.status)).length;

    return {
      ...store,
      revenue,
      profit,
      salesCount: storeSales.length,
      inStock,
      avgCheck: storeSales.length > 0 ? Math.round(revenue / storeSales.length) : 0,
    };
  });

  const totalRevenue = storeStats.reduce((s, st) => s + st.revenue, 0);
  const totalProfit = storeStats.reduce((s, st) => s + st.profit, 0);
  const totalSales = storeStats.reduce((s, st) => s + st.salesCount, 0);
  const totalStock = storeStats.reduce((s, st) => s + st.inStock, 0);

  const chartData = storeStats.map((s) => ({
    name: s.name.length > 12 ? s.name.slice(0, 12) + "…" : s.name,
    revenue: s.revenue,
    profit: s.profit,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Сеть магазинов</h1>
        <div className="flex items-center gap-2">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" disabled={!canAddStore}>
                <Plus className="h-4 w-4 mr-1" />
                Добавить магазин
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Новый магазин</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Название *</Label>
                  <Input
                    placeholder="Например: ТЦ Мега"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Адрес</Label>
                  <Input
                    placeholder="ул. Примерная, 1"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Телефон</Label>
                  <Input
                    placeholder="+7 999 123-45-67"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                {!canAddStore && (
                  <p className="text-sm text-destructive">
                    Лимит магазинов ({subscription?.max_stores}) достигнут. Повысьте тариф.
                  </p>
                )}
                <Button className="w-full" onClick={handleAddStore} disabled={saving || !form.name.trim() || !canAddStore}>
                  {saving ? "Сохранение…" : "Создать магазин"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline" size="sm" onClick={() => navigate("/dashboard/comparison")}>
            Сравнение
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Network KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Выручка сети", value: `${totalRevenue.toLocaleString("ru")} ₽`, icon: DollarSign },
          { label: "Прибыль сети", value: `${totalProfit.toLocaleString("ru")} ₽`, icon: TrendingUp },
          { label: "Продаж всего", value: `${totalSales}`, icon: Store },
          { label: "На складах", value: `${totalStock}`, icon: Smartphone },
        ].map((s) => (
          <Card key={s.label} className="p-5 card-shadow">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{s.label}</span>
              <s.icon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="mt-2 text-2xl font-bold">{s.value}</div>
          </Card>
        ))}
      </div>

      {/* Chart */}
      {chartData.length > 1 && (
        <Card className="p-5 card-shadow">
          <h3 className="font-semibold mb-4">Топ магазинов по выручке и прибыли</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="name" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip
                formatter={(value: number) => `${value.toLocaleString("ru")} ₽`}
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
              />
              <Bar dataKey="revenue" fill="hsl(var(--primary))" name="Выручка" radius={[4, 4, 0, 0]} />
              <Bar dataKey="profit" fill="hsl(var(--success))" name="Прибыль" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Store cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {storeStats.map((store) => {
          const storeEmployees = getStoreEmployees(store.id);
          return (
            <Card key={store.id} className="card-shadow hover:card-shadow-hover transition-shadow relative group">
              {/* Header with actions */}
              <div className="p-5 pb-3">
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(store)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  {stores.length > 1 && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteStoreId(store.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>

                <div className="flex items-start justify-between mb-3 cursor-pointer" onClick={() => { setActiveStoreId(store.id); navigate("/dashboard"); }}>
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                      <Store className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">{store.name}</h3>
                      {store.address && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />{store.address}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">{store.inStock} шт.</Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-muted-foreground text-xs">Выручка</p><p className="font-semibold">{store.revenue.toLocaleString("ru")} ₽</p></div>
                  <div><p className="text-muted-foreground text-xs">Прибыль</p><p className="font-semibold">{store.profit.toLocaleString("ru")} ₽</p></div>
                  <div><p className="text-muted-foreground text-xs">Продажи</p><p className="font-semibold">{store.salesCount}</p></div>
                  <div><p className="text-muted-foreground text-xs">Ср. чек</p><p className="font-semibold">{store.avgCheck.toLocaleString("ru")} ₽</p></div>
                </div>
              </div>

              {/* Employees section */}
              <div className="border-t px-5 py-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Сотрудники ({storeEmployees.length})</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEmployeesStoreId(store.id);
                      setInviteOpen(true);
                    }}
                  >
                    <UserPlus className="h-3.5 w-3.5 mr-1" />Пригласить
                  </Button>
                </div>
                {storeEmployees.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Нет привязанных сотрудников</p>
                ) : (
                  <div className="space-y-1.5">
                    {storeEmployees.map((emp: any) => {
                      const role = getRoleForUser(emp.user_id);
                      const isOwner = role === "owner";
                      const isSelf = emp.user_id === user?.id;
                      return (
                        <div key={emp.id} className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-accent/50 transition-colors">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                              {(emp.full_name || "?")[0].toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{emp.full_name}</p>
                              <p className="text-xs text-muted-foreground">{roleLabels[role]}</p>
                            </div>
                          </div>
                          {!isOwner && !isSelf && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                deactivateEmployee.mutate(emp.user_id);
                              }}
                            >
                              <UserX className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Edit dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактировать магазин</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Название *</Label>
              <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Адрес</Label>
              <Input value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Телефон</Label>
              <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
            </div>
            <Button className="w-full" onClick={handleEditStore} disabled={saving || !editForm.name.trim()}>
              {saving ? "Сохранение…" : "Сохранить"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteStoreId} onOpenChange={(open) => !open && setDeleteStoreId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить магазин?</AlertDialogTitle>
            <AlertDialogDescription>
              Все связанные данные останутся в системе, но будут отвязаны от этого магазина.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteStore} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Invite employee to store dialog */}
      <Dialog open={inviteOpen} onOpenChange={(v) => { if (!v) handleInviteClose(); else setInviteOpen(true); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{inviteLink ? "Приглашение создано" : "Пригласить сотрудника"}</DialogTitle>
          </DialogHeader>
          {inviteLink ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Отправьте сотруднику эту ссылку. Она действует 24 часа.</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-muted px-3 py-2 text-xs font-mono break-all">{inviteLink}</code>
                <Button variant="outline" size="icon" onClick={() => copyLink(inviteLink)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <DialogFooter>
                <Button onClick={handleInviteClose}>Закрыть</Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label>Имя *</Label>
                <Input value={inviteForm.fullName} onChange={(e) => setInviteForm({ ...inviteForm, fullName: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>Телефон</Label>
                <Input value={inviteForm.phone} onChange={(e) => setInviteForm({ ...inviteForm, phone: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>Роль</Label>
                <Select value={inviteForm.role} onValueChange={(v) => setInviteForm({ ...inviteForm, role: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Сотрудник</SelectItem>
                    <SelectItem value="manager">Менеджер</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button onClick={handleInviteSubmit} disabled={createInvitation.isPending || !inviteForm.fullName}>
                  {createInvitation.isPending ? "Создание..." : "Создать приглашение"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NetworkPage;
