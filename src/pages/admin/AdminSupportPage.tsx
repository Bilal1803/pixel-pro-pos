import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { MessageSquare, CheckCircle } from "lucide-react";

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  open: { label: "Открыто", variant: "default" },
  replied: { label: "Отвечено", variant: "secondary" },
  closed: { label: "Закрыто", variant: "destructive" },
};

const AdminSupportPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<any>(null);
  const [reply, setReply] = useState("");

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["admin-tickets"],
    queryFn: async () => {
      const { data } = await supabase
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["admin-ticket-companies"],
    queryFn: async () => {
      const { data } = await supabase.from("companies").select("id, name");
      return data || [];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["admin-ticket-profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, user_id, full_name, email");
      return data || [];
    },
  });

  const companyMap = Object.fromEntries(companies.map((c: any) => [c.id, c.name]));
  const userMap = Object.fromEntries(profiles.map((p: any) => [p.user_id, p]));

  const replyMutation = useMutation({
    mutationFn: async () => {
      if (!selected || !reply.trim()) return;
      const { error } = await supabase
        .from("support_tickets")
        .update({ admin_reply: reply, status: "replied", replied_at: new Date().toISOString() } as any)
        .eq("id", selected.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tickets"] });
      toast({ title: "Ответ отправлен" });
      setSelected(null);
      setReply("");
    },
  });

  const closeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("support_tickets").update({ status: "closed" } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tickets"] });
      toast({ title: "Обращение закрыто" });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Поддержка</h1>
        <Badge variant="secondary">{tickets.length} обращений</Badge>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Загрузка...</div>
      ) : tickets.length === 0 ? (
        <Card className="p-12 text-center">
          <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Обращений пока нет</p>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Компания</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Пользователь</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Тема</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Дата</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Статус</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Действия</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t: any) => {
                  const st = statusLabels[t.status] || statusLabels.open;
                  const user = userMap[t.user_id];
                  return (
                    <tr key={t.id} className="border-b last:border-0">
                      <td className="px-4 py-3">{companyMap[t.company_id] || "—"}</td>
                      <td className="px-4 py-3">{user?.full_name || "—"}</td>
                      <td className="px-4 py-3 font-medium max-w-[200px] truncate">{t.subject}</td>
                      <td className="px-4 py-3 text-muted-foreground">{new Date(t.created_at).toLocaleDateString("ru")}</td>
                      <td className="px-4 py-3"><Badge variant={st.variant}>{st.label}</Badge></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="ghost" onClick={() => { setSelected(t); setReply(t.admin_reply || ""); }}>
                            Открыть
                          </Button>
                          {t.status !== "closed" && (
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => closeMutation.mutate(t.id)}>
                              <CheckCircle className="h-4 w-4 text-success" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selected?.subject}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                {userMap[selected.user_id]?.full_name} · {new Date(selected.created_at).toLocaleString("ru")}
              </div>
              <div className="bg-muted rounded-md p-3 text-sm whitespace-pre-wrap">{selected.message}</div>
              {selected.admin_reply && (
                <div className="bg-primary/5 border-l-2 border-primary rounded-md p-3 text-sm whitespace-pre-wrap">
                  <p className="text-xs text-primary font-medium mb-1">Ответ администратора</p>
                  {selected.admin_reply}
                </div>
              )}
              {selected.status !== "closed" && (
                <>
                  <Textarea
                    placeholder="Написать ответ..."
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    rows={4}
                  />
                  <DialogFooter>
                    <Button onClick={() => replyMutation.mutate()} disabled={!reply.trim() || replyMutation.isPending}>
                      Ответить
                    </Button>
                  </DialogFooter>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSupportPage;
