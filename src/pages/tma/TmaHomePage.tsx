import { useState } from "react";
import { ShoppingCart, Smartphone, DollarSign, Clock, Package, ArrowDownLeft, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const actionButtons = [
  { to: "/tma/sales", label: "Продажа", icon: ShoppingCart, color: "bg-emerald-500" },
  { to: "/tma/inventory", label: "Склад", icon: Smartphone, color: "bg-primary" },
  { to: "/tma/sales?new=1", label: "Приход", icon: Package, color: "bg-blue-500" },
  { to: "/tma/sales?buyback=1", label: "Скупка", icon: ArrowDownLeft, color: "bg-orange-500" },
  { to: "/tma/cash", label: "Касса", icon: DollarSign, color: "bg-amber-500" },
  { to: "/tma/shift", label: "Смена", icon: Clock, color: "bg-violet-500" },
];

const TmaHomePage = () => {
  const navigate = useNavigate();
  const { companyId, user } = useAuth();
  const [search, setSearch] = useState("");

  // Today's date bounds
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

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

  // Today sales
  const { data: todaySales = [] } = useQuery({
    queryKey: ["tma-today-sales", companyId, profile?.store_id],
    queryFn: async () => {
      if (!companyId) return [];
      let q = supabase.from("sales").select("id, total, payment_method").eq("company_id", companyId).gte("created_at", todayStart.toISOString());
      if (profile?.store_id) q = q.eq("store_id", profile.store_id);
      const { data } = await q;
      return data || [];
    },
    enabled: !!companyId,
    refetchInterval: 30000,
  });

  // Stock count
  const { data: stockCount = 0 } = useQuery({
    queryKey: ["tma-stock", companyId, profile?.store_id],
    queryFn: async () => {
      if (!companyId) return 0;
      let q = supabase.from("devices").select("id", { count: "exact", head: true }).eq("company_id", companyId).in("status", ["available", "testing", "reserved"]);
      if (profile?.store_id) q = q.eq("store_id", profile.store_id);
      const { count } = await q;
      return count || 0;
    },
    enabled: !!companyId,
  });

  // Active shift cash
  const { data: activeShift } = useQuery({
    queryKey: ["tma-active-shift", user?.id],
    queryFn: async () => {
      if (!user || !companyId) return null;
      const { data } = await supabase.from("shifts").select("*").eq("employee_id", user.id).eq("status", "active").eq("company_id", companyId).single();
      return data;
    },
    enabled: !!user && !!companyId,
  });

  // Cash operations for active shift
  const { data: cashOps = [] } = useQuery({
    queryKey: ["tma-cash-ops", activeShift?.id],
    queryFn: async () => {
      if (!activeShift) return [];
      const { data } = await supabase.from("cash_operations").select("amount, type").eq("shift_id", activeShift.id);
      return data || [];
    },
    enabled: !!activeShift,
  });

  const todayRevenue = todaySales.reduce((s, sale) => s + (sale.total || 0), 0);
  const todayCashSales = todaySales.filter(s => s.payment_method === "cash").reduce((s, sale) => s + (sale.total || 0), 0);
  const cashDeposits = cashOps.filter(o => o.type === "deposit").reduce((s, o) => s + o.amount, 0);
  const cashWithdraws = cashOps.filter(o => o.type === "withdraw").reduce((s, o) => s + o.amount, 0);
  const currentCash = (activeShift?.cash_start || 0) + todayCashSales + cashDeposits - cashWithdraws;

  const handleSearch = () => {
    if (search.trim()) {
      navigate(`/tma/inventory?search=${encodeURIComponent(search.trim())}`);
    }
  };

  return (
    <div className="space-y-5">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Поиск по IMEI, модели..."
          className="pl-10 h-12 rounded-xl text-base"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-card border p-3.5">
          <p className="text-xl font-bold">{todayRevenue.toLocaleString("ru")} ₽</p>
          <p className="text-xs text-muted-foreground">Выручка</p>
        </div>
        <div className="rounded-2xl bg-card border p-3.5">
          <p className="text-xl font-bold">{todaySales.length}</p>
          <p className="text-xs text-muted-foreground">Продажи</p>
        </div>
        <div className="rounded-2xl bg-card border p-3.5">
          <p className="text-xl font-bold">{stockCount}</p>
          <p className="text-xs text-muted-foreground">На складе</p>
        </div>
        <div className="rounded-2xl bg-card border p-3.5">
          <p className="text-xl font-bold">{currentCash.toLocaleString("ru")} ₽</p>
          <p className="text-xs text-muted-foreground">Наличные</p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-3 gap-3">
        {actionButtons.map((btn) => (
          <button
            key={btn.to}
            onClick={() => navigate(btn.to)}
            className="flex flex-col items-center gap-2.5 rounded-2xl border bg-card p-4 shadow-sm transition-all active:scale-95 min-h-[100px] justify-center"
          >
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${btn.color}`}>
              <btn.icon className="h-6 w-6 text-white" />
            </div>
            <span className="text-xs font-semibold">{btn.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default TmaHomePage;
