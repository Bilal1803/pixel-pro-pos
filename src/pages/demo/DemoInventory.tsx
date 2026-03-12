import { useDemo } from "@/contexts/DemoContext";
import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

const statusLabels: Record<string, { label: string; color: string }> = {
  available: { label: "В наличии", color: "bg-green-100 text-green-700" },
  testing: { label: "Тестирование", color: "bg-yellow-100 text-yellow-700" },
  reserved: { label: "Резерв", color: "bg-purple-100 text-purple-700" },
  sold: { label: "Продан", color: "bg-blue-100 text-blue-700" },
  defective: { label: "Брак", color: "bg-red-100 text-red-700" },
};

const listingIcons: Record<string, string> = {
  not_listed: "📢",
  listed: "✔",
  needs_relist: "🔄",
};

const DemoInventory = () => {
  const { devices } = useDemo();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = devices.filter((d) => {
    const matchSearch = !search || `${d.brand} ${d.model} ${d.memory} ${d.color} ${d.imei}`.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || d.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleAction = () => {
    toast({ title: "Демо-режим", description: "В демо-режиме изменения не сохраняются" });
  };

  const statuses = ["all", "available", "testing", "reserved", "sold", "defective"];
  const statusNames: Record<string, string> = { all: "Все", ...Object.fromEntries(Object.entries(statusLabels).map(([k, v]) => [k, v.label])) };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Склад устройств</h1>
        <button onClick={handleAction} className="text-sm text-primary font-medium hover:underline">+ Добавить</button>
      </div>

      <Input placeholder="Поиск по модели, IMEI, цвету..." value={search} onChange={(e) => setSearch(e.target.value)} />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {statuses.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium border whitespace-nowrap transition-colors ${
              statusFilter === s ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:bg-muted"
            }`}
          >
            {statusNames[s]} ({s === "all" ? devices.length : devices.filter((d) => d.status === s).length})
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map((d) => (
          <Card key={d.id}>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span title={d.listing_status === "not_listed" ? "Не опубликовано" : d.listing_status === "listed" ? "Опубликовано" : "Перевыложить"}>
                      {listingIcons[d.listing_status] || "📢"}
                    </span>
                    <p className="font-medium text-sm text-foreground truncate">{d.brand} {d.model}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{d.memory} · {d.color} · IMEI: {d.imei.slice(0, 6)}...{d.imei.slice(-4)}</p>
                  <p className="text-xs text-muted-foreground">Батарея: {d.battery_health}</p>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="font-bold text-sm text-primary">{d.sale_price.toLocaleString("ru")} ₽</p>
                  <p className="text-[10px] text-muted-foreground">Закупка: {d.purchase_price.toLocaleString("ru")} ₽</p>
                  <span className={`inline-block mt-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${statusLabels[d.status]?.color || ""}`}>
                    {statusLabels[d.status]?.label || d.status}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default DemoInventory;
