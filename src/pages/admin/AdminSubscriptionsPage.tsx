import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const AdminSubscriptionsPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: subscriptions = [], isLoading } = useQuery({
    queryKey: ["admin-subs"],
    queryFn: async () => {
      const { data } = await supabase.from("subscriptions").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["admin-companies-sub"],
    queryFn: async () => {
      const { data } = await supabase.from("companies").select("id, name");
      return data || [];
    },
  });

  const companyMap = Object.fromEntries(companies.map((c: any) => [c.id, c.name]));

  const updatePlan = useMutation({
    mutationFn: async ({ id, plan }: { id: string; plan: string }) => {
      const planLimits: Record<string, any> = {
        start: { max_stores: 1, max_employees: 2, max_devices: 30, repairs_enabled: false, ai_enabled: false },
        business: { max_stores: 3, max_employees: 20, max_devices: 200, repairs_enabled: true, ai_enabled: true },
        premier: { max_stores: 10, max_employees: 999999, max_devices: 999999, repairs_enabled: true, ai_enabled: true },
      };
      const { error } = await supabase.from("subscriptions").update({ plan, ...planLimits[plan] }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-subs"] });
      toast({ title: "Подписка обновлена" });
    },
  });

  const planLabels: Record<string, string> = { start: "Старт", business: "Бизнес", premier: "Премьер" };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Подписки</h1>

      {isLoading ? (
        <div className="text-muted-foreground">Загрузка...</div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Компания</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Тариф</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Магазины</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Сотрудники</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Устройства</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Действие</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((s: any) => (
                  <tr key={s.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{companyMap[s.company_id] || s.company_id}</td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary">{planLabels[s.plan] || s.plan}</Badge>
                    </td>
                    <td className="px-4 py-3">{s.max_stores}</td>
                    <td className="px-4 py-3">{s.max_employees > 9999 ? "∞" : s.max_employees}</td>
                    <td className="px-4 py-3">{s.max_devices > 9999 ? "∞" : s.max_devices}</td>
                    <td className="px-4 py-3">
                      <Select value={s.plan} onValueChange={(v) => updatePlan.mutate({ id: s.id, plan: v })}>
                        <SelectTrigger className="w-28 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="start">Старт</SelectItem>
                          <SelectItem value="business">Бизнес</SelectItem>
                          <SelectItem value="premier">Премьер</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

export default AdminSubscriptionsPage;
