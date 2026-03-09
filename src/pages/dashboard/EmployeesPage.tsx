import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Plus, Copy } from "lucide-react";

const roleLabels: Record<string, string> = {
  owner: "Владелец",
  manager: "Менеджер",
  employee: "Сотрудник",
};

const EmployeesPage = () => {
  const { companyId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", role: "employee" });
  const [tempPassword, setTempPassword] = useState<string | null>(null);

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

  const getRoleForUser = (userId: string) => {
    const r = roles.find((r: any) => r.user_id === userId);
    return r?.role || "employee";
  };

  const addEmployee = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("create-employee", {
        body: {
          email: form.email,
          fullName: form.fullName,
          phone: form.phone || null,
          role: form.role,
        },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["employee-roles"] });
      setTempPassword(data.tempPassword);
      toast({ title: "Сотрудник добавлен" });
    },
    onError: (e: any) => {
      toast({ title: "Ошибка", description: e.message, variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    if (!form.email || !form.fullName) return;
    addEmployee.mutate();
  };

  const handleClose = () => {
    setOpen(false);
    setTempPassword(null);
    setForm({ fullName: "", email: "", phone: "", role: "employee" });
  };

  const copyPassword = () => {
    if (tempPassword) {
      navigator.clipboard.writeText(tempPassword);
      toast({ title: "Пароль скопирован" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Сотрудники</h1>
        <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else setOpen(true); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" />Добавить</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{tempPassword ? "Сотрудник создан" : "Новый сотрудник"}</DialogTitle>
            </DialogHeader>
            {tempPassword ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Передайте сотруднику email и временный пароль для входа:
                </p>
                <div>
                  <Label>Email</Label>
                  <p className="mt-1 font-medium">{form.email}</p>
                </div>
                <div>
                  <Label>Временный пароль</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 rounded bg-muted px-3 py-2 text-sm font-mono">{tempPassword}</code>
                    <Button variant="outline" size="icon" onClick={copyPassword}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleClose}>Закрыть</Button>
                </DialogFooter>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label>Имя *</Label>
                  <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label>Email *</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1" />
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
                <DialogFooter>
                  <Button onClick={handleSubmit} disabled={addEmployee.isPending}>
                    {addEmployee.isPending ? "Создание..." : "Создать"}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground">Загрузка...</div>
      ) : profiles.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">Нет сотрудников</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {profiles.map((e: any) => {
            const role = getRoleForUser(e.user_id);
            return (
              <Card key={e.id} className="p-5 card-shadow">
                <h3 className="font-semibold">{e.full_name}</h3>
                <p className="mt-1 text-sm text-primary font-medium">{roleLabels[role] || role}</p>
                <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                  {e.email && <p>{e.email}</p>}
                  {e.phone && <p>{e.phone}</p>}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EmployeesPage;
