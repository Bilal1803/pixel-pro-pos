import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Search, Upload, FileSpreadsheet, X, Pencil } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import ComboboxInput from "@/components/ComboboxInput";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import * as XLSX from "xlsx";

const statusLabels: Record<string, { label: string; className: string }> = {
  available: { label: "В наличии", className: "bg-success/10 text-success" },
  testing: { label: "Проверка", className: "bg-warning/10 text-warning" },
  reserved: { label: "Резерв", className: "bg-primary/10 text-primary" },
  sold: { label: "Продано", className: "bg-muted text-muted-foreground" },
  defective: { label: "Дефект", className: "bg-destructive/10 text-destructive" },
  rental: { label: "Аренда", className: "bg-primary/10 text-primary" },
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
  const { companyId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState("all");
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedDevice[]>([]);
  const [fileName, setFileName] = useState("");
  const [form, setForm] = useState({ model: "", brand: "", memory: "", color: "", imei: "", battery_health: "", purchase_price: "", sale_price: "", status: "testing" as string, notes: "" });
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ id: "", model: "", brand: "", memory: "", color: "", imei: "", battery_health: "", purchase_price: "", sale_price: "", status: "testing" as string, notes: "" });

  const { data: devices = [], isLoading } = useQuery({
    queryKey: ["devices", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase.from("devices").select("*").eq("company_id", companyId).order("model", { ascending: true }).order("memory", { ascending: true }).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  // Count by status
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: devices.length };
    for (const d of devices) {
      counts[d.status] = (counts[d.status] || 0) + 1;
    }
    return counts;
  }, [devices]);

  const uniqueModels = useMemo(() => [...new Set(devices.map(d => d.model).filter(Boolean))].sort(), [devices]);
  const uniqueBrands = useMemo(() => [...new Set(devices.map(d => d.brand).filter(Boolean) as string[])].sort(), [devices]);
  const uniqueMemory = useMemo(() => [...new Set(devices.map(d => d.memory).filter(Boolean) as string[])].sort(), [devices]);
  const uniqueColors = useMemo(() => [...new Set(devices.map(d => d.color).filter(Boolean) as string[])].sort(), [devices]);

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
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      toast({ title: "Устройство добавлено" });
      setOpen(false);
      setForm({ model: "", brand: "", memory: "", color: "", imei: "", battery_health: "", purchase_price: "", sale_price: "", status: "testing", notes: "" });
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
    });
    setEditOpen(true);
  };

  // --- Import logic ---
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

  const filtered = useMemo(() => {
    let result = [...devices];
    if (statusTab !== "all") {
      result = result.filter(d => d.status === statusTab);
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(d =>
        d.model.toLowerCase().includes(q) || d.imei.includes(q)
      );
    }
    result.sort((a, b) => {
      const modelCmp = a.model.localeCompare(b.model);
      if (modelCmp !== 0) return modelCmp;
      const memA = a.memory || "";
      const memB = b.memory || "";
      return memA.localeCompare(memB);
    });
    return result;
  }, [devices, statusTab, search]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Склад устройств</h1>
        <div className="flex gap-2">
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
                  <div><Label>Модель *</Label><ComboboxInput value={form.model} onChange={(v) => setForm({ ...form, model: v })} options={uniqueModels} required /></div>
                  <div><Label>Бренд</Label><ComboboxInput value={form.brand} onChange={(v) => setForm({ ...form, brand: v })} options={uniqueBrands} /></div>
                  <div><Label>Память</Label><ComboboxInput value={form.memory} onChange={(v) => setForm({ ...form, memory: v })} options={uniqueMemory} placeholder="128GB" /></div>
                  <div><Label>Цвет</Label><ComboboxInput value={form.color} onChange={(v) => setForm({ ...form, color: v })} options={uniqueColors} /></div>
                  <div><Label>IMEI *</Label><Input value={form.imei} onChange={(e) => setForm({ ...form, imei: e.target.value })} required /></div>
                  <div><Label>АКБ</Label><Input placeholder="94%" value={form.battery_health} onChange={(e) => setForm({ ...form, battery_health: e.target.value })} /></div>
                  <div><Label>Цена закупки</Label><Input type="number" value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: e.target.value })} /></div>
                  <div><Label>Цена продажи</Label><Input type="number" value={form.sale_price} onChange={(e) => setForm({ ...form, sale_price: e.target.value })} /></div>
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
                <Button type="submit" className="w-full" disabled={addDevice.isPending}>
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
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">АКБ</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Закупка</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Продажа</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Статус</th>
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
              <div><Label>Модель *</Label><Input value={editForm.model} onChange={(e) => setEditForm({ ...editForm, model: e.target.value })} required /></div>
              <div><Label>Бренд</Label><Input value={editForm.brand} onChange={(e) => setEditForm({ ...editForm, brand: e.target.value })} /></div>
              <div><Label>Память</Label><Input placeholder="128GB" value={editForm.memory} onChange={(e) => setEditForm({ ...editForm, memory: e.target.value })} /></div>
              <div><Label>Цвет</Label><Input value={editForm.color} onChange={(e) => setEditForm({ ...editForm, color: e.target.value })} /></div>
              <div><Label>IMEI *</Label><Input value={editForm.imei} onChange={(e) => setEditForm({ ...editForm, imei: e.target.value })} required /></div>
              <div><Label>АКБ</Label><Input placeholder="94%" value={editForm.battery_health} onChange={(e) => setEditForm({ ...editForm, battery_health: e.target.value })} /></div>
              <div><Label>Цена закупки</Label><Input type="number" value={editForm.purchase_price} onChange={(e) => setEditForm({ ...editForm, purchase_price: e.target.value })} /></div>
              <div><Label>Цена продажи</Label><Input type="number" value={editForm.sale_price} onChange={(e) => setEditForm({ ...editForm, sale_price: e.target.value })} /></div>
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
            <Button type="submit" className="w-full" disabled={updateDevice.isPending}>
              {updateDevice.isPending ? "Сохранение..." : "Сохранить изменения"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InventoryPage;
