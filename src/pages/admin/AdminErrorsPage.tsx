import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Search, Eye } from "lucide-react";

const AdminErrorsPage = () => {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selected, setSelected] = useState<any>(null);

  const { data: errors = [], isLoading } = useQuery({
    queryKey: ["admin-system-errors"],
    queryFn: async () => {
      const { data } = await supabase
        .from("system_errors")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      return data || [];
    },
  });

  const filtered = errors.filter((e: any) => {
    const matchSearch = !search || 
      e.message?.toLowerCase().includes(search.toLowerCase()) ||
      e.user_email?.toLowerCase().includes(search.toLowerCase()) ||
      e.company_name?.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || e.error_type === typeFilter;
    return matchSearch && matchType;
  });

  const errorTypes = [...new Set(errors.map((e: any) => e.error_type))];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Ошибки системы</h1>
        <p className="text-sm text-muted-foreground">Автоматически зафиксированные ошибки приложения</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Поиск по сообщению, email, компании..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Тип ошибки" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все типы</SelectItem>
            {errorTypes.map((t: any) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Загрузка...</div>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center">
          <AlertTriangle className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">Ошибок не найдено</p>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Тип</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Сообщение</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Файл</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Пользователь</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Дата</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e: any) => (
                  <tr key={e.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <Badge variant="destructive" className="text-xs">{e.error_type}</Badge>
                    </td>
                    <td className="px-4 py-3 max-w-[300px] truncate text-xs">{e.message}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {e.file_name ? `${e.file_name}:${e.line_number || "?"}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{e.user_email || "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString("ru")}</td>
                    <td className="px-4 py-3">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setSelected(e)}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Детали ошибки</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div><span className="text-muted-foreground">Тип:</span> {selected.error_type}</div>
              <div><span className="text-muted-foreground">Сообщение:</span></div>
              <div className="bg-muted rounded p-3 text-xs font-mono whitespace-pre-wrap">{selected.message}</div>
              {selected.stack && (
                <>
                  <div><span className="text-muted-foreground">Stack trace:</span></div>
                  <div className="bg-muted rounded p-3 text-xs font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">{selected.stack}</div>
                </>
              )}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-muted-foreground">Файл:</span> {selected.file_name || "—"}</div>
                <div><span className="text-muted-foreground">Строка:</span> {selected.line_number || "—"}</div>
                <div><span className="text-muted-foreground">Пользователь:</span> {selected.user_email || "—"}</div>
                <div><span className="text-muted-foreground">Компания:</span> {selected.company_name || "—"}</div>
                <div><span className="text-muted-foreground">URL:</span> {selected.url || "—"}</div>
                <div><span className="text-muted-foreground">Дата:</span> {new Date(selected.created_at).toLocaleString("ru")}</div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminErrorsPage;
