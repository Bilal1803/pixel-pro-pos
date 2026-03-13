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
import { Shield, Plus, Trash2 } from "lucide-react";

const roleLabels: Record<string, string> = {
  full_admin: "Полный администратор",
  manager: "Менеджер платформы",
  support: "Поддержка",
};

const roleDescriptions: Record<string, string> = {
  full_admin: "Полный доступ ко всем функциям платформы, включая управление администраторами.",
  manager: "Управление компаниями, тарифами, аналитика. Без доступа к системным настройкам.",
  support: "Просмотр компаний, пользователей. Ответы на обращения в поддержку.",
};

const AdminAdminsPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { adminRole } = usePlatformAdmin();
  const isFullAdmin = adminRole === "full_admin";
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ email: "", role: "support" });

  const { data: admins = [], isLoading } = useQuery({
    queryKey: ["admin-admins-list"],
    queryFn: async () => {
      const { data } = await supabase.from("platform_admins").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const addAdmin = useMutation({
    mutationFn: async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id, email")
        .ilike("email", addForm.email.trim().toLowerCase())
        .limit(1);
      const found = profile?.[0];
      if (!found) throw new Error("Пользователь с таким email не найден в системе");
      const { error } = await supabase.from("platform_admins").insert({
        user_id: found.user_id,
        email: addForm.email.trim().toLowerCase(),
        role: addForm.role,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-admins-list"] });
      queryClient.invalidateQueries({ queryKey: ["platform-admin"] });
      toast({ title: "Администратор добавлен" });
      setAddOpen(false);
      setAddForm({ email: "", role: "support" });
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const removeAdmin = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("platform_admins").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-admins-list"] });
      queryClient.invalidateQueries({ queryKey: ["platform-admin"] });
      toast({ title: "Администратор удалён" });
    },
  });

  const updateRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      const { error } = await supabase.from("platform_admins").update({ role }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-admins-list"] });
      queryClient.invalidateQueries({ queryKey: ["platform-admin"] });
      toast({ title: "Роль обновлена" });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Администраторы</h1>
          <p className="text-sm text-muted-foreground">Управление командой платформы</p>
        </div>
        {isFullAdmin && (
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Добавить
          </Button>
        )}
      </div>

      {/* Role descriptions */}
      <div className="grid gap-3 md:grid-cols-3">
        {Object.entries(roleLabels).map(([key, label]) => (
          <Card key={key}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">{label}</span>
              </div>
              <p className="text-xs text-muted-foreground">{roleDescriptions[key]}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Загрузка...</div>
      ) : admins.length === 0 ? (
        <Card className="p-8 text-center">
          <Shield className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">Нет администраторов</p>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Роль</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Дата</th>
                  {isFullAdmin && <th className="px-4 py-3 text-left font-medium text-muted-foreground">Действия</th>}
                </tr>
              </thead>
              <tbody>
                {admins.map((a: any) => (
                  <tr key={a.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium">{a.email}</td>
                    <td className="px-4 py-3">
                      {isFullAdmin ? (
                        <Select value={a.role || "full_admin"} onValueChange={(v) => updateRole.mutate({ id: a.id, role: v })}>
                          <SelectTrigger className="w-48 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="full_admin">Полный администратор</SelectItem>
                            <SelectItem value="manager">Менеджер платформы</SelectItem>
                            <SelectItem value="support">Поддержка</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="secondary">{roleLabels[a.role] || a.role}</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(a.created_at).toLocaleDateString("ru")}</td>
                    {isFullAdmin && (
                      <td className="px-4 py-3">
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => removeAdmin.mutate(a.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Добавить администратора</DialogTitle></DialogHeader>
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
                  <SelectItem value="manager">Менеджер платформы</SelectItem>
                  <SelectItem value="support">Поддержка</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-2">{roleDescriptions[addForm.role]}</p>
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

export default AdminAdminsPage;
