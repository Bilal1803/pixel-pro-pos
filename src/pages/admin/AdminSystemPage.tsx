import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { usePlatformAdmin } from "@/hooks/usePlatformAdmin";
import { Shield, Ban, CheckCircle, Activity, Plus, Trash2 } from "lucide-react";

const roleLabels: Record<string, string> = {
  full_admin: "Полный администратор",
  manager: "Менеджер",
  support: "Поддержка",
};

const AdminSystemPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { adminRole } = usePlatformAdmin();
  const isFullAdmin = adminRole === "full_admin";

  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ email: "", role: "support" });

  const { data: companies = [] } = useQuery({
    queryKey: ["admin-sys-companies"],
    queryFn: async () => {
      const { data } = await supabase.from("companies").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["admin-sys-profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, user_id, full_name, email, created_at").order("created_at", { ascending: false }).limit(20);
      return data || [];
    },
  });

  const { data: admins = [] } = useQuery({
    queryKey: ["admin-sys-admins"],
    queryFn: async () => {
      const { data } = await supabase.from("platform_admins").select("*");
      return data || [];
    },
  });

  const toggleBlock = useMutation({
    mutationFn: async ({ companyId, blocked }: { companyId: string; blocked: boolean }) => {
      const { error } = await supabase.from("companies").update({ is_blocked: blocked } as any).eq("id", companyId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-sys-companies"] });
      toast({ title: "Статус обновлён" });
    },
  });

  const addAdmin = useMutation({
    mutationFn: async () => {
      // Find user by email in profiles
      const profile = profiles.find((p: any) => p.email === addForm.email) ||
        (await supabase.from("profiles").select("user_id, email").eq("email", addForm.email).maybeSingle()).data;
      if (!profile) throw new Error("Пользователь с таким email не найден");
      const { error } = await supabase.from("platform_admins").insert({
        user_id: profile.user_id,
        email: addForm.email,
        role: addForm.role,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-sys-admins"] });
      queryClient.invalidateQueries({ queryKey: ["platform-admin"] });
      toast({ title: "Администратор добавлен" });
      setAddOpen(false);
      setAddForm({ email: "", role: "support" });
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const removeAdmin = useMutation({
    mutationFn: async (adminId: string) => {
      const { error } = await supabase.from("platform_admins").delete().eq("id", adminId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-sys-admins"] });
      queryClient.invalidateQueries({ queryKey: ["platform-admin"] });
      toast({ title: "Администратор удалён" });
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const updateAdminRole = useMutation({
    mutationFn: async ({ adminId, role }: { adminId: string; role: string }) => {
      const { error } = await supabase.from("platform_admins").update({ role }).eq("id", adminId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-sys-admins"] });
      queryClient.invalidateQueries({ queryKey: ["platform-admin"] });
      toast({ title: "Роль обновлена" });
    },
  });

  const blockedCompanies = companies.filter((c: any) => c.is_blocked);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Система</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Platform admins */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-destructive" />
                Администраторы платформы
              </CardTitle>
              {isFullAdmin && (
                <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Добавить
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {admins.length === 0 ? (
              <p className="text-sm text-muted-foreground">Нет администраторов</p>
            ) : (
              <div className="space-y-2">
                {admins.map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between text-sm border rounded-md p-3">
                    <div>
                      <span className="font-medium">{a.email}</span>
                      <div className="mt-0.5">
                        {isFullAdmin ? (
                          <Select value={a.role || "full_admin"} onValueChange={(v) => updateAdminRole.mutate({ adminId: a.id, role: v })}>
                            <SelectTrigger className="h-7 w-44 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="full_admin">Полный администратор</SelectItem>
                              <SelectItem value="manager">Менеджер</SelectItem>
                              <SelectItem value="support">Поддержка</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="secondary" className="text-xs">{roleLabels[a.role] || a.role}</Badge>
                        )}
                      </div>
                    </div>
                    {isFullAdmin && (
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => removeAdmin.mutate(a.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Blocked companies */}
        {isFullAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Ban className="h-4 w-4 text-destructive" />
                Заблокированные компании ({blockedCompanies.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {blockedCompanies.length === 0 ? (
                <p className="text-sm text-muted-foreground">Нет заблокированных компаний</p>
              ) : (
                <div className="space-y-2">
                  {blockedCompanies.map((c: any) => (
                    <div key={c.id} className="flex items-center justify-between text-sm border rounded-md p-2">
                      <span>{c.name}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleBlock.mutate({ companyId: c.id, blocked: false })}
                      >
                        <CheckCircle className="h-4 w-4 text-success mr-1" />
                        Разблокировать
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Последние регистрации
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {profiles.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                <span>{p.full_name}</span>
                <span className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString("ru")}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Add admin dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить администратора</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Email пользователя</Label>
              <Input value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} placeholder="user@example.com" className="mt-1" />
            </div>
            <div>
              <Label>Роль</Label>
              <Select value={addForm.role} onValueChange={(v) => setAddForm({ ...addForm, role: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_admin">Полный администратор</SelectItem>
                  <SelectItem value="manager">Менеджер</SelectItem>
                  <SelectItem value="support">Поддержка</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-2">
                {addForm.role === "support" && "Может просматривать компании, пользователей и отвечать на обращения."}
                {addForm.role === "manager" && "Может управлять компаниями, тарифами и просматривать аналитику."}
                {addForm.role === "full_admin" && "Полный доступ ко всем функциям платформы."}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Отмена</Button>
            <Button onClick={() => addAdmin.mutate()} disabled={!addForm.email || addAdmin.isPending}>
              {addAdmin.isPending ? "Добавление..." : "Добавить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSystemPage;
