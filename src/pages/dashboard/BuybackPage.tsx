import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const statusLabels: Record<string, { label: string; className: string }> = {
  testing: { label: "Проверка", className: "bg-warning/10 text-warning" },
  available: { label: "В наличии", className: "bg-success/10 text-success" },
};

const BuybackPage = () => {
  const { companyId, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ model: "", memory: "", color: "", imei: "", battery_health: "", purchase_price: "" });

  const { data: buybacks = [], isLoading } = useQuery({
    queryKey: ["buybacks", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase.from("buybacks").select("*, devices(status)").eq("company_id", companyId).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const createBuyback = useMutation({
    mutationFn: async () => {
      if (!companyId || !user) throw new Error("No company");

      // Create device first
      const { data: device, error: devError } = await supabase.from("devices").insert({
        company_id: companyId,
        model: form.model,
        memory: form.memory || null,
        color: form.color || null,
        imei: form.imei,
        battery_health: form.battery_health || null,
        purchase_price: parseFloat(form.purchase_price),
        status: "testing" as any,
      }).select().single();
      if (devError) throw devError;

      const { error } = await supabase.from("buybacks").insert({
        company_id: companyId,
        employee_id: user.id,
        device_id: device.id,
        model: form.model,
        memory: form.memory || null,
        color: form.color || null,
        imei: form.imei || null,
        battery_health: form.battery_health || null,
        purchase_price: parseFloat(form.purchase_price),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buybacks"] });
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      toast({ title: "Скупка оформлена, устройство на проверке" });
      setOpen(false);
      setForm({ model: "", memory: "", color: "", imei: "", battery_health: "", purchase_price: "" });
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Скупка устройств</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Оформить скупку</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Скупка устройства</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createBuyback.mutate(); }} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Модель *</Label><Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} required /></div>
                <div><Label>Память</Label><Input placeholder="128GB" value={form.memory} onChange={(e) => setForm({ ...form, memory: e.target.value })} /></div>
                <div><Label>Цвет</Label><Input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} /></div>
                <div><Label>IMEI *</Label><Input value={form.imei} onChange={(e) => setForm({ ...form, imei: e.target.value })} required /></div>
                <div><Label>АКБ</Label><Input placeholder="94%" value={form.battery_health} onChange={(e) => setForm({ ...form, battery_health: e.target.value })} /></div>
                <div><Label>Цена скупки *</Label><Input type="number" value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: e.target.value })} required /></div>
              </div>
              <Button type="submit" className="w-full" disabled={createBuyback.isPending}>
                {createBuyback.isPending ? "Оформление..." : "Оформить скупку"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="card-shadow overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Загрузка...</div>
        ) : buybacks.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">Нет скупок</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Модель</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Цвет</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">IMEI</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">АКБ</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Цена скупки</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Статус</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Дата</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {buybacks.map((b: any) => {
                  const status = b.devices?.status || "testing";
                  return (
                    <tr key={b.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">{b.model} {b.memory || ""}</td>
                      <td className="px-4 py-3">{b.color || "—"}</td>
                      <td className="px-4 py-3 font-mono text-xs">{b.imei || "—"}</td>
                      <td className="px-4 py-3">{b.battery_health || "—"}</td>
                      <td className="px-4 py-3 font-semibold">{b.purchase_price} ₽</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusLabels[status]?.className || "bg-muted text-muted-foreground"}`}>
                          {statusLabels[status]?.label || status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{new Date(b.created_at).toLocaleDateString("ru")}</td>
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

export default BuybackPage;
