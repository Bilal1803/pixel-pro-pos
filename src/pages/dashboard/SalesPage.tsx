import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search, Smartphone, ShoppingBag, Wrench, Trash2, Undo2 } from "lucide-react";
import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import SectionHelp from "@/components/SectionHelp";
import { SECTION_TIPS } from "@/data/sectionTips";

type CartItem = {
  id: string;
  type: "device" | "accessory" | "service";
  name: string;
  price: number;
  cost_price: number;
  device_id?: string;
  product_id?: string;
  quantity: number;
};

const SalesPage = () => {
  const { companyId, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [deviceSearch, setDeviceSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [clientId, setClientId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [serviceName, setServiceName] = useState("");
  const [servicePrice, setServicePrice] = useState("");
  const [discountType, setDiscountType] = useState<"percent" | "fixed">("percent");
  const [discountValue, setDiscountValue] = useState("");

  // Return state
  const [returnOpen, setReturnOpen] = useState(false);
  const [returnTarget, setReturnTarget] = useState<any>(null);
  const [selectedReturnItems, setSelectedReturnItems] = useState<Set<string>>(new Set());

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ["sales", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("sales")
        .select("*, clients(name), sale_items(*, devices(model, imei, memory, color, battery_health, brand))")
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

  const { data: products = [] } = useQuery({
    queryKey: ["products", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase.from("products").select("*").eq("company_id", companyId);
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

  const devicesInCart = new Set(cart.filter(i => i.type === "device").map(i => i.device_id));
  const filteredDevices = useMemo(() => {
    const available = availableDevices.filter(d => !devicesInCart.has(d.id));
    if (!deviceSearch.trim()) return available;
    const q = deviceSearch.toLowerCase().trim();
    return available.filter(d =>
      d.model.toLowerCase().includes(q) ||
      d.imei.toLowerCase().includes(q) ||
      (d.brand && d.brand.toLowerCase().includes(q)) ||
      (d.memory && d.memory.toLowerCase().includes(q))
    );
  }, [availableDevices, deviceSearch, devicesInCart]);

  const filteredProducts = useMemo(() => {
    const avail = products.filter(p => (p.stock ?? 0) > 0);
    if (!productSearch.trim()) return avail;
    const q = productSearch.toLowerCase().trim();
    return avail.filter(p => p.name.toLowerCase().includes(q) || (p.category && p.category.toLowerCase().includes(q)));
  }, [products, productSearch]);

  const addDevice = (d: any) => {
    setCart(prev => [...prev, {
      id: crypto.randomUUID(),
      type: "device",
      name: `${d.model} ${d.memory || ""} ${d.color || ""}`.trim(),
      price: d.sale_price || 0,
      cost_price: d.purchase_price || 0,
      device_id: d.id,
      quantity: 1,
    }]);
  };

  const addProduct = (p: any) => {
    const existing = cart.find(i => i.type === "accessory" && i.product_id === p.id);
    if (existing) {
      setCart(prev => prev.map(i => i.id === existing.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setCart(prev => [...prev, {
        id: crypto.randomUUID(),
        type: "accessory",
        name: p.name,
        price: p.sale_price || 0,
        cost_price: p.cost_price || 0,
        product_id: p.id,
        quantity: 1,
      }]);
    }
  };

  const addService = () => {
    if (!serviceName.trim() || !servicePrice) return;
    setCart(prev => [...prev, {
      id: crypto.randomUUID(),
      type: "service",
      name: serviceName.trim(),
      price: parseFloat(servicePrice),
      cost_price: 0,
      quantity: 1,
    }]);
    setServiceName("");
    setServicePrice("");
  };

  const removeFromCart = (id: string) => setCart(prev => prev.filter(i => i.id !== id));

  const cartTotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const discountAmount = discountValue ? (discountType === "percent" ? Math.round(cartTotal * parseFloat(discountValue) / 100) : parseFloat(discountValue)) : 0;
  const finalTotal = Math.max(0, cartTotal - discountAmount);

  const resetForm = () => {
    setCart([]);
    setClientId("");
    setPaymentMethod("cash");
    setDeviceSearch("");
    setProductSearch("");
    setServiceName("");
    setServicePrice("");
    setDiscountType("percent");
    setDiscountValue("");
  };

  const createSale = useMutation({
    mutationFn: async () => {
      if (!companyId || !user) throw new Error("No company");
      if (cart.length === 0) throw new Error("Добавьте хотя бы один товар");

      const { data: sale, error: saleError } = await supabase.from("sales").insert({
        company_id: companyId,
        client_id: clientId || null,
        employee_id: user.id,
        total: finalTotal,
        discount: discountAmount || null,
        payment_method: paymentMethod as any,
      }).select().single();
      if (saleError) throw saleError;

      const saleItems = cart.map(i => ({
        sale_id: sale.id,
        item_type: i.type as any,
        device_id: i.device_id || null,
        product_id: i.product_id || null,
        name: i.name,
        price: i.price * i.quantity,
        cost_price: i.cost_price * i.quantity,
        quantity: i.quantity,
      }));

      const { error: itemError } = await supabase.from("sale_items").insert(saleItems);
      if (itemError) throw itemError;

      const deviceIds = cart.filter(i => i.type === "device" && i.device_id).map(i => i.device_id!);
      for (const did of deviceIds) {
        await supabase.from("devices").update({ status: "sold" as any }).eq("id", did);
      }

      for (const item of cart.filter(i => i.type === "accessory" && i.product_id)) {
        const prod = products.find(p => p.id === item.product_id);
        if (prod) {
          await supabase.from("products").update({ stock: (prod.stock ?? 0) - item.quantity }).eq("id", prod.id);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      queryClient.invalidateQueries({ queryKey: ["available-devices"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Продажа оформлена!" });
      setOpen(false);
      resetForm();
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  // Partial return
  const returnSale = useMutation({
    mutationFn: async ({ sale, itemIds }: { sale: any; itemIds: string[] }) => {
      const items = (sale.sale_items || []).filter((i: any) => itemIds.includes(i.id));
      const isFullReturn = items.length === (sale.sale_items || []).length;

      // Restore devices and stock for selected items
      for (const item of items) {
        if (item.item_type === "device" && item.device_id) {
          await supabase.from("devices").update({ status: "available" as any }).eq("id", item.device_id);
        }
        if (item.item_type === "accessory" && item.product_id) {
          const { data: prod } = await supabase.from("products").select("stock").eq("id", item.product_id).single();
          if (prod) {
            await supabase.from("products").update({ stock: (prod.stock ?? 0) + (item.quantity || 1) }).eq("id", item.product_id);
          }
        }
      }

      if (isFullReturn) {
        // Full return: delete all items and the sale
        await supabase.from("sale_items").delete().eq("sale_id", sale.id);
        await supabase.from("sales").delete().eq("id", sale.id);
      } else {
        // Partial return: delete selected items and update sale total
        const returnAmount = items.reduce((s: number, i: any) => s + Number(i.price || 0), 0);
        for (const item of items) {
          await supabase.from("sale_items").delete().eq("id", item.id);
        }
        const newTotal = Math.max(0, Number(sale.total) - returnAmount);
        await supabase.from("sales").update({ total: newTotal }).eq("id", sale.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      queryClient.invalidateQueries({ queryKey: ["available-devices"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["sales-dash"] });
      queryClient.invalidateQueries({ queryKey: ["devices-dash"] });
      setReturnOpen(false);
      setReturnTarget(null);
      setSelectedReturnItems(new Set());
      toast({ title: "Возврат оформлен", description: "Товары возвращены на склад" });
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const openReturnDialog = (sale: any) => {
    setReturnTarget(sale);
    // Pre-select all items
    const allIds = new Set<string>((sale.sale_items || []).map((i: any) => i.id));
    setSelectedReturnItems(allIds);
    setReturnOpen(true);
  };

  const toggleReturnItem = (itemId: string) => {
    setSelectedReturnItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const returnTotal = returnTarget
    ? (returnTarget.sale_items || [])
        .filter((i: any) => selectedReturnItems.has(i.id))
        .reduce((s: number, i: any) => s + Number(i.price || 0), 0)
    : 0;

  const paymentLabels: Record<string, string> = { cash: "Наличные", card: "Карта", transfer: "Перевод", installments: "Рассрочка", mixed: "Смешанная" };
  const typeIcons: Record<string, React.ReactNode> = {
    device: <Smartphone className="h-3.5 w-3.5" />,
    accessory: <ShoppingBag className="h-3.5 w-3.5" />,
    service: <Wrench className="h-3.5 w-3.5" />,
  };
  const typeLabels: Record<string, string> = { device: "Устройство", accessory: "Аксессуар", service: "Услуга" };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Продажи</h1>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Новая продажа</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
            <DialogHeader><DialogTitle>Оформить продажу</DialogTitle></DialogHeader>

            <div className="flex-1 overflow-y-auto space-y-4">
              <Tabs defaultValue="devices" className="w-full">
                <TabsList className="w-full">
                  <TabsTrigger value="devices" className="flex-1 gap-1.5"><Smartphone className="h-3.5 w-3.5" /> Устройства</TabsTrigger>
                  <TabsTrigger value="accessories" className="flex-1 gap-1.5"><ShoppingBag className="h-3.5 w-3.5" /> Аксессуары</TabsTrigger>
                  <TabsTrigger value="services" className="flex-1 gap-1.5"><Wrench className="h-3.5 w-3.5" /> Услуги</TabsTrigger>
                </TabsList>

                <TabsContent value="devices" className="space-y-2 mt-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="Поиск по модели или IMEI..." className="pl-9" value={deviceSearch} onChange={(e) => setDeviceSearch(e.target.value)} />
                  </div>
                  <div className="max-h-[180px] overflow-y-auto rounded-lg border divide-y">
                    {filteredDevices.length === 0 ? (
                      <div className="p-3 text-center text-sm text-muted-foreground">
                        {availableDevices.length === 0 ? "Нет устройств в наличии" : "Ничего не найдено"}
                      </div>
                    ) : (
                      filteredDevices.map(d => (
                        <button type="button" key={d.id} onClick={() => addDevice(d)}
                          className="w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">{d.model}</span>
                            <span className="font-semibold text-sm">{d.sale_price ? `${d.sale_price} ₽` : "—"}</span>
                          </div>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-xs text-muted-foreground">
                            <span className="font-mono">IMEI: {d.imei}</span>
                            {d.memory && <span>{d.memory}</span>}
                            {d.color && <span>{d.color}</span>}
                            {d.battery_health && <span>АКБ: {d.battery_health}</span>}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="accessories" className="space-y-2 mt-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="Поиск аксессуара..." className="pl-9" value={productSearch} onChange={(e) => setProductSearch(e.target.value)} />
                  </div>
                  <div className="max-h-[180px] overflow-y-auto rounded-lg border divide-y">
                    {filteredProducts.length === 0 ? (
                      <div className="p-3 text-center text-sm text-muted-foreground">Нет аксессуаров в наличии</div>
                    ) : (
                      filteredProducts.map(p => (
                        <button type="button" key={p.id} onClick={() => addProduct(p)}
                          className="w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors flex items-center justify-between">
                          <div>
                            <span className="font-medium text-sm">{p.name}</span>
                            {p.category && <span className="text-xs text-muted-foreground ml-2">{p.category}</span>}
                            <span className="text-xs text-muted-foreground ml-2">Остаток: {p.stock ?? 0}</span>
                          </div>
                          <span className="font-semibold text-sm">{p.sale_price ? `${p.sale_price} ₽` : "—"}</span>
                        </button>
                      ))
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="services" className="mt-3">
                  <div className="flex gap-2">
                    <Input placeholder="Название услуги" value={serviceName} onChange={(e) => setServiceName(e.target.value)} className="flex-1" />
                    <Input placeholder="Цена" type="number" value={servicePrice} onChange={(e) => setServicePrice(e.target.value)} className="w-28" />
                    <Button type="button" variant="outline" size="sm" onClick={addService} disabled={!serviceName.trim() || !servicePrice}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>

              {cart.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Корзина ({cart.length})</Label>
                  <div className="rounded-lg border divide-y">
                    {cart.map(item => (
                      <div key={item.id} className="flex items-center justify-between px-3 py-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-muted-foreground">{typeIcons[item.type]}</span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{item.name}</p>
                            <p className="text-xs text-muted-foreground">{typeLabels[item.type]}{item.quantity > 1 ? ` × ${item.quantity}` : ""}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-semibold text-sm">{item.price * item.quantity} ₽</span>
                          <button type="button" onClick={() => removeFromCart(item.id)} className="text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className="flex items-center justify-between px-3 py-2 bg-muted/30">
                      <span className="text-sm">Подытог</span>
                      <span className="text-sm">{cartTotal} ₽</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex items-center justify-between px-3 py-1.5 text-sm text-destructive">
                        <span>Скидка {discountType === "percent" ? `${discountValue}%` : ""}</span>
                        <span>−{discountAmount} ₽</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between px-3 py-2 bg-muted/50">
                      <span className="font-semibold text-sm">Итого</span>
                      <span className="font-bold">{finalTotal} ₽</span>
                    </div>
                  </div>

                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <Label className="text-xs">Скидка</Label>
                      <Input
                        type="number"
                        placeholder={discountType === "percent" ? "%" : "₽"}
                        value={discountValue}
                        onChange={(e) => setDiscountValue(e.target.value)}
                        min="0"
                      />
                    </div>
                    <Select value={discountType} onValueChange={(v) => { setDiscountType(v as any); setDiscountValue(""); }}>
                      <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percent">Процент %</SelectItem>
                        <SelectItem value="fixed">Сумма ₽</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Клиент</Label>
                  <Select value={clientId} onValueChange={setClientId}>
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
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
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
              </div>
            </div>

            <Button onClick={() => createSale.mutate()} className="w-full mt-4" disabled={createSale.isPending || cart.length === 0}>
              {createSale.isPending ? "Оформление..." : `Оформить продажу — ${finalTotal} ₽`}
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      <SectionHelp tips={SECTION_TIPS.sales} />

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
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sales.map((s: any) => (
                  <tr key={s.id} className="hover:bg-muted/30 transition-colors align-top">
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        {(s.sale_items || []).map((item: any, idx: number) => {
                          const dev = item.devices;
                          const icon = item.item_type === "device" ? "📱" : item.item_type === "accessory" ? "🎧" : item.item_type === "service" ? "🔧" : "";
                          return (
                            <div key={idx}>
                              <span className="text-sm">{icon} {item.name}</span>
                              {dev && (
                                <p className="text-xs text-muted-foreground">
                                  IMEI: {dev.imei}{dev.memory && ` · ${dev.memory}`}{dev.color && ` · ${dev.color}`}{dev.battery_health && ` · АКБ ${dev.battery_health}`}
                                </p>
                              )}
                              {item.quantity > 1 && <span className="text-xs text-muted-foreground"> ×{item.quantity}</span>}
                            </div>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold">{s.total} ₽</td>
                    <td className="px-4 py-3">{paymentLabels[s.payment_method] || s.payment_method}</td>
                    <td className="px-4 py-3">{s.clients?.name || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(s.created_at).toLocaleString("ru")}</td>
                    <td className="px-4 py-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => openReturnDialog(s)}
                        title="Возврат"
                      >
                        <Undo2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Partial return dialog */}
      <Dialog open={returnOpen} onOpenChange={(v) => { setReturnOpen(v); if (!v) { setReturnTarget(null); setSelectedReturnItems(new Set()); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Возврат товаров</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Выберите позиции для возврата. Устройства вернутся на склад, остатки аксессуаров будут восстановлены.
          </p>
          {returnTarget && (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {(returnTarget.sale_items || []).map((item: any) => {
                const isChecked = selectedReturnItems.has(item.id);
                return (
                  <label
                    key={item.id}
                    className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() => toggleReturnItem(item.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.item_type === "device" ? "Устройство" : item.item_type === "accessory" ? "Аксессуар" : "Услуга"}
                        {item.quantity > 1 ? ` × ${item.quantity}` : ""}
                      </p>
                    </div>
                    <span className="text-sm font-semibold shrink-0">{Number(item.price).toLocaleString("ru")} ₽</span>
                  </label>
                );
              })}
            </div>
          )}
          <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
            <span className="text-sm font-medium">Сумма возврата</span>
            <span className="text-lg font-bold text-destructive">{returnTotal.toLocaleString("ru")} ₽</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setReturnOpen(false)}>Отмена</Button>
            <Button
              variant="destructive"
              className="flex-1"
              disabled={selectedReturnItems.size === 0 || returnSale.isPending}
              onClick={() => returnTarget && returnSale.mutate({ sale: returnTarget, itemIds: Array.from(selectedReturnItems) })}
            >
              {returnSale.isPending ? "Возврат..." : "Оформить возврат"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SalesPage;
