import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Search, LogIn } from "lucide-react";
import { useState } from "react";
import { usePlatformAdmin } from "@/hooks/usePlatformAdmin";

const AdminUsersPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { adminRole } = usePlatformAdmin();
  const isFullAdmin = adminRole === "full_admin";
  const [search, setSearch] = useState("");
  const [impersonating, setImpersonating] = useState<string | null>(null);

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["admin-all-profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["admin-companies-map"],
    queryFn: async () => {
      const { data } = await supabase.from("companies").select("id, name");
      return data || [];
    },
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["admin-all-roles"],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("*");
      return data || [];
    },
  });

  const updateRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { error } = await supabase.from("user_roles").update({ role: role as any }).eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-all-roles"] });
      toast({ title: "Роль обновлена" });
    },
  });

  const handleImpersonate = async (userId: string) => {
    setImpersonating(userId);
    try {
      const { data, error } = await supabase.functions.invoke("impersonate-user", {
        body: { targetUserId: userId },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(`${data.url}&redirect_to=${window.location.origin}/dashboard`, "_blank");
        toast({ title: "Сессия пользователя открыта в новой вкладке" });
      }
    } catch (err: any) {
      toast({ title: "Ошибка", description: err.message, variant: "destructive" });
    } finally {
      setImpersonating(null);
    }
  };

  const companyMap = Object.fromEntries(companies.map((c: any) => [c.id, c.name]));
  const roleMap = Object.fromEntries(roles.map((r: any) => [r.user_id, r.role]));

  const roleLabels: Record<string, string> = { owner: "Владелец", manager: "Менеджер", employee: "Сотрудник" };

  const filtered = profiles.filter((p: any) =>
    p.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Пользователи</h1>
          <p className="text-sm text-muted-foreground">{profiles.length} зарегистрировано</p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Поиск по имени или email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Загрузка...</div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Имя</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Компания</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Роль</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Телефон</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Дата</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Действия</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p: any) => {
                  const role = roleMap[p.user_id] || "employee";
                  return (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-medium">{p.full_name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.email || "—"}</td>
                      <td className="px-4 py-3">{companyMap[p.company_id] || "—"}</td>
                      <td className="px-4 py-3">
                        {isFullAdmin ? (
                          <Select value={role} onValueChange={(v) => updateRole.mutate({ userId: p.user_id, role: v })}>
                            <SelectTrigger className="w-32 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="owner">Владелец</SelectItem>
                              <SelectItem value="manager">Менеджер</SelectItem>
                              <SelectItem value="employee">Сотрудник</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="secondary">{roleLabels[role] || role}</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{p.phone || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(p.created_at).toLocaleDateString("ru")}</td>
                      <td className="px-4 py-3">
                        <Button
                          size="sm" variant="outline" className="h-8 text-xs gap-1.5"
                          disabled={impersonating === p.user_id}
                          onClick={() => handleImpersonate(p.user_id)}
                        >
                          <LogIn className="h-3.5 w-3.5" />
                          {impersonating === p.user_id ? "Вход..." : "Войти"}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

export default AdminUsersPage;
