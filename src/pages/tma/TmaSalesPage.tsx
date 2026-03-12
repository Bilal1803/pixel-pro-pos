import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Trash2, ShoppingCart, Pencil, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { sendTelegramNotification } from "@/lib/telegram";
import { usePaymentSettings, calcFee } from "@/hooks/usePaymentSettings";
import { createSaleCashOperations } from "@/lib/saleCashSync";

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

const TmaSalesPage = () => {
  const { companyId, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { paymentSettings, getSettingByMethod } = usePaymentSettings();

  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [payment, setPayment] = useState("cash");
  const [mixedCashAmount, setMixedCashAmount] = useState("");
  const [mixedCardAmount, setMixedCardAmount] = useState("");
  const [step, setStep] = useState<"search" | "cart">("search");

  // Price editing
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [priceChangeReason, setPriceChangeReason] = useState("");
  const [priceWarning, setPriceWarning] = useState("");

  const { data: profile } = useQuery({
    queryKey: ["tma-profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("store_id").eq("user_id", user.id).single();
      return data;
    },
    enabled: !!user,
    staleTime: 5 * 60_000,
  });

  const { data: userRole } = useQuery({
    queryKey: ["user-role", user?.id],
    queryFn: async () => {
      if (!user) return "employee";
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
      return data?.role || "employee";
    },
    enabled: !!user,
    staleTime: 5 * 60_000,
  });

  const { data: devices = [] } = useQuery({
    queryKey: ["tma-available-devices", companyId, profile?.store_id],
    queryFn: async () => {
      if (!companyId) return [];
      let q = supabase.from("devices").select("*").eq("company_id", companyId).eq("status", "available");
      if (profile?.store_id) q = q.eq("store_id", profile.store_id);
      const { data } = await q;
      return data || [];
    },
    enabled: !!companyId,
    staleTime: 30_000,
  });

  const { data: products = [] } = useQuery({
    queryKey: ["tma-products", companyId, profile?.store_id],
    queryFn: async () => {
      if (!companyId) return [];
      let q = supabase.from("products").select("*").eq("company_id", companyId).gt("stock", 0);
      if (profile?.store_id) q = q.eq("store_id", profile.store_id);
      const { data } = await q;
      return data || [];
    },
    enabled: !!companyId,
    staleTime: 30_000,
  });

  const filteredDevices = useMemo(() => {
    if (!search.trim()) return devices.slice(0, 20);
    const q = search.toLowerCase();
    return devices.filter(d =>
      d.model.toLowerCase().includes(q) ||
      d.imei.toLowerCase().includes(q) ||
      (d.brand || "").toLowerCase().includes(q)
    ).slice(0, 20);
  }, [devices, search]);

  const addDevice = (device: any) => {
    if (cart.find(c => c.device_id === device.id)) return;
    const price = device.sale_price || 0;
    setCart(prev => [...prev, {
      id: crypto.randomUUID(),
      type: "device",
      name: `${device.brand || ""} ${device.model} ${device.memory || ""} ${device.color || ""}`.trim(),
      price,
      originalPrice: price,
      cost_price: device.purchase_price || 0,
      device_id: device.id,
      quantity: 1,
    }]);
    setStep("cart");
  };

  const addProduct = (product: any) => {
    const existing = cart.find(c => c.product_id === product.id);
    if (existing) {
      setCart(prev => prev.map(c => c.product_id === product.id ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      const price = product.sale_price || 0;
      setCart(prev => [...prev, {
        id: crypto.randomUUID(),
        type: "accessory",
        name: product.name,
        price,
        originalPrice: price,
        cost_price: product.cost_price || 0,
        product_id: product.id,
        quantity: 1,
      }]);
    }
    setStep("cart");
  };

  const removeFromCart = (id: string) => setCart(prev => prev.filter(c => c.id !== id));

  // Price editing
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

    const discountPercent = item.originalPrice > 0
      ? ((item.originalPrice - newPrice) / item.originalPrice) * 100
      : 0;

    const limit = ROLE_DISCOUNT_LIMITS[userRole || "employee"] || 5;
    if (discountPercent > limit) {
      setPriceWarning(`Скидка ${discountPercent.toFixed(1)}% превышает лимит ${limit}%`);
      return;
    }

    if (newPrice !== item.originalPrice && !priceChangeReason.trim()) {
      setPriceWarning("Укажите причину изменения цены");
      return;
    }

    setCart(prev => prev.map(i => i.id === editingItemId ? { ...i, price: newPrice } : i));
    setEditingItemId(null);
  };

  const cartProductTotal = cart.reduce((s, c) => s + c.price * c.quantity, 0);
  const currentPaymentSetting = getSettingByMethod(payment);
  const { fee: paymentFee, total } = calcFee(cartProductTotal, currentPaymentSetting);
  const hasPriceChanges = cart.some(i => i.price !== i.originalPrice);

  const mixedCash = payment === "mixed" ? Number(mixedCashAmount) || 0 : 0;
  const mixedCard = payment === "mixed" ? Number(mixedCardAmount) || 0 : 0;
  const mixedTotal = mixedCash + mixedCard;

  const activePaymentMethods = paymentSettings.length > 0
    ? [...paymentSettings, { method: "mixed", label: "Смешанная", percent_fee: 0, fixed_fee: 0 }]
    : [
        { method: "cash", label: "Наличные", percent_fee: 0, fixed_fee: 0 },
        { method: "card", label: "Карта / QR", percent_fee: 0, fixed_fee: 0 },
        { method: "transfer", label: "Перевод", percent_fee: 0, fixed_fee: 0 },
        { method: "installments", label: "Рассрочка", percent_fee: 0, fixed_fee: 0 },
        { method: "mixed", label: "Смешанная", percent_fee: 0, fixed_fee: 0 },
      ];

  const submitSale = useMutation({
    mutationFn: async () => {
      if (!companyId || !user || cart.length === 0) throw new Error("Корзина пуста");
      if (payment === "mixed" && mixedTotal <= 0) throw new Error("Укажите суммы для смешанной оплаты");

      const saleTotal = payment === "mixed" ? mixedTotal : total;

      const reasons = cart
        .filter(i => i.price !== i.originalPrice)
        .map(i => `${i.name}: ${i.originalPrice} → ${i.price} ₽`)
        .join("; ");

      const { data: sale, error } = await supabase.from("sales").insert({
        company_id: companyId,
        employee_id: user.id,
        store_id: profile?.store_id || null,
        total: saleTotal,
        payment_method: payment as any,
        payment_fee: payment === "mixed" ? 0 : paymentFee,
        price_change_reason: hasPriceChanges && priceChangeReason ? `${priceChangeReason}${reasons ? ` (${reasons})` : ""}` : null,
      }).select().single();

      if (error) throw error;

      const items = cart.map(c => ({
        sale_id: sale.id,
        item_type: c.type === "device" ? "device" : c.type === "accessory" ? "accessory" : "service" as any,
        name: c.name,
        price: c.price,
        cost_price: c.cost_price,
        original_price: c.originalPrice !== c.price ? c.originalPrice : null,
        device_id: c.device_id || null,
        product_id: c.product_id || null,
        quantity: c.quantity,
      }));

      await supabase.from("sale_items").insert(items);

      const deviceIds = cart.filter(c => c.device_id).map(c => c.device_id!);
      if (deviceIds.length > 0) {
        await supabase.from("devices").update({ status: "sold" as any }).in("id", deviceIds);
      }

      for (const item of cart.filter(c => c.product_id)) {
        await supabase.from("products").update({
          stock: Math.max(0, (products.find(p => p.id === item.product_id)?.stock || 0) - item.quantity),
        }).eq("id", item.product_id!);
      }

      // Auto-create cash operation for cash register sync
      await createSaleCashOperations({
        companyId,
        employeeId: user.id,
        storeId: profile?.store_id || null,
        paymentMethod: payment,
        totalAmount: saleTotal,
        cashAmount: payment === "mixed" ? mixedCash : undefined,
        saleId: sale.id,
      });

      const pmLabel = activePaymentMethods.find(p => p.method === payment)?.label || payment;
      return { sale, cartItems: cart, totalAmount: saleTotal, paymentLabel: pmLabel, paymentFee: payment === "mixed" ? 0 : paymentFee };
    },
    onSuccess: (result) => {
      setCart([]);
      setStep("search");
      setSearch("");
      setPriceChangeReason("");
      setMixedCashAmount("");
      setMixedCardAmount("");
      queryClient.invalidateQueries({ queryKey: ["tma-available-devices"] });
      queryClient.invalidateQueries({ queryKey: ["tma-products"] });
      queryClient.invalidateQueries({ queryKey: ["tma-today-sales"] });
      queryClient.invalidateQueries({ queryKey: ["tma-cash-ops"] });
      queryClient.invalidateQueries({ queryKey: ["tma-cash-sales-total"] });
      toast({ title: "Продажа оформлена ✓" });

      if (companyId) {
        const items = result.cartItems.map((c: CartItem) => `  • ${c.name} — ${(c.price * c.quantity).toLocaleString("ru")} ₽`).join("\n");
        let feeText = "";
        if (result.paymentFee > 0) feeText = `\n📊 Комиссия: ${result.paymentFee.toLocaleString("ru")} ₽`;
        sendTelegramNotification(
          companyId,
          "sale",
          `🛒 <b>Новая продажа</b>\n\n${items}\n\n💰 Итого: <b>${result.totalAmount.toLocaleString("ru")} ₽</b>${feeText}\n💳 ${result.paymentLabel}`
        );
      }
    },
    onError: (e: any) => {
      toast({ title: "Ошибка", description: e.message, variant: "destructive" });
    },
  });

  if (step === "cart" && cart.length > 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">Корзина</h1>
          <Button variant="ghost" size="sm" onClick={() => setStep("search")}>
            <Plus className="h-4 w-4 mr-1" /> Добавить
          </Button>
        </div>

        <div className="space-y-2">
          {cart.map((item) => (
            <Card key={item.id} className="p-3 bg-white border-gray-100 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <div className="flex items-center gap-2">
                    {item.price !== item.originalPrice && (
                      <span className="text-xs text-muted-foreground line-through">{item.originalPrice.toLocaleString("ru")} ₽</span>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {item.quantity > 1 && `${item.quantity} × `}{item.price.toLocaleString("ru")} ₽
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEditPrice(item)}>
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeFromCart(item.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>

              {editingItemId === item.id && (
                <div className="mt-2 space-y-2 rounded-lg bg-muted/30 p-2">
                  <Input
                    type="number"
                    value={editPrice}
                    onChange={e => { setEditPrice(e.target.value); setPriceWarning(""); }}
                    className="h-9"
                    min="0"
                    autoFocus
                  />
                  {Number(editPrice) !== item.originalPrice && (
                    <Input
                      placeholder="Причина изменения цены..."
                      value={priceChangeReason}
                      onChange={e => { setPriceChangeReason(e.target.value); setPriceWarning(""); }}
                      className="h-9 text-sm"
                    />
                  )}
                  {priceWarning && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> {priceWarning}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => setEditingItemId(null)}>Отмена</Button>
                    <Button size="sm" className="flex-1" onClick={confirmPriceChange}>Применить</Button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>

        {/* Payment methods */}
        <div>
          <p className="text-sm font-medium mb-2">Способ оплаты</p>
          <div className="grid grid-cols-2 gap-2">
            {activePaymentMethods.map((pm: any) => {
              const { fee, total: methodTotal } = pm.method === "mixed" 
                ? { fee: 0, total: cartProductTotal }
                : calcFee(cartProductTotal, pm);
              return (
                <button
                  key={pm.method}
                  onClick={() => { setPayment(pm.method); setMixedCashAmount(""); setMixedCardAmount(""); }}
                  className={`rounded-xl border p-3 text-left transition-all active:scale-95 ${
                    payment === pm.method ? "border-primary bg-primary/10" : "bg-card"
                  }`}
                >
                  <p className={`text-sm font-medium ${payment === pm.method ? "text-primary" : ""}`}>{pm.label}</p>
                  <p className="text-xs font-bold mt-0.5">{methodTotal.toLocaleString("ru")} ₽</p>
                  {fee > 0 && <p className="text-[10px] text-muted-foreground">комиссия: {fee.toLocaleString("ru")} ₽</p>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Mixed payment split */}
        {payment === "mixed" && (
          <div className="rounded-xl border p-3 space-y-3 bg-muted/30">
            <p className="text-sm font-semibold">Смешанная оплата</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Наличные</p>
                <Input
                  type="number"
                  placeholder="0"
                  value={mixedCashAmount}
                  onChange={e => setMixedCashAmount(e.target.value)}
                  className="h-10"
                  min="0"
                />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Карта / Безнал</p>
                <Input
                  type="number"
                  placeholder="0"
                  value={mixedCardAmount}
                  onChange={e => setMixedCardAmount(e.target.value)}
                  className="h-10"
                  min="0"
                />
              </div>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Итого</span>
              <span className="font-bold">{mixedTotal.toLocaleString("ru")} ₽</span>
            </div>
          </div>
        )}

        {/* Price change reason */}
        {hasPriceChanges && (
          <Input
            placeholder="Причина изменения цены..."
            value={priceChangeReason}
            onChange={e => setPriceChangeReason(e.target.value)}
            className="h-10"
          />
        )}

        {/* Total & Submit */}
        <div className="rounded-2xl bg-blue-600 p-4 text-white">
          <div className="space-y-1 mb-3">
            <div className="flex items-center justify-between text-sm opacity-80">
              <span>Стоимость товаров</span>
              <span>{cartProductTotal.toLocaleString("ru")} ₽</span>
            </div>
            {paymentFee > 0 && (
              <div className="flex items-center justify-between text-sm opacity-80">
                <span>Комиссия оплаты</span>
                <span>+{paymentFee.toLocaleString("ru")} ₽</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm">Итого</span>
              <span className="text-xl font-bold">{total.toLocaleString("ru")} ₽</span>
            </div>
          </div>
          <Button
            className="w-full h-12 text-base bg-white text-blue-600 hover:bg-blue-50"
            onClick={() => submitSale.mutate()}
            disabled={submitSale.isPending}
          >
            <ShoppingCart className="h-5 w-5 mr-2" />
            {submitSale.isPending ? "Оформление..." : "Оформить продажу"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-gray-900">Новая продажа</h1>

      {cart.length > 0 && (
        <Button className="w-full h-12" onClick={() => setStep("cart")}>
          <ShoppingCart className="h-5 w-5 mr-2" />
          Корзина ({cart.length}) — {total.toLocaleString("ru")} ₽
        </Button>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="IMEI, модель, название..."
          className="pl-10 h-12 rounded-xl text-sm bg-white border-gray-200 shadow-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />
      </div>

      {/* Devices */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Устройства</p>
        {filteredDevices.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">Устройства не найдены</p>
        ) : (
          <div className="space-y-2">
            {filteredDevices.map((d) => {
              const basePrice = d.sale_price || 0;
              return (
                <button
                  key={d.id}
                  onClick={() => addDevice(d)}
                  disabled={!!cart.find(c => c.device_id === d.id)}
                  className="w-full text-left rounded-xl bg-white border border-gray-100 p-3 shadow-sm active:scale-[0.98] transition-transform disabled:opacity-50"
                >
                  <p className="text-sm font-semibold text-gray-900">{d.brand} {d.model}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">{d.memory} {d.color}</span>
                    <Badge variant="outline" className="text-[10px]">{d.imei.slice(-6)}</Badge>
                  </div>
                  <p className="text-sm font-bold mt-1">{basePrice.toLocaleString("ru")} ₽</p>
                  {/* Payment variant prices */}
                  {paymentSettings.length > 0 && basePrice > 0 && (
                    <div className="flex flex-wrap gap-x-3 mt-1">
                      {paymentSettings.filter(ps => ps.percent_fee > 0 || ps.fixed_fee > 0).map(ps => {
                        const { total: methodTotal } = calcFee(basePrice, ps);
                        return (
                          <span key={ps.method} className="text-[10px] text-muted-foreground">
                            {ps.label}: {methodTotal.toLocaleString("ru")} ₽
                          </span>
                        );
                      })}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Accessories */}
      {products.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Аксессуары</p>
          <div className="space-y-2">
            {products.slice(0, 10).map((p) => (
              <button
                key={p.id}
                onClick={() => addProduct(p)}
                className="w-full text-left rounded-xl bg-white border border-gray-100 p-3 shadow-sm active:scale-[0.98] transition-transform"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{p.name}</p>
                  <span className="text-sm font-bold">{(p.sale_price || 0).toLocaleString("ru")} ₽</span>
                </div>
                <p className="text-xs text-muted-foreground">{p.stock} шт.</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TmaSalesPage;
