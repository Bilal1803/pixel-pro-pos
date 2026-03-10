import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Shield, Ban, CheckCircle, Activity } from "lucide-react";

const AdminSystemPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
      const { data } = await supabase.from("profiles").select("id, user_id, full_name, created_at").order("created_at", { ascending: false }).limit(20);
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

  const blockedCompanies = companies.filter((c: any) => c.is_blocked);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Система</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Platform admins */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-destructive" />
              Администраторы платформы
            </CardTitle>
          </CardHeader>
          <CardContent>
            {admins.length === 0 ? (
              <p className="text-sm text-muted-foreground">Нет администраторов</p>
            ) : (
              <div className="space-y-2">
                {admins.map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between text-sm border rounded-md p-2">
                    <span>{a.email}</span>
                    <Badge variant="secondary">admin</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Blocked companies */}
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
    </div>
  );
};

export default AdminSystemPage;
