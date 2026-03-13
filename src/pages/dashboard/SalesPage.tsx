import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search, Smartphone, ShoppingBag, Wrench, Trash2, Undo2, Pencil, AlertTriangle } from "lucide-react";
import { createSaleCashOperations } from "@/lib/saleCashSync";
import { createSalaryAccruals } from "@/lib/salaryCalc";
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
import { usePaymentSettings, calcFee } from "@/hooks/usePaymentSettings";

type CartItem = {
  id: string;
  type: "device" | "accessory" | "service";
  name: string;
  price: number;
  originalPrice: number;
  cost_price: number;
  device_id?: string;
  product_id?: string;
  quantity: number;
};

const ROLE_DISCOUNT_LIMITS: Record<string, number> = {
  employee: 5,
  manager: 20,
  owner: 100,
};

const SalesPage = () => {
  const { companyId, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { paymentSettings, getSettingByMethod } = usePaymentSettings();
  const [open, setOpen] = useState(false);
  const [deviceSearch, setDeviceSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [clientId, setClientId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [mixedCashAmount, setMixedCashAmount] = useState("");
  const [mixedCardAmount, setMixedCardAmount] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [servicePrice, setServicePrice] = useState("");
  const [discountType, setDiscountType] = useState<"percent" | "fixed">("percent");
  const [discountValue, setDiscountValue] = useState("");

  // Price editing
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [priceChangeReason, setPriceChangeReason] = useState("");
  const [priceWarning, setPriceWarning] = useState("");

  // Return state
  const [returnOpen, setReturnOpen] = useState(false);
  const [returnTarget, setReturnTarget] = useState<any>(null);
  const [selectedReturnItems, setSelectedReturnItems] = useState<Set<string>>(new Set());

  // User role
  const { data: userRole } = useQuery({
    queryKey: ["user-role", user?.id],
    queryFn: async () => {
      if (!user) return "employee";
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
      return data?.role || "employee";
    },
    enabled: !!user,
  });

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
    const price = d.sale_price || 0;
    setCart(prev => [...prev, {
      id: crypto.randomUUID(),
      type: "device",
      name: `${d.model} ${d.memory || ""} ${d.color || ""}`.trim(),
      price,
      originalPrice: price,
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
      const price = p.sale_price || 0;
      setCart(prev => [...prev, {
        id: crypto.randomUUID(),
        type: "accessory",
        name: p.name,
        price,
        originalPrice: price,
        cost_price: p.cost_price || 0,
        product_id: p.id,
        quantity: 1,
      }]);
    }
  };

  const addService = () => {
    if (!serviceName.trim() || !servicePrice) return;
    const price = parseFloat(servicePrice);
    setCart(prev => [...prev, {
      id: crypto.randomUUID(),
      type: "service",
      name: serviceName.trim(),
      price,
      originalPrice: price,
      cost_price: 0,
      quantity: 1,
    }]);
    setServiceName("");
    setServicePrice("");
  };

  const removeFromCart = (id: string) => setCart(prev => prev.filter(i => i.id !== id));

  // Price editing logic
  const startEditPrice = (item: CartItem) => {
    setEditingItemId(item.id);
    setEditPrice(String(item.price));
    setPriceWarning("");
    setPriceChangeReason("");
  };

  const confirmPriceChange = () => {
    if (!editingItemId) return;
    const item = cart.find(i => i.id === editingItemId);
    if (!item) return;
    const newPrice = Number(editPrice);
    if (newPrice < 0) return;

    // Check role limit
    const discountPercent = item.originalPrice > 0
      ? ((item.originalPrice - newPrice) / item.originalPrice) * 100
      : 0;

    const limit = ROLE_DISCOUNT_LIMITS[userRole || "employee"] || 5;
    if (discountPercent > limit) {
      setPriceWarning(`Скидка ${discountPercent.toFixed(1)}% превышает лимит ${limit}% для вашей роли`);
      return;
    }

    if (newPrice !== item.originalPrice && !priceChangeReason.trim()) {
      setPriceWarning("Укажите причину изменения цены");
      return;
    }

    setCart(prev => prev.map(i => i.id === editingItemId ? { ...i, price: newPrice } : i));
    setEditingItemId(null);
    setEditPrice("");
    setPriceWarning("");
    setPriceChangeReason("");
  };

  const cartTotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const discountAmount = discountValue ? (discountType === "percent" ? Math.round(cartTotal * parseFloat(discountValue) / 100) : parseFloat(discountValue)) : 0;
  const productTotal = Math.max(0, cartTotal - discountAmount);

  // Payment fee calculation
  const currentPaymentSetting = getSettingByMethod(paymentMethod);
  const { fee: paymentFee, total: finalTotal } = calcFee(productTotal, currentPaymentSetting);

  const hasPriceChanges = cart.some(i => i.price !== i.originalPrice);

  // For mixed payment, override finalTotal
  const mixedCash = paymentMethod === "mixed" ? Number(mixedCashAmount) || 0 : 0;
  const mixedCard = paymentMethod === "mixed" ? Number(mixedCardAmount) || 0 : 0;
  const mixedTotal = mixedCash + mixedCard;

  // Profile for store_id
  const { data: saleProfile } = useQuery({
    queryKey: ["sale-profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("store_id").eq("user_id", user.id).maybeSingle();
      return data;
    },
    enabled: !!user,
    staleTime: 5 * 60_000,
  });

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
    setEditingItemId(null);
    setPriceChangeReason("");
    setMixedCashAmount("");
    setMixedCardAmount("");
  };

  const createSale = useMutation({
    mutationFn: async () => {
      if (!companyId || !user) throw new Error("No company");
      if (cart.length === 0) throw new Error("Добавьте хотя бы один товар");
      if (paymentMethod === "mixed" && mixedTotal <= 0) throw new Error("Укажите суммы для смешанной оплаты");

      const saleTotal = paymentMethod === "mixed" ? mixedTotal : finalTotal;

      // Collect price change reasons
      const reasons = cart
        .filter(i => i.price !== i.originalPrice)
        .map(i => `${i.name}: ${i.originalPrice} → ${i.price} ₽`)
        .join("; ");

      const { data: sale, error: saleError } = await supabase.from("sales").insert({
        company_id: companyId,
        client_id: clientId || null,
        employee_id: user.id,
        store_id: saleProfile?.store_id || null,
        total: saleTotal,
        discount: discountAmount || null,
        payment_method: paymentMethod as any,
        payment_fee: paymentMethod === "mixed" ? 0 : paymentFee,
        price_change_reason: (hasPriceChanges && priceChangeReason) ? `${priceChangeReason}${reasons ? ` (${reasons})` : ""}` : null,
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
        original_price: i.originalPrice !== i.price ? i.originalPrice * i.quantity : null,
        quantity: i.quantity,
      }));

      const { data: insertedItems, error: itemError } = await supabase.from("sale_items").insert(saleItems).select();
      if (itemError) throw itemError;

      const deviceIds = cart.filter(i => i.type === "device" && i.device_id).map(i => i.device_id!);
      
      // Build device sale prices map for above_price calculation
      const deviceSalePrices: Record<string, number> = {};
      for (const item of cart.filter(i => i.type === "device" && i.device_id)) {
        const dev = availableDevices.find(d => d.id === item.device_id);
        if (dev?.sale_price) deviceSalePrices[item.device_id!] = dev.sale_price;
      }

      for (const did of deviceIds) {
        await supabase.from("devices").update({ status: "sold" as any }).eq("id", did);
      }

      for (const item of cart.filter(i => i.type === "accessory" && i.product_id)) {
        const prod = products.find(p => p.id === item.product_id);
        if (prod) {
          await supabase.from("products").update({ stock: (prod.stock ?? 0) - item.quantity }).eq("id", prod.id);
        }
      }

      // Auto-create cash operation for cash register sync
      await createSaleCashOperations({
        companyId,
        employeeId: user.id,
        storeId: saleProfile?.store_id || null,
        paymentMethod,
        totalAmount: saleTotal,
        cashAmount: paymentMethod === "mixed" ? mixedCash : undefined,
        saleId: sale.id,
      });

      // Auto-calculate salary accruals
      if (insertedItems && insertedItems.length > 0) {
        const salaryItems = insertedItems.map((si: any, idx: number) => ({
          item_type: cart[idx].type,
          price: si.price,
          original_price: si.original_price,
          cost_price: si.cost_price,
          device_id: si.device_id,
          name: si.name,
          sale_item_id: si.id,
        }));
        
        await createSalaryAccruals({
          companyId,
          employeeId: user.id,
          saleId: sale.id,
          items: salaryItems,
          deviceSalePrices,
        });
      }
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      queryClient.invalidateQueries({ queryKey: ["available-devices"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["cash-ops"] });
      queryClient.invalidateQueries({ queryKey: ["all-cash-ops"] });
      queryClient.invalidateQueries({ queryKey: ["cash-sales-total"] });
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
        await supabase.from("sale_items").delete().eq("sale_id", sale.id);
        await supabase.from("sales").delete().eq("id", sale.id);
      } else {
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

  // Build payment labels from settings
  const activePaymentLabels = paymentSettings.length > 0
    ? Object.fromEntries(paymentSettings.map(s => [s.method, s.label]))
    : paymentLabels;

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
                      filteredDevices.map(d => {
                        // Show prices for all payment methods
                        const basePrice = d.sale_price || 0;
                        return (
                          <button type="button" key={d.id} onClick={() => addDevice(d)}
                            className="w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm">{d.model}</span>
                              <span className="font-semibold text-sm">{basePrice ? `${basePrice.toLocaleString("ru")} ₽` : "—"}</span>
                            </div>
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-xs text-muted-foreground">
                              <span className="font-mono">IMEI: {d.imei}</span>
                              {d.memory && <span>{d.memory}</span>}
                              {d.color && <span>{d.color}</span>}
                              {d.battery_health && <span>АКБ: {d.battery_health}</span>}
                            </div>
                            {/* Payment method price variants */}
                            {paymentSettings.length > 0 && basePrice > 0 && (
                              <div className="flex flex-wrap gap-x-3 mt-1 text-xs">
                                {paymentSettings.map(ps => {
                                  const { total } = calcFee(basePrice, ps);
                                  return (
                                    <span key={ps.method} className="text-muted-foreground">
                                      {ps.label}: <span className="font-medium text-foreground">{total.toLocaleString("ru")} ₽</span>
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </button>
                        );
                      })
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
                      <div key={item.id} className="px-3 py-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-muted-foreground">{typeIcons[item.type]}</span>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{item.name}</p>
                              <p className="text-xs text-muted-foreground">{typeLabels[item.type]}{item.quantity > 1 ? ` × ${item.quantity}` : ""}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {item.price !== item.originalPrice && (
                              <span className="text-xs text-muted-foreground line-through">{(item.originalPrice * item.quantity).toLocaleString("ru")} ₽</span>
                            )}
                            <span className="font-semibold text-sm">{(item.price * item.quantity).toLocaleString("ru")} ₽</span>
                            <button type="button" onClick={() => startEditPrice(item)} className="text-muted-foreground hover:text-primary" title="Изменить цену">
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button type="button" onClick={() => removeFromCart(item.id)} className="text-muted-foreground hover:text-destructive">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Inline price editor */}
                        {editingItemId === item.id && (
                          <div className="mt-2 space-y-2 rounded-lg bg-muted/30 p-2">
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                value={editPrice}
                                onChange={e => { setEditPrice(e.target.value); setPriceWarning(""); }}
                                className="h-8 w-32"
                                min="0"
                                autoFocus
                              />
                              <span className="text-xs text-muted-foreground">₽</span>
                            </div>
                            {Number(editPrice) !== item.originalPrice && (
                              <Input
                                placeholder="Причина изменения цены..."
                                value={priceChangeReason}
                                onChange={e => { setPriceChangeReason(e.target.value); setPriceWarning(""); }}
                                className="h-8 text-sm"
                              />
                            )}
                            {priceWarning && (
                              <p className="text-xs text-destructive flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" /> {priceWarning}
                              </p>
                            )}
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditingItemId(null)}>Отмена</Button>
                              <Button size="sm" className="h-7 text-xs" onClick={confirmPriceChange}>Применить</Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    <div className="flex items-center justify-between px-3 py-2 bg-muted/30">
                      <span className="text-sm">Стоимость товаров</span>
                      <span className="text-sm">{cartTotal.toLocaleString("ru")} ₽</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex items-center justify-between px-3 py-1.5 text-sm text-destructive">
                        <span>Скидка {discountType === "percent" ? `${discountValue}%` : ""}</span>
                        <span>−{discountAmount.toLocaleString("ru")} ₽</span>
                      </div>
                    )}
                    {paymentFee > 0 && (
                      <div className="flex items-center justify-between px-3 py-1.5 text-sm text-muted-foreground">
                        <span>Комиссия оплаты ({currentPaymentSetting?.label})</span>
                        <span>+{paymentFee.toLocaleString("ru")} ₽</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between px-3 py-2 bg-muted/50">
                      <span className="font-semibold text-sm">Итого к оплате</span>
                      <span className="font-bold">{finalTotal.toLocaleString("ru")} ₽</span>
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

              {/* Payment method prices overview */}
              {cart.length > 0 && paymentSettings.length > 0 && (
                <div className="rounded-lg border p-3 space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Цены по способу оплаты</p>
                  <div className="grid grid-cols-2 gap-2">
                    {paymentSettings.map(ps => {
                      const { fee, total } = calcFee(productTotal, ps);
                      return (
                        <button
                          key={ps.method}
                          type="button"
                          onClick={() => setPaymentMethod(ps.method)}
                          className={`rounded-lg border p-2 text-left transition-all ${
                            paymentMethod === ps.method ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted/50"
                          }`}
                        >
                          <p className="text-xs text-muted-foreground">{ps.label}</p>
                          <p className="text-sm font-bold">{total.toLocaleString("ru")} ₽</p>
                          {fee > 0 && <p className="text-[10px] text-muted-foreground">комиссия: {fee.toLocaleString("ru")} ₽</p>}
                        </button>
                      );
                    })}
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
                  <Select value={paymentMethod} onValueChange={(v) => { setPaymentMethod(v); setMixedCashAmount(""); setMixedCardAmount(""); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {paymentSettings.length > 0 ? (
                        <>
                          {paymentSettings.map(ps => (
                            <SelectItem key={ps.method} value={ps.method}>{ps.label}</SelectItem>
                          ))}
                          <SelectItem value="mixed">Смешанная</SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="cash">Наличные</SelectItem>
                          <SelectItem value="card">Карта / QR</SelectItem>
                          <SelectItem value="transfer">Перевод</SelectItem>
                          <SelectItem value="installments">Рассрочка</SelectItem>
                          <SelectItem value="mixed">Смешанная</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Mixed payment split */}
              {paymentMethod === "mixed" && cart.length > 0 && (
                <div className="rounded-lg border p-3 space-y-3 bg-muted/30">
                  <p className="text-sm font-semibold">Смешанная оплата</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Наличные</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={mixedCashAmount}
                        onChange={e => setMixedCashAmount(e.target.value)}
                        min="0"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Карта / Безнал</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={mixedCardAmount}
                        onChange={e => setMixedCardAmount(e.target.value)}
                        min="0"
                      />
                    </div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Итого</span>
                    <span className="font-bold">{mixedTotal.toLocaleString("ru")} ₽</span>
                  </div>
                  {mixedTotal > 0 && mixedTotal !== productTotal && (
                    <p className="text-xs text-amber-600">⚠ Сумма ({mixedTotal.toLocaleString("ru")} ₽) отличается от стоимости товаров ({productTotal.toLocaleString("ru")} ₽)</p>
                  )}
                </div>
              )}

              {/* Price change reason (global) */}
              {hasPriceChanges && (
                <div>
                  <Label className="text-xs text-amber-600">Причина изменения цены</Label>
                  <Input
                    placeholder="Скидка клиенту, дефект упаковки, договорённость..."
                    value={priceChangeReason}
                    onChange={e => setPriceChangeReason(e.target.value)}
                  />
                </div>
              )}
            </div>

            <Button onClick={() => createSale.mutate()} className="w-full mt-4" disabled={createSale.isPending || cart.length === 0}>
              {createSale.isPending ? "Оформление..." : `Оформить продажу — ${finalTotal.toLocaleString("ru")} ₽`}
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      <SectionHelp tips={SECTION_TIPS.sales} sectionKey="sales" />

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
                              {item.original_price != null && item.original_price !== item.price && (
                                <span className="text-xs text-amber-600 ml-2">(было: {Number(item.original_price).toLocaleString("ru")} ₽)</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold">{Number(s.total).toLocaleString("ru")} ₽</span>
                      {Number(s.payment_fee) > 0 && (
                        <p className="text-xs text-muted-foreground">комиссия: {Number(s.payment_fee).toLocaleString("ru")} ₽</p>
                      )}
                    </td>
                    <td className="px-4 py-3">{activePaymentLabels[s.payment_method] || paymentLabels[s.payment_method] || s.payment_method}</td>
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
