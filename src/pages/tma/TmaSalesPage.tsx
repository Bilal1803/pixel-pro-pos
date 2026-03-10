import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Trash2, ShoppingCart } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { sendTelegramNotification } from "@/lib/telegram";
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

const paymentMethods = [
  { value: "cash", label: "Наличные" },
  { value: "card", label: "Карта / QR" },
  { value: "transfer", label: "Перевод" },
  { value: "installments", label: "Рассрочка" },
];

const TmaSalesPage = () => {
  const { companyId, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [payment, setPayment] = useState("cash");
  const [step, setStep] = useState<"search" | "cart">("search");

  // Get employee profile for store_id
  const { data: profile } = useQuery({
    queryKey: ["tma-profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("store_id").eq("user_id", user.id).single();
      return data;
    },
    enabled: !!user,
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
    setCart(prev => [...prev, {
      id: crypto.randomUUID(),
      type: "device",
      name: `${device.brand || ""} ${device.model} ${device.memory || ""} ${device.color || ""}`.trim(),
      price: device.sale_price || 0,
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
      setCart(prev => [...prev, {
        id: crypto.randomUUID(),
        type: "accessory",
        name: product.name,
        price: product.sale_price || 0,
        cost_price: product.cost_price || 0,
        product_id: product.id,
        quantity: 1,
      }]);
    }
    setStep("cart");
  };

  const removeFromCart = (id: string) => setCart(prev => prev.filter(c => c.id !== id));

  const total = cart.reduce((s, c) => s + c.price * c.quantity, 0);

  const submitSale = useMutation({
    mutationFn: async () => {
      if (!companyId || !user || cart.length === 0) throw new Error("Корзина пуста");

      const { data: sale, error } = await supabase.from("sales").insert({
        company_id: companyId,
        employee_id: user.id,
        store_id: profile?.store_id || null,
        total,
        payment_method: payment as any,
      }).select().single();

      if (error) throw error;

      // Insert sale items
      const items = cart.map(c => ({
        sale_id: sale.id,
        item_type: c.type === "device" ? "device" : c.type === "accessory" ? "accessory" : "service" as any,
        name: c.name,
        price: c.price,
        cost_price: c.cost_price,
        device_id: c.device_id || null,
        product_id: c.product_id || null,
        quantity: c.quantity,
      }));

      await supabase.from("sale_items").insert(items);

      // Update device statuses to sold
      const deviceIds = cart.filter(c => c.device_id).map(c => c.device_id!);
      if (deviceIds.length > 0) {
        await supabase.from("devices").update({ status: "sold" as any }).in("id", deviceIds);
      }

      // Decrease product stock
      for (const item of cart.filter(c => c.product_id)) {
        await supabase.rpc("get_user_company_id"); // dummy to avoid direct SQL
        await supabase.from("products").update({
          stock: Math.max(0, (products.find(p => p.id === item.product_id)?.stock || 0) - item.quantity),
        }).eq("id", item.product_id!);
      }

      return sale;
    },
    onSuccess: () => {
      setCart([]);
      setStep("search");
      setSearch("");
      queryClient.invalidateQueries({ queryKey: ["tma-available-devices"] });
      queryClient.invalidateQueries({ queryKey: ["tma-products"] });
      queryClient.invalidateQueries({ queryKey: ["tma-today-sales"] });
      toast({ title: "Продажа оформлена ✓" });
    },
    onError: (e: any) => {
      toast({ title: "Ошибка", description: e.message, variant: "destructive" });
    },
  });

  if (step === "cart" && cart.length > 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">Корзина</h1>
          <Button variant="ghost" size="sm" onClick={() => setStep("search")}>
            <Plus className="h-4 w-4 mr-1" /> Добавить
          </Button>
        </div>

        <div className="space-y-2">
          {cart.map((item) => (
            <Card key={item.id} className="p-3 flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  {item.quantity > 1 && `${item.quantity} × `}{item.price.toLocaleString("ru")} ₽
                </p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeFromCart(item.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </Card>
          ))}
        </div>

        {/* Payment */}
        <div>
          <p className="text-sm font-medium mb-2">Способ оплаты</p>
          <div className="grid grid-cols-2 gap-2">
            {paymentMethods.map((pm) => (
              <button
                key={pm.value}
                onClick={() => setPayment(pm.value)}
                className={`rounded-xl border p-3 text-sm font-medium transition-all active:scale-95 ${
                  payment === pm.value ? "border-primary bg-primary/10 text-primary" : "bg-card"
                }`}
              >
                {pm.label}
              </button>
            ))}
          </div>
        </div>

        {/* Total & Submit */}
        <div className="rounded-2xl bg-primary p-4 text-primary-foreground">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm">Итого</span>
            <span className="text-xl font-bold">{total.toLocaleString("ru")} ₽</span>
          </div>
          <Button
            className="w-full h-12 text-base bg-primary-foreground text-primary hover:bg-primary-foreground/90"
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
      <h1 className="text-lg font-bold">Новая продажа</h1>

      {cart.length > 0 && (
        <Button className="w-full h-12" onClick={() => setStep("cart")}>
          <ShoppingCart className="h-5 w-5 mr-2" />
          Корзина ({cart.length}) — {total.toLocaleString("ru")} ₽
        </Button>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="IMEI, модель, название..."
          className="pl-10 h-12 rounded-xl text-base"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />
      </div>

      {/* Devices */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Устройства</p>
        {filteredDevices.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Устройства не найдены</p>
        ) : (
          <div className="space-y-2">
            {filteredDevices.map((d) => (
              <button
                key={d.id}
                onClick={() => addDevice(d)}
                disabled={!!cart.find(c => c.device_id === d.id)}
                className="w-full text-left rounded-xl border bg-card p-3 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                <p className="text-sm font-medium">{d.brand} {d.model}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">{d.memory} {d.color}</span>
                  <Badge variant="outline" className="text-[10px]">{d.imei.slice(-6)}</Badge>
                </div>
                <p className="text-sm font-bold mt-1">{(d.sale_price || 0).toLocaleString("ru")} ₽</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Accessories */}
      {products.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Аксессуары</p>
          <div className="space-y-2">
            {products.slice(0, 10).map((p) => (
              <button
                key={p.id}
                onClick={() => addProduct(p)}
                className="w-full text-left rounded-xl border bg-card p-3 transition-all active:scale-[0.98]"
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
