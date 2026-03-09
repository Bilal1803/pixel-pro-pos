import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ExternalLink, AlertCircle, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const ListingsPage = () => {
  const { companyId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ group_name: "", avito_url: "", device_count: "" });

  const { data: listings = [], isLoading } = useQuery({
    queryKey: ["listings", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const createListing = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("No company");
      const { error } = await supabase.from("listings").insert({
        company_id: companyId,
        group_name: form.group_name,
        avito_url: form.avito_url || null,
        device_count: form.device_count ? Number(form.device_count) : 0,
        last_refreshed: form.avito_url ? new Date().toISOString() : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["listings"] });
      toast({ title: "Объявление добавлено" });
      setOpen(false);
      setForm({ group_name: "", avito_url: "", device_count: "" });
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const refreshListing = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("listings").update({ last_refreshed: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["listings"] });
      toast({ title: "Дата обновления сброшена" });
    },
  });

  const deleteListing = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("listings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["listings"] });
      toast({ title: "Удалено" });
    },
  });

  const getDaysLeft = (lastRefreshed: string | null) => {
    if (!lastRefreshed) return null;
    const refreshed = new Date(lastRefreshed);
    const expiry = new Date(refreshed.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
    const now = new Date();
    return Math.max(0, Math.ceil((expiry.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Объявления</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Добавить объявление</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Новое объявление</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createListing.mutate(); }} className="space-y-3">
              <div><Label>Группа (модель) *</Label><Input placeholder="iPhone 14 Pro 128GB Чёрный" value={form.group_name} onChange={(e) => setForm({ ...form, group_name: e.target.value })} required /></div>
              <div><Label>Ссылка Avito</Label><Input placeholder="https://avito.ru/..." value={form.avito_url} onChange={(e) => setForm({ ...form, avito_url: e.target.value })} /></div>
              <div><Label>Кол-во устройств</Label><Input type="number" value={form.device_count} onChange={(e) => setForm({ ...form, device_count: e.target.value })} /></div>
              <Button type="submit" className="w-full" disabled={createListing.isPending || !form.group_name}>
                {createListing.isPending ? "Добавление..." : "Добавить"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <p className="text-sm text-muted-foreground">
        Устройства группируются по модели, памяти и цвету. Привяжите ссылку на объявление Avito.
      </p>

      <Card className="card-shadow overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Загрузка...</div>
        ) : listings.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">Нет объявлений</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Группа</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Кол-во</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ссылка Avito</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Обновить через</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {listings.map((l: any) => {
                  const daysLeft = getDaysLeft(l.last_refreshed);
                  return (
                    <tr key={l.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">{l.group_name}</td>
                      <td className="px-4 py-3">{l.device_count || 0} шт.</td>
                      <td className="px-4 py-3">
                        {l.avito_url ? (
                          <a href={l.avito_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                            Открыть <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-muted-foreground">Не привязано</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {daysLeft !== null && daysLeft <= 3 && l.avito_url ? (
                          <span className="inline-flex items-center gap-1 text-destructive font-medium">
                            <AlertCircle className="h-3.5 w-3.5" /> {daysLeft} дн.
                          </span>
                        ) : daysLeft !== null && l.avito_url ? (
                          <span>{daysLeft} дн.</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {l.avito_url && (
                            <Button variant="ghost" size="sm" onClick={() => refreshListing.mutate(l.id)}>Обновить</Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteListing.mutate(l.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ListingsPage;
