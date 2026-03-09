import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const roleLabels: Record<string, string> = {
  owner: "Владелец",
  manager: "Менеджер",
  employee: "Сотрудник",
};

const EmployeesPage = () => {
  const { companyId } = useAuth();

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

  // Fetch roles for all profiles
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Сотрудники</h1>
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
