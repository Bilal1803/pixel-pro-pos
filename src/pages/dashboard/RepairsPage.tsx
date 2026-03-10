import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import SectionHelp from "@/components/SectionHelp";
import { SECTION_TIPS } from "@/data/sectionTips";

const statusLabels: Record<string, { label: string; className: string }> = {
  accepted: { label: "Принят", className: "bg-secondary text-secondary-foreground" },
  in_progress: { label: "В работе", className: "bg-primary/10 text-primary" },
  waiting_parts: { label: "Ожидание запчастей", className: "bg-warning/10 text-warning" },
  ready: { label: "Готов", className: "bg-success/10 text-success" },
  done: { label: "Выдан", className: "bg-muted text-muted-foreground" },
};

const RepairsPage = () => {
  const { companyId, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ device_description: "", issue: "", price: "", notes: "" });

  const { data: repairs = [], isLoading } = useQuery({
    queryKey: ["repairs", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("repairs")
        .select("*, clients(name)")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-repairs", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase.from("clients").select("id, name").eq("company_id", companyId);
      return data || [];
    },
    enabled: !!companyId && open,
  });

  const [selectedClient, setSelectedClient] = useState("");

  const createRepair = useMutation({
    mutationFn: async () => {
      if (!companyId || !user) throw new Error("No company");
      const { error } = await supabase.from("repairs").insert({
        company_id: companyId,
        device_description: form.device_description,
        issue: form.issue,
        price: form.price ? Number(form.price) : null,
        notes: form.notes || null,
        client_id: selectedClient || null,
        employee_id: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repairs"] });
      toast({ title: "Заказ на ремонт создан" });
      setOpen(false);
      setForm({ device_description: "", issue: "", price: "", notes: "" });
      setSelectedClient("");
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("repairs").update({ status: status as any }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repairs"] });
      toast({ title: "Статус обновлён" });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Ремонт</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Новый заказ</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Новый заказ на ремонт</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createRepair.mutate(); }} className="space-y-3">
              <div><Label>Устройство *</Label><Input placeholder="iPhone 14 Pro Max" value={form.device_description} onChange={(e) => setForm({ ...form, device_description: e.target.value })} required /></div>
              <div><Label>Проблема *</Label><Textarea placeholder="Опишите неисправность" value={form.issue} onChange={(e) => setForm({ ...form, issue: e.target.value })} required /></div>
              <div><Label>Клиент</Label>
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger><SelectValue placeholder="Выберите клиента" /></SelectTrigger>
                  <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Цена ремонта</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
              <div><Label>Заметки</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              <Button type="submit" className="w-full" disabled={createRepair.isPending || !form.device_description || !form.issue}>
                {createRepair.isPending ? "Создание..." : "Создать заказ"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <SectionHelp tips={SECTION_TIPS.repairs} />

      <Card className="card-shadow overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Загрузка...</div>
        ) : repairs.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">Нет заказов на ремонт</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Устройство</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Клиент</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Проблема</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Цена</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Статус</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Дата</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {repairs.map((r: any) => (
                  <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{r.device_description}</td>
                    <td className="px-4 py-3">{r.clients?.name || "—"}</td>
                    <td className="px-4 py-3 max-w-[200px] truncate">{r.issue}</td>
                    <td className="px-4 py-3 font-semibold">{r.price ? `${r.price} ₽` : "—"}</td>
                    <td className="px-4 py-3">
                      <Select value={r.status} onValueChange={(v) => updateStatus.mutate({ id: r.id, status: v })}>
                        <SelectTrigger className="h-7 w-auto border-0 bg-transparent p-0 pr-6">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusLabels[r.status]?.className || ""}`}>
                            {statusLabels[r.status]?.label || r.status}
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(statusLabels).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(r.created_at).toLocaleDateString("ru")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default RepairsPage;
