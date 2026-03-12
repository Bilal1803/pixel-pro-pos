import { useState, useMemo, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";

const statusLabels: Record<string, { label: string; color: string }> = {
  available: { label: "В наличии", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  testing: { label: "Тестирование", color: "bg-amber-50 text-amber-700 border-amber-200" },
  reserved: { label: "Резерв", color: "bg-blue-50 text-blue-700 border-blue-200" },
  sold: { label: "Продан", color: "bg-gray-50 text-gray-500 border-gray-200" },
  defective: { label: "Брак", color: "bg-red-50 text-red-700 border-red-200" },
};

const statusFilters = ["all", "available", "testing", "reserved", "sold", "defective"] as const;
const statusFilterLabels: Record<string, string> = {
  all: "Все", available: "В наличии", testing: "Тест", reserved: "Резерв", sold: "Продан", defective: "Брак",
};

const TmaInventoryPage = () => {
  const { companyId, user } = useAuth();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: profile } = useQuery({
    queryKey: ["tma-profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("store_id").eq("user_id", user.id).maybeSingle();
      return data;
    },
    enabled: !!user,
    staleTime: 5 * 60_000,
  });

  const { data: devices = [], isLoading } = useQuery({
    queryKey: ["tma-devices", companyId, profile?.store_id],
    queryFn: async () => {
      if (!companyId) return [];
      let q = supabase.from("devices").select("*").eq("company_id", companyId).order("created_at", { ascending: false });
      if (profile?.store_id) q = q.eq("store_id", profile.store_id);
      const { data } = await q;
      return data || [];
    },
    enabled: !!companyId,
    staleTime: 30_000,
  });

  const [visibleCount, setVisibleCount] = useState(30);

  const filtered = useMemo(() => {
    let result = devices;
    if (statusFilter !== "all") result = result.filter(d => d.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(d =>
        d.model.toLowerCase().includes(q) || d.imei.toLowerCase().includes(q) ||
        (d.brand || "").toLowerCase().includes(q) || (d.color || "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [devices, search, statusFilter]);

  const visibleDevices = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
  const hasMore = visibleCount < filtered.length;

  const loadMore = useCallback(() => setVisibleCount(v => v + 30), []);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: devices.length };
    devices.forEach(d => { counts[d.status] = (counts[d.status] || 0) + 1; });
    return counts;
  }, [devices]);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-gray-900">Склад</h1>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="IMEI, модель, цвет..."
          className="pl-10 h-12 rounded-xl text-sm bg-white border-gray-200 shadow-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {statusFilters.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium border transition-all active:scale-95 ${
              statusFilter === s
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white border-gray-200 text-gray-600"
            }`}
          >
            {statusFilterLabels[s]} {statusCounts[s] ? `(${statusCounts[s]})` : ""}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="py-10 text-center text-gray-400">Загрузка...</div>
      ) : filtered.length === 0 ? (
        <div className="py-10 text-center text-gray-400">Устройства не найдены</div>
      ) : (
        <div className="space-y-2">
          {visibleDevices.map((d) => {
            const st = statusLabels[d.status] || { label: d.status, color: "bg-gray-50 text-gray-500 border-gray-200" };
            return (
              <div key={d.id} className="bg-white rounded-xl border border-gray-100 p-3.5 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{d.brand} {d.model}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {[d.memory, d.color, d.battery_health ? `🔋 ${d.battery_health}` : null].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <span className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full border ${st.color}`}>{st.label}</span>
                </div>
                <div className="flex items-center justify-between mt-2.5">
                  <span className="text-[10px] text-gray-400 font-mono">{d.imei}</span>
                  <span className="text-sm font-bold text-gray-900">{(d.sale_price || 0).toLocaleString("ru")} ₽</span>
                </div>
              </div>
            );
          })}
          {hasMore && (
            <Button variant="outline" className="w-full rounded-xl" onClick={loadMore}>
              Показать ещё ({filtered.length - visibleCount})
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default TmaInventoryPage;
