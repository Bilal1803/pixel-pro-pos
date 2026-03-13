import { useState, useMemo, memo } from "react";
import { TrendingUp, Hash, DollarSign, CreditCard, Wallet, BarChart3, Award } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

type Period = "day" | "week" | "month" | "year";

const periodLabels: Record<Period, string> = {
  day: "День",
  week: "Неделя",
  month: "Месяц",
  year: "Год",
};

function getDateRange(period: Period) {
  const now = new Date();
  const from = new Date();
  if (period === "day") from.setHours(0, 0, 0, 0);
  else if (period === "week") from.setDate(now.getDate() - 7);
  else if (period === "month") from.setMonth(now.getMonth() - 1);
  else from.setFullYear(now.getFullYear() - 1);
  return from.toISOString();
}

const StatCard = memo(({ icon: Icon, label, value, sub, iconColor, bg }: {
  icon: any; label: string; value: string; sub?: string; iconColor: string; bg: string;
}) => (
  <div className="bg-white rounded-xl border border-gray-100 p-3.5 shadow-sm">
    <div className="flex items-center gap-2 mb-1.5">
      <div className={`h-7 w-7 rounded-lg ${bg} flex items-center justify-center`}>
        <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
      </div>
      <p className="text-[11px] text-gray-500">{label}</p>
    </div>
    <p className="text-xl font-bold text-gray-900 leading-tight">{value}</p>
    {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
  </div>
));
StatCard.displayName = "StatCard";

function buildChartData(sales: any[], period: Period) {
  const groups: Record<string, { revenue: number; profit: number; count: number }> = {};

  for (const sale of sales) {
    const d = new Date(sale.created_at);
    let key: string;
    if (period === "day") key = `${d.getHours()}:00`;
    else if (period === "week" || period === "month") key = `${d.getDate()}.${d.getMonth() + 1}`;
    else key = `${d.getMonth() + 1}/${d.getFullYear().toString().slice(2)}`;

    if (!groups[key]) groups[key] = { revenue: 0, profit: 0, count: 0 };
    groups[key].revenue += sale.total || 0;
    groups[key].count += 1;
    const cost = (sale.sale_items || []).reduce((s: number, i: any) => s + (i.cost_price || 0), 0);
    groups[key].profit += (sale.total || 0) - (sale.payment_fee || 0) - cost;
  }

  return Object.entries(groups).map(([name, v]) => ({ name, ...v }));
}

const TmaAnalyticsPage = () => {
  const { companyId, user } = useAuth();
  const [period, setPeriod] = useState<Period>("day");

  const fromISO = useMemo(() => getDateRange(period), [period]);

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

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ["tma-analytics-sales", companyId, profile?.store_id, fromISO],
    queryFn: async () => {
      if (!companyId) return [];
      let q = supabase
        .from("sales")
        .select("id, total, payment_method, payment_fee, created_at, sale_items(price, cost_price)")
        .eq("company_id", companyId)
        .gte("created_at", fromISO)
        .order("created_at", { ascending: true });
      if (profile?.store_id) q = q.eq("store_id", profile.store_id);
      const { data } = await q;
      return data || [];
    },
    enabled: !!companyId,
    staleTime: 60_000,
  });

  const { data: activeShift } = useQuery({
    queryKey: ["tma-active-shift", user?.id],
    queryFn: async () => {
      if (!user || !companyId) return null;
      const { data } = await supabase.from("shifts").select("id, cash_start, start_time").eq("employee_id", user.id).eq("status", "active").eq("company_id", companyId).maybeSingle();
      return data;
    },
    enabled: !!user && !!companyId,
    staleTime: 30_000,
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

  // Salary accruals for the selected period
  const { data: periodSalary = 0 } = useQuery({
    queryKey: ["tma-salary-period", companyId, user?.id, fromISO],
    queryFn: async () => {
      if (!companyId || !user) return 0;
      const { data } = await supabase
        .from("salary_accruals")
        .select("amount")
        .eq("company_id", companyId)
        .eq("employee_id", user.id)
        .gte("created_at", fromISO);
      return (data || []).reduce((s, a) => s + (a.amount || 0), 0);
    },
    enabled: !!companyId && !!user,
    staleTime: 60_000,
  });

  // Bonuses/penalties for the selected period
  const { data: periodBonuses = { bonus: 0, penalty: 0 } } = useQuery({
    queryKey: ["tma-bonuses-period", companyId, user?.id, fromISO],
    queryFn: async () => {
      if (!companyId || !user) return { bonus: 0, penalty: 0 };
      const { data } = await supabase
        .from("salary_bonuses")
        .select("amount, type")
        .eq("company_id", companyId)
        .eq("employee_id", user.id)
        .gte("created_at", fromISO);
      const bonus = (data || []).filter(b => b.type === "bonus").reduce((s, b) => s + b.amount, 0);
      const penalty = (data || []).filter(b => b.type === "penalty").reduce((s, b) => s + b.amount, 0);
      return { bonus, penalty };
    },
    enabled: !!companyId && !!user,
    staleTime: 60_000,
  });

  const stats = useMemo(() => {
    const totalRevenue = sales.reduce((s, sale) => s + (sale.total || 0), 0);
    const totalFees = sales.reduce((s, sale) => s + (sale.payment_fee || 0), 0);
    const costOfGoods = sales.reduce((s, sale) =>
      s + (sale.sale_items || []).reduce((a: number, i: any) => a + (i.cost_price || 0), 0), 0);
    const profit = totalRevenue - totalFees - costOfGoods;
    const avgCheck = sales.length > 0 ? Math.round(totalRevenue / sales.length) : 0;

    const cashSalesTotal = sales.filter(s => s.payment_method === "cash").reduce((s, sale) => s + (sale.total || 0), 0);
    const deposits = cashOps.filter(o => o.type === "deposit").reduce((s, o) => s + o.amount, 0);
    const withdrawals = cashOps.filter(o => o.type === "withdraw").reduce((s, o) => s + o.amount, 0);
    const currentCash = (activeShift?.cash_start || 0) + cashSalesTotal + deposits - withdrawals;

    return { totalRevenue, totalFees, profit, avgCheck, currentCash, count: sales.length };
  }, [sales, cashOps, activeShift]);

  const chartData = useMemo(() => buildChartData(sales, period), [sales, period]);

  const totalEarnings = periodSalary + periodBonuses.bonus - periodBonuses.penalty;

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-bold text-gray-900">Аналитика</h1>

      {/* Period selector */}
      <div className="flex gap-2">
        {(Object.keys(periodLabels) as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`flex-1 rounded-xl py-2.5 text-xs font-semibold border transition-all active:scale-95 ${
              period === p ? "bg-blue-600 text-white border-blue-600" : "bg-white border-gray-200 text-gray-600"
            }`}
          >
            {periodLabels[p]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="py-10 text-center text-gray-400">Загрузка...</div>
      ) : (
        <>
          {/* Salary card */}
          <div className="bg-purple-50 rounded-xl border border-purple-100 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center">
                <Award className="h-4 w-4 text-purple-600" />
              </div>
              <p className="text-sm font-semibold text-purple-700">Заработок</p>
            </div>
            <p className="text-2xl font-bold text-purple-700">{totalEarnings.toLocaleString("ru")} ₽</p>
            <div className="flex flex-wrap gap-x-4 mt-1.5 text-xs text-purple-600/70">
              <span>Начисления: {periodSalary.toLocaleString("ru")} ₽</span>
              {periodBonuses.bonus > 0 && <span>Премии: +{periodBonuses.bonus.toLocaleString("ru")} ₽</span>}
              {periodBonuses.penalty > 0 && <span>Штрафы: −{periodBonuses.penalty.toLocaleString("ru")} ₽</span>}
            </div>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={TrendingUp} label="Выручка" value={`${stats.totalRevenue.toLocaleString("ru")} ₽`} iconColor="text-emerald-600" bg="bg-emerald-50" />
            <StatCard icon={DollarSign} label="Прибыль" value={`${stats.profit.toLocaleString("ru")} ₽`} iconColor="text-blue-600" bg="bg-blue-50" />
            <StatCard icon={Hash} label="Продажи" value={String(stats.count)} sub={`Ср. чек: ${stats.avgCheck.toLocaleString("ru")} ₽`} iconColor="text-indigo-600" bg="bg-indigo-50" />
            <StatCard icon={CreditCard} label="Комиссии" value={`${stats.totalFees.toLocaleString("ru")} ₽`} iconColor="text-orange-600" bg="bg-orange-50" />
            <StatCard icon={Wallet} label="Касса" value={`${stats.currentCash.toLocaleString("ru")} ₽`} iconColor="text-amber-600" bg="bg-amber-50" />
            <StatCard icon={BarChart3} label="Ср. чек" value={`${stats.avgCheck.toLocaleString("ru")} ₽`} iconColor="text-violet-600" bg="bg-violet-50" />
          </div>

          {/* Revenue chart */}
          {chartData.length > 1 && (
            <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Выручка</p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#9ca3af" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} width={50} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }}
                    formatter={(v: number) => [`${v.toLocaleString("ru")} ₽`, "Выручка"]}
                  />
                  <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Profit chart */}
          {chartData.length > 1 && (
            <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Прибыль</p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#9ca3af" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} width={50} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }}
                    formatter={(v: number) => [`${v.toLocaleString("ru")} ₽`, "Прибыль"]}
                  />
                  <Bar dataKey="profit" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TmaAnalyticsPage;
