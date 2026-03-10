import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SectionHelp from "@/components/SectionHelp";
import { SECTION_TIPS } from "@/data/sectionTips";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Plus, Copy, MoreVertical, Pencil, Trash2, RefreshCw, UserX } from "lucide-react";
import { format } from "date-fns";

const roleLabels: Record<string, string> = {
  owner: "Владелец",
  manager: "Менеджер",
  employee: "Сотрудник",
};

const EmployeesPage = () => {
  const { companyId, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ fullName: "", phone: "", role: "employee", storeId: "" });
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  // Edit state
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ fullName: "", phone: "", role: "employee", userId: "" });

  // Delete state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ userId: string; name: string } | null>(null);

  // Invite link dialog
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkDialogUrl, setLinkDialogUrl] = useState("");

  // Stores
  const { data: stores = [] } = useQuery({
    queryKey: ["stores", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase.from("stores").select("id, name").eq("company_id", companyId);
      return data || [];
    },
    enabled: !!companyId,
  });

  // Profiles
  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["employees", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  // Roles
  const userIds = profiles.map((p: any) => p.user_id);
  const { data: roles = [] } = useQuery({
    queryKey: ["employee-roles", userIds],
    queryFn: async () => {
      if (userIds.length === 0) return [];
      const { data } = await supabase.from("user_roles").select("*").in("user_id", userIds);
      return data || [];
    },
    enabled: userIds.length > 0,
  });

  // Invitations
  const { data: invitations = [] } = useQuery({
    queryKey: ["invitations", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase
        .from("invitations")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!companyId,
  });

  const getRoleForUser = (userId: string) => {
    const r = roles.find((r: any) => r.user_id === userId);
    return r?.role || "employee";
  };

  const getStoreName = (storeId: string | null) => {
    if (!storeId) return "—";
    const store = stores.find((s: any) => s.id === storeId);
    return store?.name || "—";
  };

  const getInviteUrl = (code: string) => {
    return `https://t.me/filtercrm_bot/app?startapp=invite_${code}`;
  };

  // Create invitation
  const createInvitation = useMutation({
    mutationFn: async () => {
      if (!companyId || !user) throw new Error("Не авторизован");
      const { data, error } = await supabase
        .from("invitations")
        .insert({
          company_id: companyId,
          full_name: form.fullName,
          phone: form.phone || null,
          role: form.role as any,
          store_id: form.storeId || null,
          created_by: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
      const url = getInviteUrl(data.code);
      setInviteLink(url);
      toast({ title: "Приглашение создано" });
    },
    onError: (e: any) => {
      toast({ title: "Ошибка", description: e.message, variant: "destructive" });
    },
  });

  // Regenerate invite link
  const regenerateLink = useMutation({
    mutationFn: async (invitationId: string) => {
      if (!companyId || !user) throw new Error("Не авторизован");
      // Find the invitation to copy its data
      const inv = invitations.find((i: any) => i.id === invitationId);
      if (!inv) throw new Error("Приглашение не найдено");

      // Mark old one as expired
      await supabase.from("invitations").update({ status: "expired" }).eq("id", invitationId);

      // Create new one
      const { data, error } = await supabase
        .from("invitations")
        .insert({
          company_id: companyId,
          full_name: inv.full_name,
          phone: inv.phone,
          role: inv.role,
          store_id: inv.store_id,
          created_by: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
      const url = getInviteUrl(data.code);
      setLinkDialogUrl(url);
      setLinkDialogOpen(true);
      toast({ title: "Новая ссылка создана" });
    },
    onError: (e: any) => {
      toast({ title: "Ошибка", description: e.message, variant: "destructive" });
    },
  });

  const updateEmployee = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("manage-employee", {
        body: {
          action: "update",
          targetUserId: editForm.userId,
          fullName: editForm.fullName,
          phone: editForm.phone || null,
          role: editForm.role,
        },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["employee-roles"] });
      setEditOpen(false);
      toast({ title: "Сотрудник обновлён" });
    },
    onError: (e: any) => {
      toast({ title: "Ошибка", description: e.message, variant: "destructive" });
    },
  });

  const deleteEmployee = useMutation({
    mutationFn: async (targetUserId: string) => {
      const { data, error } = await supabase.functions.invoke("manage-employee", {
        body: { action: "delete", targetUserId },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["employee-roles"] });
      setDeleteOpen(false);
      setDeleteTarget(null);
      toast({ title: "Сотрудник удалён" });
    },
    onError: (e: any) => {
      toast({ title: "Ошибка", description: e.message, variant: "destructive" });
    },
  });

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
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast({ title: "Доступ отключён" });
    },
    onError: (e: any) => {
      toast({ title: "Ошибка", description: e.message, variant: "destructive" });
    },
  });

  const handleCreateSubmit = () => {
    if (!form.fullName) return;
    createInvitation.mutate();
  };

  const handleCreateClose = () => {
    setCreateOpen(false);
    setInviteLink(null);
    setForm({ fullName: "", phone: "", role: "employee", storeId: "" });
  };

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({ title: "Ссылка скопирована" });
  };

  const openEdit = (profile: any) => {
    const role = getRoleForUser(profile.user_id);
    setEditForm({
      fullName: profile.full_name || "",
      phone: profile.phone || "",
      role,
      userId: profile.user_id,
    });
    setEditOpen(true);
  };

  const openDelete = (profile: any) => {
    setDeleteTarget({ userId: profile.user_id, name: profile.full_name });
    setDeleteOpen(true);
  };

  // Pending invitations (not yet used)
  const pendingInvitations = invitations.filter(
    (i: any) => i.status === "pending" && new Date(i.expires_at) > new Date()
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Сотрудники</h1>
        <Dialog open={createOpen} onOpenChange={(v) => { if (!v) handleCreateClose(); else setCreateOpen(true); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" />Пригласить</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{inviteLink ? "Приглашение создано" : "Новый сотрудник"}</DialogTitle>
            </DialogHeader>
            {inviteLink ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Отправьте сотруднику эту ссылку. Она действует 24 часа и может быть использована один раз.
                </p>
                <div>
                  <Label>Ссылка-приглашение</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 rounded bg-muted px-3 py-2 text-xs font-mono break-all">{inviteLink}</code>
                    <Button variant="outline" size="icon" onClick={() => copyLink(inviteLink)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleCreateClose}>Закрыть</Button>
                </DialogFooter>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label>Имя *</Label>
                  <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label>Телефон</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label>Роль</Label>
                  <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employee">Сотрудник</SelectItem>
                      <SelectItem value="manager">Менеджер</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Магазин</Label>
                  <Select value={form.storeId} onValueChange={(v) => setForm({ ...form, storeId: v })}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Выберите магазин" /></SelectTrigger>
                    <SelectContent>
                      {stores.map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button onClick={handleCreateSubmit} disabled={createInvitation.isPending || !form.fullName}>
                    {createInvitation.isPending ? "Создание..." : "Создать приглашение"}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <SectionHelp tips={SECTION_TIPS.employees} />

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">Ожидают подключения</h2>
          <div className="space-y-2">
            {pendingInvitations.map((inv: any) => (
              <div key={inv.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium text-sm">{inv.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {roleLabels[inv.role] || inv.role} • до {format(new Date(inv.expires_at), "dd.MM HH:mm")}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyLink(getInviteUrl(inv.code))}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => regenerateLink.mutate(inv.id)}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Employees Table */}
      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground">Загрузка...</div>
      ) : profiles.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">Нет сотрудников</div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Имя</TableHead>
                <TableHead>Магазин</TableHead>
                <TableHead>Роль</TableHead>
                <TableHead>Дата</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.map((e: any) => {
                const role = getRoleForUser(e.user_id);
                const isOwner = role === "owner";
                const isSelf = e.user_id === user?.id;
                return (
                  <TableRow key={e.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{e.full_name}</p>
                        {e.phone && <p className="text-xs text-muted-foreground">{e.phone}</p>}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{getStoreName(e.store_id)}</TableCell>
                    <TableCell>
                      <Badge variant={isOwner ? "default" : role === "manager" ? "secondary" : "outline"}>
                        {roleLabels[role] || role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(e.created_at), "dd.MM.yyyy")}
                    </TableCell>
                    <TableCell>
                      {!isOwner && !isSelf && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(e)}>
                              <Pencil className="h-4 w-4 mr-2" />Редактировать
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => deactivateEmployee.mutate(e.user_id)}>
                              <UserX className="h-4 w-4 mr-2" />Отключить доступ
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openDelete(e)} className="text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" />Удалить
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактировать сотрудника</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Имя</Label>
              <Input value={editForm.fullName} onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>Телефон</Label>
              <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>Роль</Label>
              <Select value={editForm.role} onValueChange={(v) => setEditForm({ ...editForm, role: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Сотрудник</SelectItem>
                  <SelectItem value="manager">Менеджер</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)}>Отмена</Button>
              <Button onClick={() => updateEmployee.mutate()} disabled={updateEmployee.isPending}>
                {updateEmployee.isPending ? "Сохранение..." : "Сохранить"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить сотрудника?</AlertDialogTitle>
            <AlertDialogDescription>
              Аккаунт <strong>{deleteTarget?.name}</strong> будет удалён безвозвратно.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteEmployee.mutate(deleteTarget.userId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteEmployee.isPending ? "Удаление..." : "Удалить"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Regenerated Link Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Новая ссылка-приглашение</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Старая ссылка больше не действует. Отправьте новую:</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded bg-muted px-3 py-2 text-xs font-mono break-all">{linkDialogUrl}</code>
              <Button variant="outline" size="icon" onClick={() => copyLink(linkDialogUrl)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <DialogFooter>
              <Button onClick={() => setLinkDialogOpen(false)}>Закрыть</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmployeesPage;
