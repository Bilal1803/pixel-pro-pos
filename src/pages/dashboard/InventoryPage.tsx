import { useState, useMemo, useRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Search, Upload, FileSpreadsheet, X, Pencil, Trash2, AlertTriangle, Info, Megaphone, CheckCircle2, RefreshCw, Loader2 as Spinner, ExternalLink } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import ComboboxInput from "@/components/ComboboxInput";
import { ALL_CATALOG_MODELS, ALL_CATALOG_MEMORIES, ALL_CATALOG_COLORS, PRESET_BRANDS, getModelData } from "@/data/deviceCatalog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import * as XLSX from "xlsx";
import SectionHelp from "@/components/SectionHelp";
import { SECTION_TIPS } from "@/data/sectionTips";

const statusLabels: Record<string, { label: string; className: string }> = {
  available: { label: "В наличии", className: "bg-success/10 text-success" },
  testing: { label: "Проверка", className: "bg-warning/10 text-warning" },
  reserved: { label: "Резерв", className: "bg-primary/10 text-primary" },
  sold: { label: "Продано", className: "bg-muted text-muted-foreground" },
  defective: { label: "Дефект", className: "bg-destructive/10 text-destructive" },
  rental: { label: "Аренда", className: "bg-primary/10 text-primary" },
};

const listingLabels: Record<string, { label: string; icon: typeof Megaphone; className: string }> = {
  not_listed: { label: "Не опубликовано", icon: Megaphone, className: "text-muted-foreground" },
  listed: { label: "Опубликовано", icon: CheckCircle2, className: "text-green-600" },
  needs_relist: { label: "Перевыложить", icon: RefreshCw, className: "text-amber-600" },
};

const STATUS_TABS = [
  { value: "all", label: "Все" },
  { value: "available", label: "В наличии" },
  { value: "testing", label: "Проверка" },
  { value: "reserved", label: "Резерв" },
  { value: "sold", label: "Проданные" },
  { value: "defective", label: "Дефект" },
  { value: "rental", label: "Аренда" },
];

type ParsedDevice = {
  model: string;
  brand?: string;
  memory?: string;
  color?: string;
  imei: string;
  battery_health?: string;
  purchase_price?: number;
  sale_price?: number;
  status?: string;
  notes?: string;
};

const COLUMN_MAP: Record<string, keyof ParsedDevice> = {
  "модель": "model", "model": "model", "название": "model", "name": "model",
  "бренд": "brand", "brand": "brand", "марка": "brand",
  "память": "memory", "memory": "memory", "storage": "memory", "объём": "memory", "объем": "memory",
  "цвет": "color", "color": "color",
  "imei": "imei", "имей": "imei", "серийный номер": "imei", "serial": "imei",
  "акб": "battery_health", "battery": "battery_health", "батарея": "battery_health", "battery_health": "battery_health",
  "закупка": "purchase_price", "цена закупки": "purchase_price", "purchase_price": "purchase_price", "cost": "purchase_price", "себестоимость": "purchase_price",
  "продажа": "sale_price", "цена продажи": "sale_price", "sale_price": "sale_price", "price": "sale_price", "цена": "sale_price",
  "статус": "status", "status": "status",
  "заметки": "notes", "notes": "notes", "примечание": "notes", "комментарий": "notes",
};

const normalizeStatus = (s?: string): string => {
  if (!s) return "testing";
  const lower = s.toLowerCase().trim();
  const map: Record<string, string> = {
    "в наличии": "available", "available": "available", "наличие": "available",
    "проверка": "testing", "testing": "testing", "тест": "testing",
    "резерв": "reserved", "reserved": "reserved",
    "продано": "sold", "sold": "sold",
    "дефект": "defective", "defective": "defective", "брак": "defective",
    "аренда": "rental", "rental": "rental",
  };
  return map[lower] || "testing";
};

const InventoryPage = () => {
  const { companyId, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState("all");
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedDevice[]>([]);
  const [fileName, setFileName] = useState("");
  const [form, setForm] = useState({ model: "", brand: "", memory: "", color: "", imei: "", battery_health: "", purchase_price: "", sale_price: "", status: "testing" as string, notes: "", sim_type: "", condition: "used" });
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ id: "", model: "", brand: "", memory: "", color: "", imei: "", battery_health: "", purchase_price: "", sale_price: "", status: "testing" as string, notes: "", sim_type: "", condition: "used" });
  const [listingDialogOpen, setListingDialogOpen] = useState(false);
  const [listingDevice, setListingDevice] = useState<any>(null);
  const [listingUrl, setListingUrl] = useState("");
  const [analyzingListings, setAnalyzingListings] = useState(false);

  // IMEI duplicate check
  const [imeiDuplicate, setImeiDuplicate] = useState<{ blocked: boolean; message: string; device?: { model: string; memory: string | null; color: string | null; status: string; store_name?: string } } | null>(null);
  const [imeiChecking, setImeiChecking] = useState(false);
  const imeiCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkImeiDuplicate = useCallback(async (imei: string) => {
    if (!imei || imei.length < 5 || !companyId) {
      setImeiDuplicate(null);
      return;
    }
    setImeiChecking(true);
    try {
      const { data, error } = await supabase
        .from("devices")
        .select("model, memory, color, status, stores:store_id(name)")
        .eq("company_id", companyId)
        .eq("imei", imei.trim());
      if (error) throw error;
      if (!data || data.length === 0) {
        setImeiDuplicate(null);
        return;
      }
      const active = data.find((d: any) => d.status !== "sold");
      if (active) {
        const storeName = (active as any).stores?.name || undefined;
        setImeiDuplicate({
          blocked: true,
          message: "Устройство с таким IMEI уже есть на складе.",
          device: { model: active.model, memory: active.memory, color: active.color, status: active.status, store_name: storeName },
        });
        return;
      }
      setImeiDuplicate({ blocked: false, message: "Этот IMEI уже был продан ранее." });
    } catch {
      setImeiDuplicate(null);
    } finally {
      setImeiChecking(false);
    }
  }, [companyId]);

  const handleImeiChange = (imei: string) => {
    setForm(prev => ({ ...prev, imei }));
    if (imeiCheckTimer.current) clearTimeout(imeiCheckTimer.current);
    imeiCheckTimer.current = setTimeout(() => checkImeiDuplicate(imei), 400);
  };

  const { data: devicesData, isLoading } = useQuery({
    queryKey: ["devices", companyId, statusTab, search],
    queryFn: async () => {
      if (!companyId) return { data: [], count: 0 };
      let query = supabase
        .from("devices")
        .select("id, model, brand, memory, color, imei, battery_health, purchase_price, sale_price, status, notes, sim_type, condition, listing_status, listing_url, listing_published_at, store_id, created_at", { count: "exact" })
        .eq("company_id", companyId);

      if (statusTab !== "all") {
        query = query.eq("status", statusTab as any);
      }
      if (search.trim()) {
        const q = search.trim();
        query = query.or(`model.ilike.%${q}%,imei.ilike.%${q}%`);
      }

      query = query.order("model").order("memory").order("created_at", { ascending: false });

      const { data, error, count } = await query;
      if (error) throw error;
      return { data: data || [], count: count || 0 };
    },
    enabled: !!companyId,
  });

  const devices = devicesData?.data || [];

  const { data: priceMonitoring = [] } = useQuery({
    queryKey: ["price_monitoring", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase.from("price_monitoring").select("model, avg_price, our_price, prices, margin_new, margin_used").eq("company_id", companyId);
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
    staleTime: 5 * 60_000,
  });

  const { data: buybackSettings } = useQuery({
    queryKey: ["buyback-settings", companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data, error } = await supabase.from("buyback_settings").select("*").eq("company_id", companyId).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const getMonitoringEntry = (model: string, memory: string) => {
    const key = `${model} ${memory}`.trim();
    return priceMonitoring.find(p => p.model === key) || null;
  };

  const getRecommendedSalePrice = (model: string, memory: string) => {
    const entry = getMonitoringEntry(model, memory);
    if (!entry) return null;
    if (entry.our_price) return { price: entry.our_price, source: "our" as const };
    if (entry.avg_price) return { price: Math.round(entry.avg_price), source: "avg" as const };
    const prices = (entry.prices || []).filter((p: number | null) => p && p > 0) as number[];
    if (prices.length > 0) {
      const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
      return { price: avg, source: "avg" as const };
    }
    return null;
  };

  const getRecommendedPurchasePrice = (model: string, memory: string, condition: string) => {
    const saleRec = getRecommendedSalePrice(model, memory);
    if (!saleRec) return null;
    const entry = getMonitoringEntry(model, memory);
    const isNew = condition === "new";
    // Per-model margin override
    const modelMargin = entry && (isNew ? entry.margin_new : entry.margin_used);
    // Global margin
    const globalMargin = buybackSettings ? (isNew ? buybackSettings.margin_new : buybackSettings.margin_used) : null;
    const margin = modelMargin || globalMargin;
    if (!margin) return null;
    const price = Math.round(saleRec.price - margin);
    return price > 0 ? price : null;
  };

  // Legacy wrapper for import/other uses
  const getRecommendedPrice = (model: string) => {
    const entry = priceMonitoring.find(p => p.model === model);
    if (!entry) return null;
    return entry.our_price || (entry.avg_price ? Math.round(entry.avg_price * 0.95) : null);
  };

  const handleModelChange = (model: string) => {
    setForm(prev => ({ ...prev, model }));
  };

  const handleEditModelChange = (model: string) => {
    setEditForm(prev => ({ ...prev, model }));
  };


  // Status counts - fetch separately for tab badges (lightweight query)
  const { data: statusCounts = { all: 0 } } = useQuery({
    queryKey: ["device-status-counts", companyId],
    queryFn: async () => {
      if (!companyId) return { all: 0 };
      const { data, error } = await supabase
        .from("devices")
        .select("status")
        .eq("company_id", companyId);
      if (error) throw error;
      const counts: Record<string, number> = { all: data.length };
      for (const d of data) {
        counts[d.status] = (counts[d.status] || 0) + 1;
      }
      return counts;
    },
    enabled: !!companyId,
    staleTime: 30_000,
  });

  const modelOptions = useMemo(() => {
    const fromDb = devices.map(d => d.model).filter(Boolean);
    return [...new Set([...ALL_CATALOG_MODELS, ...fromDb])];
  }, [devices]);

  const brandOptions = useMemo(() => {
    const fromDb = devices.map(d => d.brand).filter(Boolean) as string[];
    return [...new Set([...PRESET_BRANDS, ...fromDb])];
  }, [devices]);

  const getMemoryOptions = (model: string) => {
    const catalogData = getModelData(model);
    const fromDb = [...new Set(devices.filter(d => d.memory).map(d => d.memory!) )];
    if (catalogData) return [...new Set([...catalogData.memories, ...fromDb])];
    return [...new Set([...ALL_CATALOG_MEMORIES, ...fromDb])];
  };

  const getColorOptions = (model: string) => {
    const catalogData = getModelData(model);
    const fromDb = [...new Set(devices.filter(d => d.color).map(d => d.color!))];
    if (catalogData) return [...new Set([...catalogData.colors, ...fromDb])];
    return [...new Set([...ALL_CATALOG_COLORS, ...fromDb])];
  };

  const addDevice = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("No company");
      const { error } = await supabase.from("devices").insert({
        company_id: companyId,
        model: form.model,
        brand: form.brand || null,
        memory: form.memory || null,
        color: form.color || null,
        imei: form.imei,
        battery_health: form.battery_health || null,
        purchase_price: form.purchase_price ? parseFloat(form.purchase_price) : null,
        sale_price: form.sale_price ? parseFloat(form.sale_price) : null,
        status: form.status as any,
        notes: form.notes || null,
        sim_type: form.sim_type || null,
        condition: form.condition || "used",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      toast({ title: "Устройство добавлено" });
      setOpen(false);
      setForm({ model: "", brand: "", memory: "", color: "", imei: "", battery_health: "", purchase_price: "", sale_price: "", status: "testing", notes: "", sim_type: "", condition: "used" });
      setImeiDuplicate(null);
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const updateDevice = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("devices").update({
        model: editForm.model,
        brand: editForm.brand || null,
        memory: editForm.memory || null,
        color: editForm.color || null,
        imei: editForm.imei,
        battery_health: editForm.battery_health || null,
        purchase_price: editForm.purchase_price ? parseFloat(editForm.purchase_price) : null,
        sale_price: editForm.sale_price ? parseFloat(editForm.sale_price) : null,
        status: editForm.status as any,
        notes: editForm.notes || null,
        sim_type: editForm.sim_type || null,
        condition: editForm.condition || "used",
      }).eq("id", editForm.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      toast({ title: "Устройство обновлено" });
      setEditOpen(false);
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("devices").update({ status: status as any }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["devices"] }),
  });

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

  const deleteDevice = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("devices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      toast({ title: "Устройство удалено" });
      setEditOpen(false);
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const openEdit = (device: any) => {
    setEditForm({
      id: device.id,
      model: device.model || "",
      brand: device.brand || "",
      memory: device.memory || "",
      color: device.color || "",
      imei: device.imei || "",
      battery_health: device.battery_health || "",
      purchase_price: device.purchase_price?.toString() || "",
      sale_price: device.sale_price?.toString() || "",
      status: device.status || "testing",
      notes: device.notes || "",
      sim_type: device.sim_type || "",
      condition: device.condition || "used",
    });
    setEditOpen(true);
  };

  const markAsListed = useMutation({
    mutationFn: async ({ deviceId, url }: { deviceId: string; url: string }) => {
      const { error } = await supabase.from("devices").update({
        listing_status: "listed",
        listing_url: url || null,
        listing_published_at: new Date().toISOString(),
      }).eq("id", deviceId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      toast({ title: "Объявление отмечено как опубликованное" });
      setListingDialogOpen(false);
      setListingDevice(null);
      setListingUrl("");
    },
  });

  const analyzeListings = async () => {
    setAnalyzingListings(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-listings");
      if (error) throw error;
      toast({ title: "Анализ завершён", description: `Создано задач: ${data.tasks_created}, обновлено устройств: ${data.devices_updated}` });
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    } catch {
      toast({ title: "Ошибка анализа", variant: "destructive" });
    } finally {
      setAnalyzingListings(false);
    }
  };
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

        if (json.length === 0) {
          toast({ title: "Файл пуст", variant: "destructive" });
          return;
        }

        const headerMap = new Map<string, keyof ParsedDevice>();
        const rawHeaders = Object.keys(json[0]);
        for (const h of rawHeaders) {
          const normalized = h.toLowerCase().trim();
          if (COLUMN_MAP[normalized]) {
            headerMap.set(h, COLUMN_MAP[normalized]);
          }
        }

        if (!headerMap.size) {
          toast({ title: "Не удалось распознать столбцы", description: "Убедитесь что в таблице есть столбцы: Модель, IMEI, Память, Цвет и т.д.", variant: "destructive" });
          return;
        }

        const parsed: ParsedDevice[] = [];
        for (const row of json) {
          const device: Partial<ParsedDevice> = {};
          for (const [rawH, field] of headerMap) {
            const val = String(row[rawH] ?? "").trim();
            if (!val) continue;
            if (field === "purchase_price" || field === "sale_price") {
              const num = parseFloat(val.replace(/[^\d.,]/g, "").replace(",", "."));
              if (!isNaN(num)) (device as any)[field] = num;
            } else if (field === "status") {
              device.status = normalizeStatus(val);
            } else {
              (device as any)[field] = val;
            }
          }
          if (device.model && device.imei) {
            parsed.push({
              model: device.model,
              imei: device.imei,
              brand: device.brand,
              memory: device.memory,
              color: device.color,
              battery_health: device.battery_health,
              purchase_price: device.purchase_price,
              sale_price: device.sale_price,
              status: device.status || "testing",
              notes: device.notes,
            });
          }
        }

        if (parsed.length === 0) {
          toast({ title: "Нет валидных строк", description: "Каждая строка должна содержать как минимум Модель и IMEI.", variant: "destructive" });
          return;
        }

        setParsedRows(parsed);
      } catch {
        toast({ title: "Ошибка чтения файла", variant: "destructive" });
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  const importDevices = useMutation({
    mutationFn: async () => {
      if (!companyId || parsedRows.length === 0) throw new Error("Нет данных");
      const toInsert = parsedRows.map((d) => ({
        company_id: companyId,
        model: d.model,
        imei: d.imei,
        brand: d.brand || null,
        memory: d.memory || null,
        color: d.color || null,
        battery_health: d.battery_health || null,
        purchase_price: d.purchase_price ?? null,
        sale_price: d.sale_price ?? null,
        status: (d.status || "testing") as any,
        notes: d.notes || null,
      }));

      for (let i = 0; i < toInsert.length; i += 50) {
        const batch = toInsert.slice(i, i + 50);
        const { error } = await supabase.from("devices").insert(batch);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      toast({ title: `Импортировано ${parsedRows.length} устройств` });
      setParsedRows([]);
      setFileName("");
      setImportOpen(false);
    },
    onError: (e: Error) => toast({ title: "Ошибка импорта", description: e.message, variant: "destructive" }),
  });

  const removeRow = (idx: number) => {
    setParsedRows((prev) => prev.filter((_, i) => i !== idx));
  };

  // Server-side filtering already applied via queryKey, just sort locally
  const filtered = useMemo(() => {
    const result = [...devices];
    result.sort((a, b) => {
      const modelCmp = a.model.localeCompare(b.model);
      if (modelCmp !== 0) return modelCmp;
      const memA = a.memory || "";
      const memB = b.memory || "";
      return memA.localeCompare(memB);
    });
    return result;
  }, [devices]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Склад устройств</h1>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={analyzeListings} disabled={analyzingListings}>
            {analyzingListings ? <Spinner className="mr-2 h-4 w-4 animate-spin" /> : <Megaphone className="mr-2 h-4 w-4" />}
            Анализ объявлений
          </Button>
          <Dialog open={importOpen} onOpenChange={(v) => { setImportOpen(v); if (!v) { setParsedRows([]); setFileName(""); } }}>
            <DialogTrigger asChild>
              <Button variant="outline"><Upload className="mr-2 h-4 w-4" /> Импорт</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
              <DialogHeader><DialogTitle>Импорт склада из таблицы</DialogTitle></DialogHeader>

              {parsedRows.length === 0 ? (
                <div className="space-y-5">
                  <p className="text-sm text-muted-foreground">
                    Загрузите файл Excel (.xlsx, .xls) или CSV. Первая строка — заголовки столбцов.
                  </p>

                  <div>
                    <p className="text-sm font-medium mb-2">Пример таблицы:</p>
                    <div className="overflow-x-auto rounded-lg border">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-muted">
                            <th className="px-2.5 py-2 text-left font-semibold text-primary">Модель ✱</th>
                            <th className="px-2.5 py-2 text-left font-semibold text-primary">IMEI ✱</th>
                            <th className="px-2.5 py-2 text-left font-medium">Память</th>
                            <th className="px-2.5 py-2 text-left font-medium">Цвет</th>
                            <th className="px-2.5 py-2 text-left font-medium">АКБ</th>
                            <th className="px-2.5 py-2 text-left font-medium">Цена закупки</th>
                            <th className="px-2.5 py-2 text-left font-medium">Цена продажи</th>
                            <th className="px-2.5 py-2 text-left font-medium">Статус</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          <tr>
                            <td className="px-2.5 py-1.5">iPhone 14 Pro</td>
                            <td className="px-2.5 py-1.5 font-mono">353456789012345</td>
                            <td className="px-2.5 py-1.5">128GB</td>
                            <td className="px-2.5 py-1.5">Чёрный</td>
                            <td className="px-2.5 py-1.5">92%</td>
                            <td className="px-2.5 py-1.5">45000</td>
                            <td className="px-2.5 py-1.5">55000</td>
                            <td className="px-2.5 py-1.5">В наличии</td>
                          </tr>
                          <tr className="bg-muted/20">
                            <td className="px-2.5 py-1.5">Samsung S24</td>
                            <td className="px-2.5 py-1.5 font-mono">357891234567890</td>
                            <td className="px-2.5 py-1.5">256GB</td>
                            <td className="px-2.5 py-1.5">Белый</td>
                            <td className="px-2.5 py-1.5">97%</td>
                            <td className="px-2.5 py-1.5">38000</td>
                            <td className="px-2.5 py-1.5">48000</td>
                            <td className="px-2.5 py-1.5">Проверка</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <p className="mt-1.5 text-[11px] text-muted-foreground">✱ Обязательные столбцы. Остальные можно не заполнять.</p>
                  </div>

                  <details className="group">
                    <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                      Какие названия столбцов распознаются? ▾
                    </summary>
                    <div className="mt-2 rounded-lg border bg-muted/20 p-3 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                      <span><strong className="text-foreground">Модель</strong> — model, название, name</span>
                      <span><strong className="text-foreground">IMEI</strong> — imei, серийный номер, serial</span>
                      <span>Бренд — brand, марка</span>
                      <span>Память — memory, объём, storage</span>
                      <span>Цвет — color</span>
                      <span>АКБ — battery, батарея, battery_health</span>
                      <span>Цена закупки — purchase_price, cost, себестоимость</span>
                      <span>Цена продажи — sale_price, price, цена</span>
                      <span>Статус — status (В наличии / Проверка / Резерв / Дефект)</span>
                      <span>Заметки — notes, примечание, комментарий</span>
                    </div>
                  </details>

                  <label className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed border-muted-foreground/30 p-8 hover:border-primary/50 hover:bg-muted/20 transition-colors">
                    <FileSpreadsheet className="h-10 w-10 text-muted-foreground" />
                    <span className="text-sm font-medium">Нажмите для выбора файла</span>
                    <span className="text-xs text-muted-foreground">.xlsx, .xls, .csv</span>
                    <input type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={handleFileSelect} />
                  </label>
                </div>
              ) : (
                <div className="flex flex-col gap-4 overflow-hidden">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      <strong>{fileName}</strong> — {parsedRows.length} устройств готово к импорту
                    </p>
                    <Button variant="ghost" size="sm" onClick={() => { setParsedRows([]); setFileName(""); }}>
                      Выбрать другой файл
                    </Button>
                  </div>

                  <div className="flex-1 overflow-auto rounded border max-h-[400px]">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-muted">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">Модель</th>
                          <th className="px-3 py-2 text-left font-medium">IMEI</th>
                          <th className="px-3 py-2 text-left font-medium">Память</th>
                          <th className="px-3 py-2 text-left font-medium">Цвет</th>
                          <th className="px-3 py-2 text-left font-medium">Закупка</th>
                          <th className="px-3 py-2 text-left font-medium">Продажа</th>
                          <th className="px-3 py-2 text-left font-medium">Статус</th>
                          <th className="px-3 py-2"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {parsedRows.map((r, i) => (
                          <tr key={i} className="hover:bg-muted/30">
                            <td className="px-3 py-1.5 font-medium">{r.model}</td>
                            <td className="px-3 py-1.5 font-mono">{r.imei}</td>
                            <td className="px-3 py-1.5">{r.memory || "—"}</td>
                            <td className="px-3 py-1.5">{r.color || "—"}</td>
                            <td className="px-3 py-1.5">{r.purchase_price ? `${r.purchase_price} ₽` : "—"}</td>
                            <td className="px-3 py-1.5">{r.sale_price ? `${r.sale_price} ₽` : "—"}</td>
                            <td className="px-3 py-1.5">
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusLabels[r.status || "testing"]?.className || ""}`}>
                                {statusLabels[r.status || "testing"]?.label || r.status}
                              </span>
                            </td>
                            <td className="px-3 py-1.5">
                              <button onClick={() => removeRow(i)} className="text-muted-foreground hover:text-destructive">
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <Button onClick={() => importDevices.mutate()} disabled={importDevices.isPending} className="w-full">
                    {importDevices.isPending ? "Импорт..." : `Импортировать ${parsedRows.length} устройств`}
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Добавить устройство</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Новое устройство</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); addDevice.mutate(); }} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Модель *</Label><ComboboxInput value={form.model} onChange={handleModelChange} options={modelOptions} required /></div>
                  <div><Label>Бренд</Label><ComboboxInput value={form.brand} onChange={(v) => setForm({ ...form, brand: v })} options={brandOptions} /></div>
                  <div>
                    <Label>Состояние</Label>
                    <Select value={form.condition} onValueChange={(v) => setForm({ ...form, condition: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="used">БУ</SelectItem>
                        <SelectItem value="new">Новый</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Память</Label><ComboboxInput value={form.memory} onChange={(v) => setForm({ ...form, memory: v })} options={getMemoryOptions(form.model)} placeholder="128GB" /></div>
                  <div><Label>Цвет</Label><ComboboxInput value={form.color} onChange={(v) => setForm({ ...form, color: v })} options={getColorOptions(form.model)} /></div>
                  <div>
                    <Label>IMEI *</Label>
                    <Input value={form.imei} onChange={(e) => handleImeiChange(e.target.value)} required />
                    {imeiChecking && <p className="mt-1 text-[11px] text-muted-foreground">Проверка IMEI...</p>}
                    {imeiDuplicate?.blocked && (
                      <div className="mt-1.5 rounded-md border border-destructive/30 bg-destructive/5 p-2">
                        <div className="flex items-center gap-1.5 text-[12px] font-medium text-destructive">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          {imeiDuplicate.message}
                        </div>
                        {imeiDuplicate.device && (
                          <div className="mt-1 grid grid-cols-2 gap-x-3 text-[11px] text-muted-foreground">
                            <span>Модель: <strong className="text-foreground">{imeiDuplicate.device.model}</strong></span>
                            <span>Память: <strong className="text-foreground">{imeiDuplicate.device.memory || "—"}</strong></span>
                            <span>Цвет: <strong className="text-foreground">{imeiDuplicate.device.color || "—"}</strong></span>
                            <span>Статус: <strong className="text-foreground">{statusLabels[imeiDuplicate.device.status]?.label || imeiDuplicate.device.status}</strong></span>
                            {imeiDuplicate.device.store_name && <span className="col-span-2">Магазин: <strong className="text-foreground">{imeiDuplicate.device.store_name}</strong></span>}
                          </div>
                        )}
                      </div>
                    )}
                    {imeiDuplicate && !imeiDuplicate.blocked && (
                      <div className="mt-1.5 flex items-center gap-1.5 text-[12px] text-amber-600">
                        <Info className="h-3.5 w-3.5" />
                        {imeiDuplicate.message}
                      </div>
                    )}
                  </div>
                  <div><Label>АКБ</Label><Input placeholder="94%" value={form.battery_health} onChange={(e) => setForm({ ...form, battery_health: e.target.value })} /></div>
                  <div>
                    <Label>SIM</Label>
                    <Select value={form.sim_type} onValueChange={(v) => setForm({ ...form, sim_type: v })}>
                      <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sim+esim">SIM + eSIM</SelectItem>
                        <SelectItem value="2sim">2 SIM</SelectItem>
                        <SelectItem value="esim">eSIM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Цена закупки</Label>
                    <Input type="number" value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: e.target.value })} />
                    {(() => {
                      const rec = getRecommendedPurchasePrice(form.model, form.memory, form.condition);
                      if (!rec && form.model && form.memory) return <p className="mt-1 text-[11px] text-muted-foreground">Нет данных скупки для данной модели</p>;
                      return rec ? (
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-[11px] text-muted-foreground">Рекомендуемая цена закупки: <span className="font-medium text-foreground">{rec.toLocaleString()} ₽</span></span>
                          <button type="button" className="text-[11px] text-primary hover:underline font-medium" onClick={() => setForm({ ...form, purchase_price: String(rec) })}>Использовать</button>
                        </div>
                      ) : null;
                    })()}
                  </div>
                  <div>
                    <Label>Цена продажи</Label>
                    <Input type="number" value={form.sale_price} onChange={(e) => setForm({ ...form, sale_price: e.target.value })} />
                    {(() => {
                      const rec = getRecommendedSalePrice(form.model, form.memory);
                      if (!rec && form.model && form.memory) return <p className="mt-1 text-[11px] text-muted-foreground">Нет данных мониторинга для данной модели</p>;
                      return rec ? (
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-[11px] text-muted-foreground">{rec.source === "our" ? "Наша цена" : "Средняя цена по рынку"}: <span className="font-medium text-foreground">{rec.price.toLocaleString()} ₽</span></span>
                          <button type="button" className="text-[11px] text-primary hover:underline font-medium" onClick={() => setForm({ ...form, sale_price: String(rec.price) })}>Использовать</button>
                        </div>
                      ) : null;
                    })()}
                  </div>
                </div>
                <div>
                  <Label>Статус</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="testing">Проверка</SelectItem>
                      <SelectItem value="available">В наличии</SelectItem>
                      <SelectItem value="reserved">Резерв</SelectItem>
                      <SelectItem value="defective">Дефект</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Заметки</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
                <Button type="submit" className="w-full" disabled={addDevice.isPending || !!imeiDuplicate?.blocked}>
                  {addDevice.isPending ? "Сохранение..." : "Добавить"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Status tabs */}
      <Tabs value={statusTab} onValueChange={setStatusTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          {STATUS_TABS.map(tab => (
            <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5">
              {tab.label}
              <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-[10px]">
                {statusCounts[tab.value] || 0}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <SectionHelp tips={SECTION_TIPS.inventory} />

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Поиск по модели или IMEI..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card className="card-shadow overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Загрузка...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            {statusTab === "all" ? "Нет устройств. Добавьте первое!" : `Нет устройств со статусом «${STATUS_TABS.find(t => t.value === statusTab)?.label}»`}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Модель</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Память</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Цвет</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">IMEI</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">SIM</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">АКБ</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Закупка</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Продажа</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Статус</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Объявление</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((d) => (
                  <tr key={d.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{d.model}</td>
                    <td className="px-4 py-3">{d.memory || "—"}</td>
                    <td className="px-4 py-3">{d.color || "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs">{d.imei}</td>
                    <td className="px-4 py-3 text-xs">{d.sim_type || "—"}</td>
                    <td className="px-4 py-3">{d.battery_health || "—"}</td>
                    <td className="px-4 py-3">{d.purchase_price ? `${d.purchase_price} ₽` : "—"}</td>
                    <td className="px-4 py-3">{d.sale_price ? `${d.sale_price} ₽` : "—"}</td>
                    <td className="px-4 py-3">
                      <Select value={d.status} onValueChange={(v) => updateStatus.mutate({ id: d.id, status: v })}>
                        <SelectTrigger className="h-7 w-auto border-0 bg-transparent p-0">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusLabels[d.status]?.className || ""}`}>
                            {statusLabels[d.status]?.label || d.status}
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="testing">Проверка</SelectItem>
                          <SelectItem value="available">В наличии</SelectItem>
                          <SelectItem value="reserved">Резерв</SelectItem>
                          <SelectItem value="sold">Продано</SelectItem>
                          <SelectItem value="defective">Дефект</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const ls = (d as any).listing_status || "not_listed";
                        const cfg = listingLabels[ls] || listingLabels.not_listed;
                        const Icon = cfg.icon;
                        return (
                          <button
                            onClick={() => {
                              if (ls === "listed" && (d as any).listing_url) {
                                window.open((d as any).listing_url, "_blank");
                              } else {
                                setListingDevice(d);
                                setListingUrl((d as any).listing_url || "");
                                setListingDialogOpen(true);
                              }
                            }}
                            className={`flex items-center gap-1 text-xs font-medium ${cfg.className} hover:opacity-70 transition-opacity`}
                            title={ls === "listed" ? "Открыть объявление" : "Отметить как опубликованное"}
                          >
                            <Icon className="h-3.5 w-3.5" />
                            {ls === "listed" && (d as any).listing_url && <ExternalLink className="h-3 w-3" />}
                          </button>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(d)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Редактировать устройство</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); updateDevice.mutate(); }} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Модель *</Label><ComboboxInput value={editForm.model} onChange={handleEditModelChange} options={modelOptions} required /></div>
              <div><Label>Бренд</Label><ComboboxInput value={editForm.brand} onChange={(v) => setEditForm({ ...editForm, brand: v })} options={brandOptions} /></div>
              <div>
                <Label>Состояние</Label>
                <Select value={editForm.condition} onValueChange={(v) => setEditForm({ ...editForm, condition: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="used">БУ</SelectItem>
                    <SelectItem value="new">Новый</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Память</Label><ComboboxInput value={editForm.memory} onChange={(v) => setEditForm({ ...editForm, memory: v })} options={getMemoryOptions(editForm.model)} placeholder="128GB" /></div>
              <div><Label>Цвет</Label><ComboboxInput value={editForm.color} onChange={(v) => setEditForm({ ...editForm, color: v })} options={getColorOptions(editForm.model)} /></div>
              <div><Label>IMEI *</Label><Input value={editForm.imei} onChange={(e) => setEditForm({ ...editForm, imei: e.target.value })} required /></div>
              <div><Label>АКБ</Label><Input placeholder="94%" value={editForm.battery_health} onChange={(e) => setEditForm({ ...editForm, battery_health: e.target.value })} /></div>
              <div>
                <Label>SIM</Label>
                <Select value={editForm.sim_type} onValueChange={(v) => setEditForm({ ...editForm, sim_type: v })}>
                  <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sim+esim">SIM + eSIM</SelectItem>
                    <SelectItem value="2sim">2 SIM</SelectItem>
                    <SelectItem value="esim">eSIM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Цена закупки</Label><Input type="number" value={editForm.purchase_price} onChange={(e) => setEditForm({ ...editForm, purchase_price: e.target.value })} /></div>
              <div>
                <Label>Цена продажи</Label>
                <Input type="number" value={editForm.sale_price} onChange={(e) => setEditForm({ ...editForm, sale_price: e.target.value })} />
                {(() => {
                  const rec = getRecommendedPrice(editForm.model);
                  return rec ? (
                    <button
                      type="button"
                      className="mt-1 text-xs text-primary hover:underline"
                      onClick={() => setEditForm({ ...editForm, sale_price: String(rec) })}
                    >
                      Рекомендуемая: {rec.toLocaleString()} ₽
                    </button>
                  ) : null;
                })()}
              </div>
            </div>
            <div>
              <Label>Статус</Label>
              <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="testing">Проверка</SelectItem>
                  <SelectItem value="available">В наличии</SelectItem>
                  <SelectItem value="reserved">Резерв</SelectItem>
                  <SelectItem value="sold">Продано</SelectItem>
                  <SelectItem value="defective">Дефект</SelectItem>
                  <SelectItem value="rental">Аренда</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Заметки</Label><Textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} /></div>
            <div className="flex gap-2">
              {isOwner && (
                <Button
                  type="button"
                  variant="destructive"
                  className="flex-1"
                  disabled={deleteDevice.isPending}
                  onClick={() => {
                    if (confirm("Удалить устройство? Это действие нельзя отменить.")) {
                      deleteDevice.mutate(editForm.id);
                    }
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {deleteDevice.isPending ? "Удаление..." : "Удалить"}
                </Button>
              )}
              <Button type="submit" className="flex-1" disabled={updateDevice.isPending}>
                {updateDevice.isPending ? "Сохранение..." : "Сохранить изменения"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Listing publish dialog */}
      <Dialog open={listingDialogOpen} onOpenChange={setListingDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Публикация объявления</DialogTitle></DialogHeader>
          {listingDevice && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-3 text-sm">
                <p className="font-medium">{listingDevice.model}</p>
                <p className="text-xs text-muted-foreground">{[listingDevice.memory, listingDevice.color].filter(Boolean).join(" · ")}</p>
              </div>
              <div>
                <Label>Ссылка на объявление (Авито и т.д.)</Label>
                <Input placeholder="https://avito.ru/..." value={listingUrl} onChange={(e) => setListingUrl(e.target.value)} />
              </div>
              <Button
                className="w-full"
                disabled={markAsListed.isPending}
                onClick={() => markAsListed.mutate({ deviceId: listingDevice.id, url: listingUrl })}
              >
                {markAsListed.isPending ? "Сохранение..." : "Опубликовано"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InventoryPage;
