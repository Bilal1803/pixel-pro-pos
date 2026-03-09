import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";
import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SalesPage = () => {
  const { companyId, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [deviceSearch, setDeviceSearch] = useState("");

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ["sales", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("sales")
        .select("*, clients(name), sale_items(*)")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const { data: availableDevices = [] } = useQuery({
    queryKey: ["available-devices", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase.from("devices").select("*").eq("company_id", companyId).eq("status", "available");
      return data || [];
    },
    enabled: !!companyId && open,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-list", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase.from("clients").select("id, name").eq("company_id", companyId);
      return data || [];
    },
    enabled: !!companyId && open,
  });

  const [saleForm, setSaleForm] = useState({ device_id: "", client_id: "", payment_method: "cash" as string });

  const filteredDevices = useMemo(() => {
    if (!deviceSearch.trim()) return availableDevices;
    const q = deviceSearch.toLowerCase().trim();
    return availableDevices.filter(d =>
      d.model.toLowerCase().includes(q) ||
      d.imei.toLowerCase().includes(q) ||
      (d.brand && d.brand.toLowerCase().includes(q)) ||
      (d.memory && d.memory.toLowerCase().includes(q))
    );
  }, [availableDevices, deviceSearch]);

  const selectedDevice = availableDevices.find(d => d.id === saleForm.device_id);

  const createSale = useMutation({
    mutationFn: async () => {
      if (!companyId || !user) throw new Error("No company");
      const device = availableDevices.find(d => d.id === saleForm.device_id);
      if (!device || !device.sale_price) throw new Error("Выберите устройство с ценой продажи");

      const { data: sale, error: saleError } = await supabase.from("sales").insert({
        company_id: companyId,
        client_id: saleForm.client_id || null,
        employee_id: user.id,
        total: device.sale_price,
        payment_method: saleForm.payment_method as any,
      }).select().single();
      if (saleError) throw saleError;

      const { error: itemError } = await supabase.from("sale_items").insert({
        sale_id: sale.id,
        item_type: "device" as any,
        device_id: device.id,
        name: `${device.model} ${device.memory || ""} ${device.color || ""}`.trim(),
        price: device.sale_price,
        cost_price: device.purchase_price || 0,
      });
      if (itemError) throw itemError;

      await supabase.from("devices").update({ status: "sold" as any }).eq("id", device.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      queryClient.invalidateQueries({ queryKey: ["available-devices"] });
      toast({ title: "Продажа оформлена!" });
      setOpen(false);
      setSaleForm({ device_id: "", client_id: "", payment_method: "cash" });
      setDeviceSearch("");
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const paymentLabels: Record<string, string> = { cash: "Наличные", card: "Карта", transfer: "Перевод", installments: "Рассрочка", mixed: "Смешанная" };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Продажи</h1>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setDeviceSearch(""); setSaleForm({ device_id: "", client_id: "", payment_method: "cash" }); } }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Новая продажа</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Оформить продажу</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createSale.mutate(); }} className="space-y-4">
              {/* Device search & selection */}
              <div className="space-y-2">
                <Label>Устройство *</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Поиск по модели или IMEI..."
                    className="pl-9"
                    value={deviceSearch}
                    onChange={(e) => setDeviceSearch(e.target.value)}
                  />
                </div>
                <div className="max-h-[220px] overflow-y-auto rounded-lg border divide-y">
                  {filteredDevices.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      {availableDevices.length === 0 ? "Нет устройств в наличии" : "Ничего не найдено"}
                    </div>
                  ) : (
                    filteredDevices.map(d => (
                      <button
                        type="button"
                        key={d.id}
                        onClick={() => setSaleForm({ ...saleForm, device_id: d.id })}
                        className={`w-full text-left px-3 py-2.5 hover:bg-muted/50 transition-colors ${saleForm.device_id === d.id ? "bg-primary/10 border-l-2 border-l-primary" : ""}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{d.model}</span>
                          <span className="font-semibold text-sm">{d.sale_price ? `${d.sale_price} ₽` : "—"}</span>
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-xs text-muted-foreground">
                          <span className="font-mono">IMEI: {d.imei}</span>
                          {d.memory && <span>Память: {d.memory}</span>}
                          {d.color && <span>Цвет: {d.color}</span>}
                          {d.battery_health && <span>АКБ: {d.battery_health}</span>}
                          {d.brand && <span>Бренд: {d.brand}</span>}
                        </div>
                      </button>
                    ))
                  )}
                </div>
                {selectedDevice && (
                  <div className="rounded-lg bg-muted/30 border p-3 text-sm space-y-1">
                    <p className="font-medium">Выбрано: {selectedDevice.model} {selectedDevice.memory || ""} {selectedDevice.color || ""}</p>
                    <p className="text-xs text-muted-foreground font-mono">IMEI: {selectedDevice.imei}</p>
                    <p className="font-semibold">Цена: {selectedDevice.sale_price ? `${selectedDevice.sale_price} ₽` : "Не указана"}</p>
                  </div>
                )}
              </div>

              <div>
                <Label>Клиент</Label>
                <Select value={saleForm.client_id} onValueChange={(v) => setSaleForm({ ...saleForm, client_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Без клиента" /></SelectTrigger>
                  <SelectContent>
                    {clients.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Способ оплаты</Label>
                <Select value={saleForm.payment_method} onValueChange={(v) => setSaleForm({ ...saleForm, payment_method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Наличные</SelectItem>
                    <SelectItem value="card">Карта / QR</SelectItem>
                    <SelectItem value="transfer">Перевод</SelectItem>
                    <SelectItem value="installments">Рассрочка</SelectItem>
                    <SelectItem value="mixed">Смешанная</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={createSale.isPending || !saleForm.device_id}>
                {createSale.isPending ? "Оформление..." : "Оформить продажу"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="card-shadow overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Загрузка...</div>
        ) : sales.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">Нет продаж</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Товары</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Сумма</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Оплата</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Клиент</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Дата</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sales.map((s: any) => (
                  <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">{s.sale_items?.map((i: any) => i.name).join(", ") || "—"}</td>
                    <td className="px-4 py-3 font-semibold">{s.total} ₽</td>
                    <td className="px-4 py-3">{paymentLabels[s.payment_method] || s.payment_method}</td>
                    <td className="px-4 py-3">{s.clients?.name || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(s.created_at).toLocaleString("ru")}</td>
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

export default SalesPage;
