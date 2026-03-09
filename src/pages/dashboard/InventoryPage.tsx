import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const statusLabels: Record<string, { label: string; className: string }> = {
  available: { label: "В наличии", className: "bg-success/10 text-success" },
  testing: { label: "Проверка", className: "bg-warning/10 text-warning" },
  reserved: { label: "Резерв", className: "bg-primary/10 text-primary" },
  sold: { label: "Продано", className: "bg-muted text-muted-foreground" },
  defective: { label: "Дефект", className: "bg-destructive/10 text-destructive" },
  rental: { label: "Аренда", className: "bg-primary/10 text-primary" },
};

const InventoryPage = () => {
  const { companyId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ model: "", brand: "", memory: "", color: "", imei: "", battery_health: "", purchase_price: "", sale_price: "", status: "testing" as string, notes: "" });

  const { data: devices = [], isLoading } = useQuery({
    queryKey: ["devices", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase.from("devices").select("*").eq("company_id", companyId).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const addDevice = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("No company");
      const { error } = await supabase.from("devices").insert({
        company_id: companyId,
        model: form.model,
        brand: form.brand || null,
        memory: form.memory || null,
        color: form.color || null,
        imei: form.imei,
        battery_health: form.battery_health || null,
        purchase_price: form.purchase_price ? parseFloat(form.purchase_price) : null,
        sale_price: form.sale_price ? parseFloat(form.sale_price) : null,
        status: form.status as any,
        notes: form.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      toast({ title: "Устройство добавлено" });
      setOpen(false);
      setForm({ model: "", brand: "", memory: "", color: "", imei: "", battery_health: "", purchase_price: "", sale_price: "", status: "testing", notes: "" });
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("devices").update({ status: status as any }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["devices"] }),
  });

  const filtered = devices.filter((d) =>
    d.model.toLowerCase().includes(search.toLowerCase()) || d.imei.includes(search)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Склад устройств</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Добавить устройство</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Новое устройство</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); addDevice.mutate(); }} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Модель *</Label><Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} required /></div>
                <div><Label>Бренд</Label><Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} /></div>
                <div><Label>Память</Label><Input placeholder="128GB" value={form.memory} onChange={(e) => setForm({ ...form, memory: e.target.value })} /></div>
                <div><Label>Цвет</Label><Input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} /></div>
                <div><Label>IMEI *</Label><Input value={form.imei} onChange={(e) => setForm({ ...form, imei: e.target.value })} required /></div>
                <div><Label>АКБ</Label><Input placeholder="94%" value={form.battery_health} onChange={(e) => setForm({ ...form, battery_health: e.target.value })} /></div>
                <div><Label>Цена закупки</Label><Input type="number" value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: e.target.value })} /></div>
                <div><Label>Цена продажи</Label><Input type="number" value={form.sale_price} onChange={(e) => setForm({ ...form, sale_price: e.target.value })} /></div>
              </div>
              <div>
                <Label>Статус</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="testing">Проверка</SelectItem>
                    <SelectItem value="available">В наличии</SelectItem>
                    <SelectItem value="reserved">Резерв</SelectItem>
                    <SelectItem value="defective">Дефект</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Заметки</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              <Button type="submit" className="w-full" disabled={addDevice.isPending}>
                {addDevice.isPending ? "Сохранение..." : "Добавить"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Поиск по модели или IMEI..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card className="card-shadow overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Загрузка...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">Нет устройств. Добавьте первое!</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Модель</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Память</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Цвет</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">IMEI</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">АКБ</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Закупка</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Продажа</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Статус</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((d) => (
                  <tr key={d.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{d.model}</td>
                    <td className="px-4 py-3">{d.memory || "—"}</td>
                    <td className="px-4 py-3">{d.color || "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs">{d.imei}</td>
                    <td className="px-4 py-3">{d.battery_health || "—"}</td>
                    <td className="px-4 py-3">{d.purchase_price ? `${d.purchase_price} ₽` : "—"}</td>
                    <td className="px-4 py-3">{d.sale_price ? `${d.sale_price} ₽` : "—"}</td>
                    <td className="px-4 py-3">
                      <Select value={d.status} onValueChange={(v) => updateStatus.mutate({ id: d.id, status: v })}>
                        <SelectTrigger className="h-7 w-auto border-0 bg-transparent p-0">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusLabels[d.status]?.className || ""}`}>
                            {statusLabels[d.status]?.label || d.status}
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="testing">Проверка</SelectItem>
                          <SelectItem value="available">В наличии</SelectItem>
                          <SelectItem value="reserved">Резерв</SelectItem>
                          <SelectItem value="sold">Продано</SelectItem>
                          <SelectItem value="defective">Дефект</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
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

export default InventoryPage;
