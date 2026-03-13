import { useState, useCallback, memo } from "react";
import { ShoppingCart, Smartphone, Banknote, Clock, Package, ArrowDownLeft, Search, TrendingUp, Hash, Box, Wallet, Award } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const actionButtons = [
  { to: "/tma/sales", label: "Продажа", icon: ShoppingCart, bg: "bg-emerald-50", iconColor: "text-emerald-600" },
  { to: "/tma/inventory", label: "Склад", icon: Smartphone, bg: "bg-blue-50", iconColor: "text-blue-600" },
  { to: "/tma/inventory", label: "Приход", icon: Package, bg: "bg-indigo-50", iconColor: "text-indigo-600" },
  { to: "/tma/sales", label: "Скупка", icon: ArrowDownLeft, bg: "bg-orange-50", iconColor: "text-orange-600" },
  { to: "/tma/cash", label: "Касса", icon: Banknote, bg: "bg-amber-50", iconColor: "text-amber-600" },
  { to: "/tma/shift", label: "Смена", icon: Clock, bg: "bg-violet-50", iconColor: "text-violet-600" },
];

const StatCard = memo(({ icon: Icon, label, value, iconColor, bg }: {
  icon: any; label: string; value: string; iconColor: string; bg: string;
}) => (
  <div className="bg-white rounded-xl border border-gray-100 p-3.5 shadow-sm">
    <div className="flex items-center gap-2 mb-2">
      <div className={`h-7 w-7 rounded-lg ${bg} flex items-center justify-center`}>
        <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
      </div>
    </div>
    <p className="text-xl font-bold text-gray-900 leading-tight">{value}</p>
    <p className="text-[11px] text-gray-500 mt-0.5">{label}</p>
  </div>
));

StatCard.displayName = "StatCard";

const TmaHomePage = () => {
  const navigate = useNavigate();
  const { companyId, user } = useAuth();
  const [search, setSearch] = useState("");

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayISO = todayStart.toISOString();

  const { data: profile } = useQuery({
    queryKey: ["tma-profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("store_id").eq("user_id", user.id).maybeSingle();
      return data;
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  const { data: todaySales = [] } = useQuery({
    queryKey: ["tma-today-sales", companyId, profile?.store_id, todayISO],
    queryFn: async () => {
      if (!companyId) return [];
      let q = supabase.from("sales").select("id, total, payment_method").eq("company_id", companyId).gte("created_at", todayISO);
      if (profile?.store_id) q = q.eq("store_id", profile.store_id);
      const { data } = await q;
      return data || [];
    },
    enabled: !!companyId,
    refetchInterval: 30_000,
  });

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
    staleTime: 10_000,
  });

  const { data: activeShift } = useQuery({
    queryKey: ["tma-active-shift", user?.id],
    queryFn: async () => {
      if (!user || !companyId) return null;
      const { data } = await supabase.from("shifts").select("id, cash_start, start_time").eq("employee_id", user.id).eq("status", "active").eq("company_id", companyId).maybeSingle();
      return data;
    },
    enabled: !!user && !!companyId,
    staleTime: 10_000,
  });

  const { data: cashOps = [] } = useQuery({
    queryKey: ["tma-cash-ops", activeShift?.id],
    queryFn: async () => {
      if (!activeShift) return [];
      const { data } = await supabase.from("cash_operations").select("amount, type").eq("shift_id", activeShift.id);
      return data || [];
    },
    enabled: !!activeShift,
    staleTime: 30_000,
  });

  // Today's salary accruals for this employee
  const { data: todaySalary = 0 } = useQuery({
    queryKey: ["tma-salary", companyId, user?.id, todayISO],
    queryFn: async () => {
      if (!companyId || !user) return 0;
      const { data } = await supabase
        .from("salary_accruals")
        .select("amount")
        .eq("company_id", companyId)
        .eq("employee_id", user.id)
        .gte("created_at", todayISO);
      return (data || []).reduce((s, a) => s + (a.amount || 0), 0);
    },
    enabled: !!companyId && !!user,
    staleTime: 30_000,
  });

  const todayRevenue = todaySales.reduce((s, sale) => s + (sale.total || 0), 0);
  const todayCashSales = todaySales.filter(s => s.payment_method === "cash").reduce((s, sale) => s + (sale.total || 0), 0);
  const cashDeposits = cashOps.filter(o => o.type === "deposit" || o.type === "sale_cash").reduce((s, o) => s + o.amount, 0);
  const cashWithdraws = cashOps.filter(o => o.type === "withdraw").reduce((s, o) => s + o.amount, 0);
  const currentCash = (activeShift?.cash_start || 0) + cashDeposits - cashWithdraws;

  const handleSearch = useCallback(() => {
    if (search.trim()) {
      navigate(`/tma/inventory?search=${encodeURIComponent(search.trim())}`);
    }
  }, [search, navigate]);

  return (
    <div className="space-y-5">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Поиск по IMEI, модели..."
          className="pl-10 h-12 rounded-xl text-sm bg-white border-gray-200 shadow-sm placeholder:text-gray-400"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={TrendingUp} label="Выручка" value={`${todayRevenue.toLocaleString("ru")} ₽`} iconColor="text-emerald-600" bg="bg-emerald-50" />
        <StatCard icon={Hash} label="Продажи" value={String(todaySales.length)} iconColor="text-blue-600" bg="bg-blue-50" />
        <StatCard icon={Award} label="Заработок" value={`${todaySalary.toLocaleString("ru")} ₽`} iconColor="text-purple-600" bg="bg-purple-50" />
        <StatCard icon={Box} label="На складе" value={String(stockCount)} iconColor="text-indigo-600" bg="bg-indigo-50" />
        <StatCard icon={Wallet} label="Наличные" value={`${currentCash.toLocaleString("ru")} ₽`} iconColor="text-amber-600" bg="bg-amber-50" />
      </div>

      {/* Quick actions */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Быстрые действия</p>
        <div className="grid grid-cols-3 gap-3">
          {actionButtons.map((btn) => (
            <button
              key={btn.label}
              onClick={() => navigate(btn.to)}
              className="flex flex-col items-center gap-2 bg-white rounded-xl border border-gray-100 p-4 shadow-sm active:scale-95 transition-transform min-h-[88px] justify-center"
            >
              <div className={`h-10 w-10 rounded-xl ${btn.bg} flex items-center justify-center`}>
                <btn.icon className={`h-5 w-5 ${btn.iconColor}`} />
              </div>
              <span className="text-[11px] font-semibold text-gray-700">{btn.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TmaHomePage;
