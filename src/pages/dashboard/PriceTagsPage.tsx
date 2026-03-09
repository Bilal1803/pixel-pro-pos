import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Printer, Search, CheckSquare, Square } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const PriceTagsPage = () => {
  const { companyId } = useAuth();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  const { data: devices = [], isLoading } = useQuery({
    queryKey: ["devices-pricetags", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("devices")
        .select("*")
        .eq("company_id", companyId)
        .in("status", ["available", "testing", "reserved"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const recentDevices = useMemo(() => {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    return devices.filter((d: any) => d.created_at >= oneDayAgo);
  }, [devices]);

  const filtered = useMemo(() => {
    if (!search.trim()) return devices;
    const q = search.toLowerCase();
    return devices.filter((d: any) =>
      d.model?.toLowerCase().includes(q) ||
      d.imei?.includes(q) ||
      d.color?.toLowerCase().includes(q) ||
      d.memory?.toLowerCase().includes(q)
    );
  }, [devices, search]);

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = (list: any[]) => {
    setSelected(prev => {
      const next = new Set(prev);
      const allSelected = list.every((d: any) => next.has(d.id));
      list.forEach((d: any) => allSelected ? next.delete(d.id) : next.add(d.id));
      return next;
    });
  };

  const selectedDevices = devices.filter((d: any) => selected.has(d.id));

  const handlePrint = () => {
    window.print();
  };

  const DeviceRow = ({ device, list }: { device: any; list?: any[] }) => (
    <div
      className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors"
      onClick={() => toggle(device.id)}
    >
      <Checkbox
        checked={selected.has(device.id)}
        onCheckedChange={() => toggle(device.id)}
        onClick={(e) => e.stopPropagation()}
      />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{device.model}</p>
        <p className="text-xs text-muted-foreground">
          {[device.memory, device.color, device.battery_health ? `АКБ ${device.battery_health}` : null].filter(Boolean).join(" · ")}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="font-bold text-sm">{device.sale_price ? `${Number(device.sale_price).toLocaleString("ru")} ₽` : "—"}</p>
        <p className="text-[10px] font-mono text-muted-foreground">{device.imei}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header - hidden on print */}
      <div className="flex items-center justify-between print:hidden">
        <h1 className="text-2xl font-bold">Ценники</h1>
        <Button onClick={handlePrint} disabled={selected.size === 0}>
          <Printer className="mr-2 h-4 w-4" />
          Печать ({selected.size})
        </Button>
      </div>

      {/* Selection UI - hidden on print */}
      <div className="print:hidden space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Поиск по модели, IMEI, цвету..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>

        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">Все на складе ({devices.length})</TabsTrigger>
            <TabsTrigger value="recent">Недавно добавленные ({recentDevices.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-2 mt-3">
            {devices.length > 0 && (
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => selectAll(filtered)}>
                {filtered.every((d: any) => selected.has(d.id)) ? (
                  <><CheckSquare className="mr-1.5 h-3.5 w-3.5" /> Снять все</>
                ) : (
                  <><Square className="mr-1.5 h-3.5 w-3.5" /> Выбрать все</>
                )}
              </Button>
            )}
            {isLoading ? (
              <p className="text-sm text-muted-foreground text-center py-8">Загрузка...</p>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Нет устройств на складе</p>
            ) : (
              <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
                {filtered.map((d: any) => <DeviceRow key={d.id} device={d} />)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="recent" className="space-y-2 mt-3">
            {recentDevices.length > 0 && (
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => selectAll(recentDevices)}>
                {recentDevices.every((d: any) => selected.has(d.id)) ? (
                  <><CheckSquare className="mr-1.5 h-3.5 w-3.5" /> Снять все</>
                ) : (
                  <><Square className="mr-1.5 h-3.5 w-3.5" /> Выбрать все</>
                )}
              </Button>
            )}
            {recentDevices.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Нет устройств, добавленных за последние 24 часа</p>
            ) : (
              <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
                {recentDevices.map((d: any) => <DeviceRow key={d.id} device={d} />)}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Print layout - visible only on print */}
      {selectedDevices.length > 0 && (
        <div className="hidden print:block">
          <div className="grid grid-cols-2 gap-2">
            {selectedDevices.map((d: any) => (
              <Card key={d.id} className="p-3 shadow-none border">
                <div className="space-y-1.5">
                  <h3 className="text-base font-bold">{d.model}</h3>
                  <div className="grid grid-cols-2 gap-0.5 text-xs">
                    <span className="text-muted-foreground">Память:</span>
                    <span className="font-medium">{d.memory || "—"}</span>
                    <span className="text-muted-foreground">Цвет:</span>
                    <span className="font-medium">{d.color || "—"}</span>
                    <span className="text-muted-foreground">АКБ:</span>
                    <span className="font-medium">{d.battery_health || "—"}</span>
                    <span className="text-muted-foreground">IMEI:</span>
                    <span className="font-mono text-[10px]">{d.imei}</span>
                  </div>
                  <div className="border-t pt-1.5 mt-1">
                    <span className="text-xl font-extrabold">
                      {d.sale_price ? `${Number(d.sale_price).toLocaleString("ru")} ₽` : "Цена не указана"}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Preview of selected - screen only */}
      {selectedDevices.length > 0 && (
        <div className="print:hidden">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">Предпросмотр ценников ({selectedDevices.length})</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {selectedDevices.map((d: any) => (
              <Card key={d.id} className="p-3 card-shadow">
                <div className="space-y-1.5">
                  <h3 className="text-sm font-bold truncate">{d.model}</h3>
                  <div className="text-[11px] text-muted-foreground space-y-0.5">
                    <p>{[d.memory, d.color].filter(Boolean).join(" · ")}</p>
                    <p>АКБ: {d.battery_health || "—"}</p>
                    <p className="font-mono text-[10px]">{d.imei}</p>
                  </div>
                  <div className="border-t pt-1.5">
                    <span className="text-lg font-extrabold">
                      {d.sale_price ? `${Number(d.sale_price).toLocaleString("ru")} ₽` : "—"}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PriceTagsPage;
