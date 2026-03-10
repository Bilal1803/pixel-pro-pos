import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Building2, Ban, CheckCircle } from "lucide-react";

const AdminCompaniesPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const getSub = (companyId: string) => subscriptions.find((s: any) => s.company_id === companyId);
  const getEmployeeCount = (companyId: string) => profiles.filter((p: any) => p.company_id === companyId).length;

  const planLabels: Record<string, { label: string; className: string }> = {
    start: { label: "Старт", className: "bg-muted text-muted-foreground" },
    business: { label: "Бизнес", className: "bg-primary/10 text-primary" },
    premier: { label: "Премьер", className: "bg-warning/10 text-warning" },
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Компании</h1>

      {isLoading ? (
        <div className="text-muted-foreground">Загрузка...</div>
      ) : (
        <div className="space-y-3">
          {companies.map((c: any) => {
            const sub = getSub(c.id);
            const plan = sub?.plan || "start";
            const pl = planLabels[plan] || planLabels.start;
            return (
              <Card key={c.id} className="p-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-semibold">{c.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {getEmployeeCount(c.id)} сотр. · создана {new Date(c.created_at).toLocaleDateString("ru")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={pl.className}>{pl.label}</Badge>
                    <Select value={plan} onValueChange={(v) => updatePlan.mutate({ companyId: c.id, plan: v })}>
                      <SelectTrigger className="w-32 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="start">Старт</SelectItem>
                        <SelectItem value="business">Бизнес</SelectItem>
                        <SelectItem value="premier">Премьер</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminCompaniesPage;
