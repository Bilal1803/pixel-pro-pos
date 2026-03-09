import { useState, useMemo, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Printer, Search, CheckSquare, Square, Settings2, Upload, X, Image, Save, Trash2, Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

type TagSize = "small" | "medium" | "large";

interface TemplateSettings {
  size: TagSize;
  showMemory: boolean;
  showColor: boolean;
  showBattery: boolean;
  showImei: boolean;
  showBrand: boolean;
  showSim: boolean;
  logoUrl: string | null;
  storeName: string;
  promoText: string;
  showOldPrice: boolean;
  showPromoPrice: boolean;
  promoPricePercent: number;
}

const DEFAULT_SETTINGS: TemplateSettings = {
  size: "medium",
  showMemory: true,
  showColor: true,
  showBattery: true,
  showImei: true,
  showBrand: false,
  showSim: true,
  logoUrl: null,
  storeName: "",
  promoText: "",
  showOldPrice: false,
  showPromoPrice: false,
  promoPricePercent: 10,
};

const SIZE_CONFIG: Record<TagSize, { label: string; cols: number; printCols: number; cardClass: string; titleClass: string; priceClass: string; textClass: string }> = {
  small: { label: "Маленький (4 в ряд)", cols: 4, printCols: 4, cardClass: "p-2", titleClass: "text-xs font-bold", priceClass: "text-sm font-extrabold", textClass: "text-[9px]" },
  medium: { label: "Средний (2 в ряд)", cols: 3, printCols: 2, cardClass: "p-3", titleClass: "text-sm font-bold", priceClass: "text-xl font-extrabold", textClass: "text-xs" },
  large: { label: "Большой (1 в ряд)", cols: 2, printCols: 1, cardClass: "p-5", titleClass: "text-lg font-bold", priceClass: "text-3xl font-extrabold", textClass: "text-sm" },
};

const PriceTagsPage = () => {
  const { companyId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [settings, setSettings] = useState<TemplateSettings>(DEFAULT_SETTINGS);
  const [uploading, setUploading] = useState(false);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState("Основной");
  const fileRef = useRef<HTMLInputElement>(null);

  // Load saved templates
  const { data: templates = [] } = useQuery({
    queryKey: ["price-tag-templates", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("price_tag_templates")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  // Load default template on first load
  useEffect(() => {
    if (templates.length > 0 && !activeTemplateId) {
      const defaultTpl = templates.find((t: any) => t.is_default) || templates[0];
      setActiveTemplateId(defaultTpl.id);
      setTemplateName(defaultTpl.name);
      setSettings({ ...DEFAULT_SETTINGS, ...(defaultTpl.settings as any) });
    }
  }, [templates, activeTemplateId]);

  // Save template mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("No company");
      const payload = {
        company_id: companyId,
        name: templateName,
        settings: settings as any,
        updated_at: new Date().toISOString(),
      };
      if (activeTemplateId) {
        const { error } = await supabase
          .from("price_tag_templates")
          .update(payload)
          .eq("id", activeTemplateId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("price_tag_templates")
          .insert({ ...payload, is_default: templates.length === 0 })
          .select()
          .single();
        if (error) throw error;
        setActiveTemplateId(data.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["price-tag-templates"] });
      toast({ title: "Шаблон сохранён" });
    },
    onError: (err: any) => {
      toast({ title: "Ошибка сохранения", description: err.message, variant: "destructive" });
    },
  });

  // Delete template mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("price_tag_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      setActiveTemplateId(null);
      setSettings(DEFAULT_SETTINGS);
      setTemplateName("Основной");
      queryClient.invalidateQueries({ queryKey: ["price-tag-templates"] });
      toast({ title: "Шаблон удалён" });
    },
  });

  const createNewTemplate = () => {
    setActiveTemplateId(null);
    setSettings(DEFAULT_SETTINGS);
    setTemplateName("Новый шаблон");
  };

  const switchTemplate = (id: string) => {
    const tpl = templates.find((t: any) => t.id === id);
    if (tpl) {
      setActiveTemplateId(tpl.id);
      setTemplateName(tpl.name);
      setSettings({ ...DEFAULT_SETTINGS, ...(tpl.settings as any) });
    }
  };

  const sizeConf = SIZE_CONFIG[settings.size];

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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !companyId) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${companyId}/logo.${ext}`;
      const { error } = await supabase.storage.from("logos").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("logos").getPublicUrl(path);
      setSettings(s => ({ ...s, logoUrl: urlData.publicUrl + "?t=" + Date.now() }));
      toast({ title: "Логотип загружен" });
    } catch (err: any) {
      toast({ title: "Ошибка загрузки", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const removeLogo = () => setSettings(s => ({ ...s, logoUrl: null }));

  const PriceTag = ({ device, forPrint = false }: { device: any; forPrint?: boolean }) => {
    const salePrice = device.sale_price ? Number(device.sale_price) : null;
    const oldPrice = settings.showOldPrice && salePrice ? Math.round(salePrice * 1.15) : null;
    const promoPrice = settings.showPromoPrice && salePrice ? Math.round(salePrice * (1 - settings.promoPricePercent / 100)) : null;
    const fmt = (n: number) => n.toLocaleString("ru");

    return (
      <div className={`border border-foreground/40 ${sizeConf.cardClass} ${forPrint ? "" : "bg-card"} font-bold`}>
        {/* Store name */}
        {settings.storeName && (
          <div className="text-center border-b border-foreground/20 pb-1 mb-0.5">
            <span className={`${settings.size === "small" ? "text-[9px]" : settings.size === "medium" ? "text-xs" : "text-sm"} font-bold uppercase tracking-wider`}>
              {settings.storeName}
            </span>
          </div>
        )}
        {settings.logoUrl && !settings.storeName && (
          <div className="flex justify-center border-b border-foreground/20 pb-1 mb-0.5">
            <img src={settings.logoUrl} alt="logo" className={settings.size === "small" ? "h-4" : settings.size === "medium" ? "h-6" : "h-8"} />
          </div>
        )}

        {/* Model */}
        <div className="text-center border-b border-foreground/20 py-1">
          <h3 className={sizeConf.titleClass}>
            {settings.showBrand && device.brand ? `${device.brand} ` : ""}{device.model}
          </h3>
        </div>

        {/* Specs row */}
        {(settings.showColor || settings.showMemory || settings.showBattery) && (
          <div className="grid grid-cols-3 border-b border-foreground/20">
            <div className={`${sizeConf.textClass} py-1 text-center border-r border-foreground/20`}>
              {settings.showColor ? (device.color || "") : ""}
            </div>
            <div className={`${sizeConf.textClass} py-1 text-center border-r border-foreground/20`}>
              {settings.showMemory ? (device.memory || "") : ""}
            </div>
            <div className={`${sizeConf.textClass} py-1 text-center`}>
              {settings.showBattery && device.battery_health ? device.battery_health : ""}
            </div>
          </div>
        )}

        {/* IMEI row */}
        {(settings.showImei || settings.showSim) && (
          <div className={`grid ${settings.showImei && settings.showSim ? "grid-cols-[1fr_auto]" : "grid-cols-1"} border-b border-foreground/20`}>
            {settings.showImei && (
              <div className={`font-mono ${settings.size === "small" ? "text-[7px]" : "text-[9px]"} py-1 text-center ${settings.showSim ? "border-r border-foreground/20" : ""}`}>
                {device.imei}
              </div>
            )}
            {settings.showSim && (
              <div className={`${sizeConf.textClass} py-1 px-2 text-center`}>2Sim</div>
            )}
          </div>
        )}

        {/* Old price (strikethrough) */}
        {oldPrice && (
          <div className="grid grid-cols-[1fr_auto] border-b border-foreground/20">
            <div className={`${settings.size === "small" ? "text-sm" : settings.size === "medium" ? "text-lg" : "text-2xl"} font-bold text-center py-1 line-through italic text-muted-foreground`}>
              {fmt(oldPrice)}
            </div>
            <div className={`${sizeConf.textClass} py-1 px-2 flex items-center text-muted-foreground`}>Цена</div>
          </div>
        )}

        {/* Sale price */}
        {salePrice && (
          <div className={`${promoPrice ? "grid grid-cols-[1fr_auto] border-b border-foreground/20" : "text-center py-1"}`}>
            <div className={`${sizeConf.priceClass} text-center py-1`}>{fmt(salePrice)}</div>
            {!oldPrice && !promoPrice && null}
          </div>
        )}
        {!salePrice && <div className={`${sizeConf.priceClass} text-center py-1`}>—</div>}

        {/* Promo price */}
        {promoPrice && salePrice && (
          <div className="grid grid-cols-[1fr_auto] border-b border-foreground/20">
            <div className={`${settings.size === "small" ? "text-sm" : settings.size === "medium" ? "text-lg" : "text-2xl"} font-bold text-center py-1 text-success`}>
              {fmt(promoPrice)}
            </div>
            <div className={`${sizeConf.textClass} py-1 px-2 flex items-center text-success font-medium`}>акция</div>
          </div>
        )}

        {/* Promo text */}
        {settings.promoText && (
          <div className="pt-1">
            <p className={`${settings.size === "small" ? "text-[7px]" : "text-[9px]"} text-center italic`}>{settings.promoText}</p>
          </div>
        )}
      </div>
    );
  };

  const DeviceRow = ({ device }: { device: any }) => (
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
      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <h1 className="text-2xl font-bold">Ценники</h1>
        <div className="flex gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline"><Settings2 className="mr-2 h-4 w-4" /> Шаблон</Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-sm">
              <SheetHeader>
                <SheetTitle>Настройка шаблона</SheetTitle>
              </SheetHeader>
              <div className="space-y-6 mt-6 overflow-y-auto max-h-[calc(100vh-100px)]">
                {/* Store name */}
                <div className="space-y-2">
                  <Label>Название магазина</Label>
                  <Input
                    placeholder="Например: PRO APPLE"
                    value={settings.storeName}
                    onChange={(e) => setSettings(s => ({ ...s, storeName: e.target.value }))}
                  />
                </div>

                {/* Size */}
                <div className="space-y-2">
                  <Label>Размер ценника</Label>
                  <Select value={settings.size} onValueChange={(v) => setSettings(s => ({ ...s, size: v as TagSize }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Маленький (4 в ряд)</SelectItem>
                      <SelectItem value="medium">Средний (2 в ряд)</SelectItem>
                      <SelectItem value="large">Большой (1 в ряд)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Fields */}
                <div className="space-y-3">
                  <Label>Отображаемые поля</Label>
                  {[
                    { key: "showMemory" as const, label: "Память" },
                    { key: "showColor" as const, label: "Цвет" },
                    { key: "showBattery" as const, label: "Состояние АКБ" },
                    { key: "showImei" as const, label: "IMEI" },
                    { key: "showBrand" as const, label: "Бренд" },
                    { key: "showSim" as const, label: "2Sim" },
                    { key: "showOldPrice" as const, label: "Старая цена (зачёркнутая)" },
                    { key: "showPromoPrice" as const, label: "Акционная цена" },
                  ].map(f => (
                    <div key={f.key} className="flex items-center justify-between">
                      <span className="text-sm">{f.label}</span>
                      <Switch checked={settings[f.key]} onCheckedChange={(v) => setSettings(s => ({ ...s, [f.key]: v }))} />
                    </div>
                  ))}
                  {settings.showPromoPrice && (
                    <div className="flex items-center justify-between pl-4">
                      <span className="text-sm text-muted-foreground">Скидка %</span>
                      <Input
                        type="number"
                        value={settings.promoPricePercent}
                        onChange={(e) => setSettings(s => ({ ...s, promoPricePercent: Number(e.target.value) || 0 }))}
                        className="w-20 h-8 text-sm"
                      />
                    </div>
                  )}
                </div>

                {/* Logo */}
                <div className="space-y-3">
                  <Label>Логотип магазина</Label>
                  {settings.logoUrl ? (
                    <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50">
                      <img src={settings.logoUrl} alt="logo" className="h-10 max-w-[120px] object-contain" />
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={removeLogo}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button variant="outline" className="w-full" onClick={() => fileRef.current?.click()} disabled={uploading}>
                      {uploading ? "Загрузка..." : <><Upload className="mr-2 h-4 w-4" /> Загрузить логотип</>}
                    </Button>
                  )}
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  <p className="text-[11px] text-muted-foreground">PNG или JPG, рекомендуется прозрачный фон</p>
                </div>

                {/* Promo text */}
                <div className="space-y-2">
                  <Label>Текст акции</Label>
                  <Input
                    placeholder="при покупке аксессуаров скидка 2.000"
                    value={settings.promoText}
                    onChange={(e) => setSettings(s => ({ ...s, promoText: e.target.value }))}
                  />
                  <p className="text-[11px] text-muted-foreground">Отображается внизу ценника</p>
                </div>
              </div>
            </SheetContent>
          </Sheet>
          <Button onClick={() => window.print()} disabled={selected.size === 0}>
            <Printer className="mr-2 h-4 w-4" />
            Печать ({selected.size})
          </Button>
        </div>
      </div>

      {/* Selection UI */}
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
              <p className="text-sm text-muted-foreground text-center py-8">Нет устройств за последние 24 часа</p>
            ) : (
              <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
                {recentDevices.map((d: any) => <DeviceRow key={d.id} device={d} />)}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Print layout */}
      {selectedDevices.length > 0 && (
        <div className="hidden print:block">
          <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${sizeConf.printCols}, 1fr)` }}>
            {selectedDevices.map((d: any) => <PriceTag key={d.id} device={d} forPrint />)}
          </div>
        </div>
      )}

      {/* Preview */}
      {selectedDevices.length > 0 && (
        <div className="print:hidden">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">Предпросмотр ({selectedDevices.length})</h2>
          <div className={`grid gap-3`} style={{ gridTemplateColumns: `repeat(${sizeConf.cols}, 1fr)` }}>
            {selectedDevices.map((d: any) => <PriceTag key={d.id} device={d} />)}
          </div>
        </div>
      )}
    </div>
  );
};

export default PriceTagsPage;
