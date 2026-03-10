import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Settings2, Plus, Trash2, Pencil, X } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IPHONE_CATALOG } from "@/data/deviceCatalog";
import ComboboxInput from "@/components/ComboboxInput";
import SectionHelp from "@/components/SectionHelp";
import { SECTION_TIPS } from "@/data/sectionTips";
import { ALL_CATALOG_MODELS, ALL_CATALOG_MEMORIES, ALL_CATALOG_COLORS, PRESET_BRANDS, getModelData } from "@/data/deviceCatalog";

type CatalogRow = { model: string; memory: string };

const allRows: CatalogRow[] = IPHONE_CATALOG.flatMap((m) =>
  m.memories.map((mem) => ({ model: m.name, memory: mem }))
);

const BuybackPage = () => {
  const { companyId, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"prices" | "history">("prices");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [marginUsed, setMarginUsed] = useState("");
  const [marginNew, setMarginNew] = useState("");
  const [customOpen, setCustomOpen] = useState(false);
  const [customModel, setCustomModel] = useState("");
  const [customMemory, setCustomMemory] = useState("");
  const [customPrice, setCustomPrice] = useState("");

  // Per-model margin edit
  const [marginEditOpen, setMarginEditOpen] = useState(false);
  const [marginEditModel, setMarginEditModel] = useState("");
  const [marginEditUsed, setMarginEditUsed] = useState("");
  const [marginEditNew, setMarginEditNew] = useState("");

  // Delete model from price list
  const [deleteModelTarget, setDeleteModelTarget] = useState<{ key: string; id: string } | null>(null);

  // Buyback form
  const [buybackOpen, setBuybackOpen] = useState(false);
  const [buybackForm, setBuybackForm] = useState({
    model: "", brand: "", memory: "", color: "", imei: "", battery_health: "", purchase_price: "",
  });

  // User role
  const { data: userRole } = useQuery({
    queryKey: ["user-role", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).single();
      return data?.role || null;
    },
    enabled: !!user?.id,
  });
  const isOwner = userRole === "owner";

  // Load margin settings
  const { data: settings } = useQuery({
    queryKey: ["buyback-settings", companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data, error } = await supabase
        .from("buyback_settings")
        .select("*")
        .eq("company_id", companyId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  // Load monitoring prices
  const { data: monitoring = [] } = useQuery({
    queryKey: ["price-monitoring", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("price_monitoring")
        .select("model, avg_price, our_price, margin_used, margin_new, id")
        .eq("company_id", companyId);
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const monitoringMap = useMemo(() => {
    const map: Record<string, { avg_price: number | null; our_price: number | null; margin_used: number | null; margin_new: number | null; id: string }> = {};
    for (const m of monitoring) map[m.model] = m;
    return map;
  }, [monitoring]);

  // Load buyback history
  const { data: buybacks = [], isLoading: historyLoading } = useQuery({
    queryKey: ["buybacks", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("buybacks")
        .select("*, devices(status)")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const currentMarginUsed = settings?.margin_used ?? 8000;
  const currentMarginNew = settings?.margin_new ?? 5000;

  const saveSettings = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("No company");
      const mu = marginUsed ? Number(marginUsed) : currentMarginUsed;
      const mn = marginNew ? Number(marginNew) : currentMarginNew;

      if (settings) {
        const { error } = await supabase
          .from("buyback_settings")
          .update({ margin_used: mu, margin_new: mn })
          .eq("id", settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("buyback_settings")
          .insert({ company_id: companyId, margin_used: mu, margin_new: mn });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buyback-settings"] });
      toast({ title: "Маржа сохранена" });
      setSettingsOpen(false);
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const createBuyback = useMutation({
    mutationFn: async () => {
      if (!companyId || !user) throw new Error("No company");
      const { data: device, error: devError } = await supabase.from("devices").insert({
        company_id: companyId,
        model: buybackForm.model,
        brand: buybackForm.brand || null,
        memory: buybackForm.memory || null,
        color: buybackForm.color || null,
        imei: buybackForm.imei,
        battery_health: buybackForm.battery_health || null,
        purchase_price: parseFloat(buybackForm.purchase_price),
        status: "testing" as any,
        condition: "used",
      }).select().single();
      if (devError) throw devError;

      const { error } = await supabase.from("buybacks").insert({
        company_id: companyId,
        employee_id: user.id,
        device_id: device.id,
        model: buybackForm.model,
        memory: buybackForm.memory || null,
        color: buybackForm.color || null,
        imei: buybackForm.imei || null,
        battery_health: buybackForm.battery_health || null,
        purchase_price: parseFloat(buybackForm.purchase_price),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buybacks"] });
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      toast({ title: "Скупка оформлена, устройство на проверке" });
      setBuybackOpen(false);
      setBuybackForm({ model: "", brand: "", memory: "", color: "", imei: "", battery_health: "", purchase_price: "" });
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  // Add custom model to price monitoring
  const addCustomModel = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("No company");
      const modelName = `${customModel} ${customMemory}`.trim();
      const price = customPrice ? Number(customPrice) : null;
      const { error } = await supabase.from("price_monitoring").insert({
        company_id: companyId,
        model: modelName,
        our_price: price,
        avg_price: price,
        prices: price ? [price] : [],
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["price-monitoring"] });
      toast({ title: "Модель добавлена" });
      setCustomOpen(false);
      setCustomModel("");
      setCustomMemory("");
      setCustomPrice("");
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  // Delete buyback (owner only)
  const deleteBuyback = useMutation({
    mutationFn: async ({ buybackId, deviceId }: { buybackId: string; deviceId: string | null }) => {
      const { error } = await supabase.from("buybacks").delete().eq("id", buybackId);
      if (error) throw error;
      if (deviceId) {
        await supabase.from("devices").delete().eq("id", deviceId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buybacks"] });
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      toast({ title: "Скупка удалена" });
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  // Save per-model margin
  const saveModelMargin = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("No company");
      const entry = monitoringMap[marginEditModel];
      const mu = marginEditUsed ? Number(marginEditUsed) : null;
      const mn = marginEditNew ? Number(marginEditNew) : null;
      if (entry) {
        const { error } = await supabase
          .from("price_monitoring")
          .update({ margin_used: mu, margin_new: mn })
          .eq("id", entry.id);
        if (error) throw error;
      } else {
        // Create entry with just margins
        const { error } = await supabase.from("price_monitoring").insert({
          company_id: companyId,
          model: marginEditModel,
          margin_used: mu,
          margin_new: mn,
          prices: [],
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["price-monitoring"] });
      toast({ title: "Маржа для модели сохранена" });
      setMarginEditOpen(false);
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const getModelMargins = (modelKey: string) => {
    const entry = monitoringMap[modelKey];
    return {
      used: entry?.margin_used ?? currentMarginUsed,
      new: entry?.margin_new ?? currentMarginNew,
    };
  };

  const openMarginEdit = (row: CatalogRow, e: React.MouseEvent) => {
    e.stopPropagation();
    const key = `${row.model} ${row.memory}`;
    const entry = monitoringMap[key];
    setMarginEditModel(key);
    setMarginEditUsed(entry?.margin_used != null ? String(entry.margin_used) : "");
    setMarginEditNew(entry?.margin_new != null ? String(entry.margin_new) : "");
    setMarginEditOpen(true);
  };


  const filteredRows = useMemo(() => {
    if (!search.trim()) return allRows;
    const q = search.toLowerCase();
    return allRows.filter(
      (r) => r.model.toLowerCase().includes(q) || r.memory.toLowerCase().includes(q)
    );
  }, [search]);

  const groupedRows = useMemo(() => {
    const groups: { name: string; rows: CatalogRow[] }[] = [];
    let current: { name: string; rows: CatalogRow[] } | null = null;
    for (const r of filteredRows) {
      if (!current || current.name !== r.model) {
        current = { name: r.model, rows: [] };
        groups.push(current);
      }
      current.rows.push(r);
    }
    return groups;
  }, [filteredRows]);

  const openSettingsDialog = () => {
    setMarginUsed(String(currentMarginUsed));
    setMarginNew(String(currentMarginNew));
    setSettingsOpen(true);
  };

  const handleRowClick = (row: CatalogRow) => {
    const key = `${row.model} ${row.memory}`;
    const entry = monitoringMap[key];
    const salePrice = entry?.our_price || (entry?.avg_price ? Math.round(entry.avg_price * 0.95) : null);
    const margins = getModelMargins(key);
    const buybackPrice = salePrice ? salePrice - margins.used : 0;

    setBuybackForm({
      model: row.model,
      brand: "Apple",
      memory: row.memory,
      color: "",
      imei: "",
      battery_health: "",
      purchase_price: buybackPrice > 0 ? String(buybackPrice) : "",
    });
    setBuybackOpen(true);
  };

  const statusLabels: Record<string, { label: string; className: string }> = {
    testing: { label: "Проверка", className: "bg-warning/10 text-warning" },
    available: { label: "В наличии", className: "bg-success/10 text-success" },
    sold: { label: "Продано", className: "bg-muted text-muted-foreground" },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Скупка устройств</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openSettingsDialog}>
            <Settings2 className="mr-2 h-4 w-4" /> Маржа
          </Button>
          <Dialog open={buybackOpen} onOpenChange={setBuybackOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Оформить скупку</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Скупка устройства</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); createBuyback.mutate(); }} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Модель *</Label><ComboboxInput value={buybackForm.model} onChange={(v) => setBuybackForm({ ...buybackForm, model: v })} options={ALL_CATALOG_MODELS} required /></div>
                  <div><Label>Бренд</Label><ComboboxInput value={buybackForm.brand} onChange={(v) => setBuybackForm({ ...buybackForm, brand: v })} options={PRESET_BRANDS} /></div>
                  <div><Label>Память</Label><ComboboxInput value={buybackForm.memory} onChange={(v) => setBuybackForm({ ...buybackForm, memory: v })} options={getModelData(buybackForm.model)?.memories || ALL_CATALOG_MEMORIES} /></div>
                  <div><Label>Цвет</Label><ComboboxInput value={buybackForm.color} onChange={(v) => setBuybackForm({ ...buybackForm, color: v })} options={getModelData(buybackForm.model)?.colors || ALL_CATALOG_COLORS} /></div>
                  <div><Label>IMEI *</Label><Input value={buybackForm.imei} onChange={(e) => setBuybackForm({ ...buybackForm, imei: e.target.value })} required /></div>
                  <div><Label>АКБ</Label><Input placeholder="94%" value={buybackForm.battery_health} onChange={(e) => setBuybackForm({ ...buybackForm, battery_health: e.target.value })} /></div>
                </div>
                <div>
                  <Label>Цена скупки *</Label>
                  <Input type="number" value={buybackForm.purchase_price} onChange={(e) => setBuybackForm({ ...buybackForm, purchase_price: e.target.value })} required />
                </div>
                <Button type="submit" className="w-full" disabled={createBuyback.isPending}>
                  {createBuyback.isPending ? "Оформление..." : "Оформить скупку"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Margin settings dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Настройка маржи</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveSettings.mutate(); }} className="space-y-4">
            <div>
              <Label>Маржа на БУ устройства (₽)</Label>
              <Input type="number" value={marginUsed} onChange={(e) => setMarginUsed(e.target.value)} placeholder="8000" />
              <p className="mt-1 text-xs text-muted-foreground">Вычитается из цены продажи для расчёта цены выкупа</p>
            </div>
            <div>
              <Label>Маржа на новые устройства (₽)</Label>
              <Input type="number" value={marginNew} onChange={(e) => setMarginNew(e.target.value)} placeholder="5000" />
            </div>
            <Button type="submit" className="w-full" disabled={saveSettings.isPending}>
              {saveSettings.isPending ? "Сохранение..." : "Сохранить"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span>Маржа БУ: <strong className="text-foreground">{currentMarginUsed.toLocaleString("ru")} ₽</strong></span>
        <span className="text-border">|</span>
        <span>Маржа новые: <strong className="text-foreground">{currentMarginNew.toLocaleString("ru")} ₽</strong></span>
      </div>

      <SectionHelp tips={SECTION_TIPS.buyback} />

      <Tabs value={tab} onValueChange={(v) => setTab(v as "prices" | "history")}>
        <TabsList>
          <TabsTrigger value="prices">Прайс-лист выкупа</TabsTrigger>
          <TabsTrigger value="history">История скупок</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "prices" && (
        <>
          <div className="flex items-center gap-3">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Поиск модели..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Button variant="outline" onClick={() => setCustomOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Своя модель
            </Button>
          </div>

          {/* Custom model dialog */}
          <Dialog open={customOpen} onOpenChange={setCustomOpen}>
            <DialogContent className="max-w-sm">
              <DialogHeader><DialogTitle>Добавить модель</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); addCustomModel.mutate(); }} className="space-y-3">
                <div><Label>Модель *</Label><Input value={customModel} onChange={(e) => setCustomModel(e.target.value)} placeholder="Samsung Galaxy S24" required /></div>
                <div><Label>Память</Label><Input value={customMemory} onChange={(e) => setCustomMemory(e.target.value)} placeholder="256GB" /></div>
                <div><Label>Цена выкупа</Label><Input type="number" value={customPrice} onChange={(e) => setCustomPrice(e.target.value)} placeholder="30000" /></div>
                <Button type="submit" className="w-full" disabled={addCustomModel.isPending}>
                  {addCustomModel.isPending ? "Добавление..." : "Добавить"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Card className="card-shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Модель</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Память</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Цена продажи</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Маржа БУ</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Выкуп БУ</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Выкуп Новый</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {groupedRows.map((group) =>
                    group.rows.map((row, i) => {
                      const key = `${row.model} ${row.memory}`;
                      const entry = monitoringMap[key];
                      const salePrice = entry?.our_price || (entry?.avg_price ? Math.round(entry.avg_price * 0.95) : null);
                      const margins = getModelMargins(key);
                      const hasCustomMargin = entry?.margin_used != null || entry?.margin_new != null;
                      const buybackUsed = salePrice ? salePrice - margins.used : null;
                      const buybackNew = salePrice ? salePrice - margins.new : null;

                      return (
                        <tr
                          key={key}
                          className="border-b hover:bg-muted/30 transition-colors cursor-pointer"
                          onClick={() => handleRowClick(row)}
                        >
                          <td className="px-4 py-2.5 font-medium">{i === 0 ? row.model : ""}</td>
                          <td className="px-4 py-2.5">{row.memory}</td>
                          <td className="px-4 py-2.5 text-right font-mono">
                            {salePrice ? (
                              <span>{salePrice.toLocaleString("ru")} ₽</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-xs">
                            <span className={hasCustomMargin ? "text-warning font-semibold" : "text-muted-foreground"}>
                              {margins.used.toLocaleString("ru")} ₽
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono">
                            {buybackUsed && buybackUsed > 0 ? (
                              <span className="font-semibold text-primary">{buybackUsed.toLocaleString("ru")} ₽</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono">
                            {buybackNew && buybackNew > 0 ? (
                              <span className="font-semibold text-success">{buybackNew.toLocaleString("ru")} ₽</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => openMarginEdit(row, e)}>
                              <Pencil className="h-3 w-3 text-muted-foreground" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* Per-model margin edit dialog */}
      <Dialog open={marginEditOpen} onOpenChange={setMarginEditOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Маржа: {marginEditModel}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveModelMargin.mutate(); }} className="space-y-4">
            <div>
              <Label>Маржа БУ (₽)</Label>
              <Input type="number" value={marginEditUsed} onChange={(e) => setMarginEditUsed(e.target.value)} placeholder={`По умолчанию: ${currentMarginUsed}`} />
              <p className="mt-1 text-xs text-muted-foreground">Оставьте пустым для общей маржи ({currentMarginUsed.toLocaleString("ru")} ₽)</p>
            </div>
            <div>
              <Label>Маржа Новый (₽)</Label>
              <Input type="number" value={marginEditNew} onChange={(e) => setMarginEditNew(e.target.value)} placeholder={`По умолчанию: ${currentMarginNew}`} />
            </div>
            <Button type="submit" className="w-full" disabled={saveModelMargin.isPending}>
              {saveModelMargin.isPending ? "Сохранение..." : "Сохранить"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {tab === "history" && (
        <Card className="card-shadow overflow-hidden">
          {historyLoading ? (
            <div className="p-8 text-center text-muted-foreground">Загрузка...</div>
          ) : buybacks.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">Нет скупок</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Модель</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Цвет</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">IMEI</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">АКБ</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Цена скупки</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Статус</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Дата</th>
                    {isOwner && <th className="px-4 py-3"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {buybacks.map((b: any) => {
                    const status = b.devices?.status || "testing";
                    return (
                      <tr key={b.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium">{b.model} {b.memory || ""}</td>
                        <td className="px-4 py-3">{b.color || "—"}</td>
                        <td className="px-4 py-3 font-mono text-xs">{b.imei || "—"}</td>
                        <td className="px-4 py-3">{b.battery_health || "—"}</td>
                        <td className="px-4 py-3 font-semibold">{b.purchase_price} ₽</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusLabels[status]?.className || "bg-muted text-muted-foreground"}`}>
                            {statusLabels[status]?.label || status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{new Date(b.created_at).toLocaleDateString("ru")}</td>
                        {isOwner && (
                          <td className="px-4 py-3">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => {
                                if (confirm("Удалить запись о скупке?")) {
                                  deleteBuyback.mutate({ buybackId: b.id, deviceId: b.device_id });
                                }
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default BuybackPage;
