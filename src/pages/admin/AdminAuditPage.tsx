import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollText, Search } from "lucide-react";

const actionLabels: Record<string, string> = {
  login: "Вход в систему",
  register: "Регистрация",
  plan_change: "Изменение тарифа",
  block_company: "Блокировка компании",
  unblock_company: "Разблокировка компании",
  delete_company: "Удаление компании",
  role_change: "Изменение роли",
  admin_add: "Добавление администратора",
  admin_remove: "Удаление администратора",
  subscription_update: "Обновление подписки",
};

const AdminAuditPage = () => {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["admin-audit-log"],
    queryFn: async () => {
      const { data } = await supabase
        .from("audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      return data || [];
    },
  });

  const filtered = logs.filter((l: any) => {
    const matchSearch = !search ||
      l.user_email?.toLowerCase().includes(search.toLowerCase()) ||
      l.action?.toLowerCase().includes(search.toLowerCase());
    const matchAction = actionFilter === "all" || l.action === actionFilter;
    return matchSearch && matchAction;
  });

  const actionTypes = [...new Set(logs.map((l: any) => l.action))];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Журнал действий</h1>
        <p className="text-sm text-muted-foreground">История всех действий в системе</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Поиск по email или действию..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Тип действия" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все действия</SelectItem>
            {actionTypes.map((a: any) => (
              <SelectItem key={a} value={a}>{actionLabels[a] || a}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Загрузка...</div>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center">
          <ScrollText className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">Журнал пуст</p>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Пользователь</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Действие</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Объект</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Детали</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Дата</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l: any) => (
                  <tr key={l.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 text-xs">{l.user_email || "Система"}</td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className="text-xs">{actionLabels[l.action] || l.action}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{l.entity_type || "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate">
                      {l.details && Object.keys(l.details).length > 0
                        ? JSON.stringify(l.details)
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString("ru")}</td>
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

export default AdminAuditPage;
