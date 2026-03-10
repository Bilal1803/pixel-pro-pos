import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  available: { label: "В наличии", variant: "default" },
  testing: { label: "Тестирование", variant: "secondary" },
  reserved: { label: "Резерв", variant: "outline" },
  sold: { label: "Продан", variant: "secondary" },
  defective: { label: "Брак", variant: "destructive" },
};

const statusFilters = ["all", "available", "testing", "reserved", "sold", "defective"] as const;
const statusFilterLabels: Record<string, string> = {
  all: "Все",
  available: "В наличии",
  testing: "Тест",
  reserved: "Резерв",
  sold: "Продан",
  defective: "Брак",
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
      const { data } = await supabase.from("profiles").select("store_id").eq("user_id", user.id).single();
      return data;
    },
    enabled: !!user,
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
  });

  const filtered = useMemo(() => {
    let result = devices;
    if (statusFilter !== "all") {
      result = result.filter(d => d.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(d =>
        d.model.toLowerCase().includes(q) ||
        d.imei.toLowerCase().includes(q) ||
        (d.brand || "").toLowerCase().includes(q) ||
        (d.color || "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [devices, search, statusFilter]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: devices.length };
    devices.forEach(d => { counts[d.status] = (counts[d.status] || 0) + 1; });
    return counts;
  }, [devices]);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">Склад</h1>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="IMEI, модель, цвет..."
          className="pl-10 h-12 rounded-xl text-base"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Status filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {statusFilters.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium border transition-all active:scale-95 ${
              statusFilter === s
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card border-border"
            }`}
          >
            {statusFilterLabels[s]} {statusCounts[s] ? `(${statusCounts[s]})` : ""}
          </button>
        ))}
      </div>

      {/* Devices */}
      {isLoading ? (
        <div className="py-10 text-center text-muted-foreground">Загрузка...</div>
      ) : filtered.length === 0 ? (
        <div className="py-10 text-center text-muted-foreground">Устройства не найдены</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((d) => {
            const st = statusLabels[d.status] || { label: d.status, variant: "outline" as const };
            return (
              <div key={d.id} className="rounded-xl border bg-card p-3">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{d.brand} {d.model}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {[d.memory, d.color, d.battery_health ? `🔋 ${d.battery_health}` : null].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <Badge variant={st.variant} className="shrink-0 text-[10px]">{st.label}</Badge>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] text-muted-foreground font-mono">{d.imei}</span>
                  <span className="text-sm font-bold">{(d.sale_price || 0).toLocaleString("ru")} ₽</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TmaInventoryPage;
