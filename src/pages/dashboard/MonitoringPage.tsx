import { useState, useMemo, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, RefreshCw, Plus, Trash2, Upload, FileSpreadsheet, X } from "lucide-react";
import * as XLSX from "xlsx";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { IPHONE_CATALOG } from "@/data/deviceCatalog";
import SectionHelp from "@/components/SectionHelp";
import { SECTION_TIPS } from "@/data/sectionTips";

type CatalogRow = { model: string; memory: string; isCustom?: boolean };

const catalogRows: CatalogRow[] = IPHONE_CATALOG.flatMap((m) =>
  m.memories.map((mem) => ({ model: m.name, memory: mem }))
);

const MonitoringPage = () => {
  const { companyId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<CatalogRow | null>(null);
  const [priceSlots, setPriceSlots] = useState<string[]>(Array(10).fill(""));
  const [ourPrice, setOurPrice] = useState("");

  // Add model dialog
  const [addOpen, setAddOpen] = useState(false);
  const [newModel, setNewModel] = useState("");
  const [newMemory, setNewMemory] = useState("");

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<{ key: string; id?: string; isCustom?: boolean } | null>(null);

  // Import state
  type ImportRow = { model: string; memory: string; our_price?: number };
  const [importOpen, setImportOpen] = useState(false);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [importFileName, setImportFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: monitoring = [], isLoading } = useQuery({
    queryKey: ["price-monitoring", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("price_monitoring")
        .select("*")
        .eq("company_id", companyId);
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const monitoringMap = useMemo(() => {
    const map: Record<string, (typeof monitoring)[0]> = {};
    for (const m of monitoring) {
      map[m.model] = m;
    }
    return map;
  }, [monitoring]);

  // Build catalog keys set for detecting custom models
  const catalogKeySet = useMemo(() => {
    const s = new Set<string>();
    for (const r of catalogRows) s.add(`${r.model} ${r.memory}`);
    return s;
  }, []);

  // Merge catalog rows + custom rows from DB
  const allRows = useMemo(() => {
    const rows: CatalogRow[] = [...catalogRows];
    for (const m of monitoring) {
      if (!catalogKeySet.has(m.model)) {
        // Parse "Model Memory" format
        const parts = m.model.split(" ");
        const memory = parts.pop() || "";
        const model = parts.join(" ") || m.model;
        rows.push({ model, memory, isCustom: true });
      }
    }
    return rows;
  }, [monitoring, catalogKeySet]);

  const filteredRows = useMemo(() => {
    if (!search.trim()) return allRows;
    const q = search.toLowerCase();
    return allRows.filter(
      (r) =>
        r.model.toLowerCase().includes(q) ||
        r.memory.toLowerCase().includes(q)
    );
  }, [search, allRows]);

  const openDialog = (row: CatalogRow) => {
    const key = `${row.model} ${row.memory}`;
    const existing = monitoringMap[key];
    setSelected(row);
    if (existing) {
      const existingPrices = existing.prices || [];
      const slots = Array(10)
        .fill("")
        .map((_, i) => (existingPrices[i] ? String(existingPrices[i]) : ""));
      setPriceSlots(slots);
      setOurPrice(existing.our_price ? String(existing.our_price) : "");
    } else {
      setPriceSlots(Array(10).fill(""));
      setOurPrice("");
    }
    setDialogOpen(true);
  };

  const upsertEntry = useMutation({
    mutationFn: async () => {
      if (!companyId || !selected) throw new Error("No data");
      const modelName = `${selected.model} ${selected.memory}`;
      const pricesArr = priceSlots
        .map(Number)
        .filter((n) => !isNaN(n) && n > 0);
      const avg =
        pricesArr.length > 0
          ? Math.round(pricesArr.reduce((a, b) => a + b, 0) / pricesArr.length)
          : null;

      const existing = monitoringMap[modelName];
      if (existing) {
        const { error } = await supabase
          .from("price_monitoring")
          .update({
            prices: pricesArr,
            avg_price: avg,
            our_price: ourPrice ? Number(ourPrice) : null,
          })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("price_monitoring").insert({
          company_id: companyId,
          model: modelName,
          prices: pricesArr,
          avg_price: avg,
          our_price: ourPrice ? Number(ourPrice) : null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["price-monitoring"] });
      toast({ title: "Цена обновлена" });
      setDialogOpen(false);
      setSelected(null);
    },
    onError: (e: Error) =>
      toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  // Add custom model
  const addModel = useMutation({
    mutationFn: async () => {
      if (!companyId || !newModel.trim() || !newMemory.trim()) throw new Error("Заполните поля");
      const modelName = `${newModel.trim()} ${newMemory.trim()}`;
      if (monitoringMap[modelName]) throw new Error("Модель уже существует");
      const { error } = await supabase.from("price_monitoring").insert({
        company_id: companyId,
        model: modelName,
        prices: [],
        avg_price: null,
        our_price: null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["price-monitoring"] });
      toast({ title: "Модель добавлена" });
      setAddOpen(false);
      setNewModel("");
      setNewMemory("");
    },
    onError: (e: Error) =>
      toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  // Delete model entry
  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("price_monitoring").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["price-monitoring"] });
      toast({ title: "Модель удалена" });
      setDeleteTarget(null);
    },
    onError: (e: Error) =>
      toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  // Import file handler
  const IMPORT_COL_MAP: Record<string, "model" | "memory" | "our_price"> = {
    "модель": "model", "model": "model", "название": "model", "name": "model", "устройство": "model", "device": "model",
    "память": "memory", "memory": "memory", "storage": "memory", "gb": "memory", "объём": "memory",
    "цена": "our_price", "price": "our_price", "наша цена": "our_price", "our_price": "our_price", "стоимость": "our_price", "цена продажи": "our_price",
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        if (!json.length) { toast({ title: "Файл пуст", variant: "destructive" }); return; }

        const headerMap = new Map<string, "model" | "memory" | "our_price">();
        for (const h of Object.keys(json[0])) {
          const key = h.toLowerCase().trim();
          if (IMPORT_COL_MAP[key]) headerMap.set(h, IMPORT_COL_MAP[key]);
        }
        if (!headerMap.has([...headerMap.entries()].find(([, v]) => v === "model")?.[0] || "")) {
          toast({ title: "Не найден столбец «Модель»", description: "Файл должен содержать столбец: Модель, Model или Название", variant: "destructive" });
          return;
        }

        const parsed: ImportRow[] = [];
        for (const row of json) {
          const item: Partial<ImportRow> = {};
          for (const [rawH, field] of headerMap) {
            const val = String(row[rawH] ?? "").trim();
            if (!val) continue;
            if (field === "our_price") {
              const num = parseFloat(val.replace(/[^\d.,]/g, "").replace(",", "."));
              if (!isNaN(num) && num > 0) item.our_price = num;
            } else {
              (item as any)[field] = val;
            }
          }
          if (item.model) {
            parsed.push({ model: item.model, memory: item.memory || "", our_price: item.our_price });
          }
        }
        if (!parsed.length) { toast({ title: "Нет валидных строк", variant: "destructive" }); return; }
        setImportRows(parsed);
        setImportOpen(true);
      } catch {
        toast({ title: "Ошибка чтения файла", variant: "destructive" });
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  const importModels = useMutation({
    mutationFn: async () => {
      if (!companyId || !importRows.length) throw new Error("Нет данных");
      const toUpsert = importRows.map((r) => {
        const modelName = r.memory ? `${r.model} ${r.memory}` : r.model;
        return {
          company_id: companyId,
          model: modelName,
          our_price: r.our_price ?? null,
          prices: [] as number[],
          avg_price: null as number | null,
        };
      });
      // Upsert: for each row, check if exists and update or insert
      for (const item of toUpsert) {
        const existing = monitoringMap[item.model];
        if (existing) {
          const upd: any = {};
          if (item.our_price) upd.our_price = item.our_price;
          if (Object.keys(upd).length) {
            await supabase.from("price_monitoring").update(upd).eq("id", existing.id);
          }
        } else {
          const { error } = await supabase.from("price_monitoring").insert(item);
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["price-monitoring"] });
      toast({ title: `Импортировано ${importRows.length} моделей` });
      setImportOpen(false);
      setImportRows([]);
      setImportFileName("");
    },
    onError: (e: Error) =>
      toast({ title: "Ошибка импорта", description: e.message, variant: "destructive" }),
  });

  // Group rows by model name
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Мониторинг цен</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-1" /> Импорт
          </Button>
          <input ref={fileInputRef} type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={handleImportFile} />
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Добавить модель
          </Button>
        </div>
      </div>

      <SectionHelp tips={SECTION_TIPS.monitoring} />

      <p className="text-sm text-muted-foreground">
        Нажмите на модель, чтобы ввести 10 цен с Avito и рассчитать среднюю рыночную цену.
      </p>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Поиск модели..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card className="card-shadow overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Загрузка...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Модель</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Память</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Средняя цена</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Рекомендация (95%)</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Наша цена</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground"></th>
                </tr>
              </thead>
              <tbody>
                {groupedRows.map((group) =>
                  group.rows.map((row, i) => {
                    const key = `${row.model} ${row.memory}`;
                    const entry = monitoringMap[key];
                    const avgPrice = entry?.avg_price || 0;
                    const recPrice = avgPrice > 0 ? Math.round(avgPrice * 0.95) : 0;
                    const ourP = entry?.our_price || 0;
                    const hasData = !!entry && avgPrice > 0;

                    return (
                      <tr
                        key={key}
                        className="border-b hover:bg-muted/30 transition-colors cursor-pointer group"
                        onClick={() => openDialog(row)}
                      >
                        <td className="px-4 py-2.5 font-medium">
                          {i === 0 ? (
                            <span className="flex items-center gap-1">
                              {row.model}
                              {row.isCustom && (
                                <span className="text-[10px] text-muted-foreground bg-muted rounded px-1">свой</span>
                              )}
                            </span>
                          ) : ""}
                        </td>
                        <td className="px-4 py-2.5">{row.memory}</td>
                        <td className="px-4 py-2.5 text-right font-mono">
                          {hasData ? (
                            <span className="font-semibold">{avgPrice.toLocaleString("ru")} ₽</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono">
                          {recPrice > 0 ? (
                            <span className="text-primary font-semibold">{recPrice.toLocaleString("ru")} ₽</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono">
                          {ourP > 0 ? (
                            <span>{ourP.toLocaleString("ru")} ₽</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {!hasData ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-medium text-warning">
                                Нет данных
                              </span>
                            ) : (
                              <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                            {entry && (
                              <button
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteTarget({ key, id: entry.id });
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Price entry dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selected ? `${selected.model} ${selected.memory}` : "Модель"}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              upsertEntry.mutate();
            }}
            className="space-y-4"
          >
            <div>
              <Label className="mb-2 block">Цены с Avito (10 позиций)</Label>
              <div className="grid grid-cols-5 gap-2">
                {priceSlots.map((val, i) => (
                  <div key={i} className="relative">
                    <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-muted-foreground">
                      {i + 1}
                    </span>
                    <Input
                      type="number"
                      className="pl-6 text-xs h-9 font-mono"
                      placeholder="—"
                      value={val}
                      onChange={(e) => {
                        const next = [...priceSlots];
                        next[i] = e.target.value;
                        setPriceSlots(next);
                      }}
                    />
                  </div>
                ))}
              </div>
              {priceSlots.some((v) => v && Number(v) > 0) && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Средняя:{" "}
                  <span className="font-semibold text-foreground">
                    {Math.round(
                      priceSlots
                        .map(Number)
                        .filter((n) => !isNaN(n) && n > 0)
                        .reduce((a, b, _, arr) => a + b / arr.length, 0)
                    ).toLocaleString("ru")}{" "}
                    ₽
                  </span>
                </p>
              )}
            </div>
            <div>
              <Label>Наша цена</Label>
              <Input
                type="number"
                placeholder="55000"
                value={ourPrice}
                onChange={(e) => setOurPrice(e.target.value)}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={upsertEntry.isPending || (priceSlots.every((v) => !v) && !ourPrice)}
            >
              {upsertEntry.isPending ? "Сохранение..." : "Сохранить цену"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add model dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить модель</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addModel.mutate();
            }}
            className="space-y-4"
          >
            <div>
              <Label>Название модели</Label>
              <Input
                placeholder="Samsung Galaxy S24"
                value={newModel}
                onChange={(e) => setNewModel(e.target.value)}
              />
            </div>
            <div>
              <Label>Память</Label>
              <Input
                placeholder="256GB"
                value={newMemory}
                onChange={(e) => setNewMemory(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={addModel.isPending || !newModel.trim() || !newMemory.trim()}>
              {addModel.isPending ? "Добавление..." : "Добавить"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить данные мониторинга?</AlertDialogTitle>
            <AlertDialogDescription>
              Данные цен для «{deleteTarget?.key}» будут удалены. Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget?.id && deleteEntry.mutate(deleteTarget.id)}
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import preview dialog */}
      <Dialog open={importOpen} onOpenChange={(o) => { if (!o) { setImportOpen(false); setImportRows([]); } }}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Импорт из {importFileName}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Найдено {importRows.length} моделей. Проверьте данные перед импортом.
          </p>
          <div className="overflow-auto flex-1 border rounded-md">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 sticky top-0">
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">#</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Модель</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Память</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">Цена</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {importRows.map((r, i) => (
                  <tr key={i} className="border-b">
                    <td className="px-3 py-1.5 text-muted-foreground">{i + 1}</td>
                    <td className="px-3 py-1.5">{r.model}</td>
                    <td className="px-3 py-1.5">{r.memory || "—"}</td>
                    <td className="px-3 py-1.5 text-right font-mono">{r.our_price ? `${r.our_price.toLocaleString("ru")} ₽` : "—"}</td>
                    <td className="px-3 py-1.5">
                      <button
                        className="p-0.5 rounded hover:bg-destructive/10"
                        onClick={() => setImportRows((prev) => prev.filter((_, j) => j !== i))}
                      >
                        <X className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => { setImportOpen(false); setImportRows([]); }}>
              Отмена
            </Button>
            <Button className="flex-1" disabled={importModels.isPending || !importRows.length} onClick={() => importModels.mutate()}>
              {importModels.isPending ? "Импорт..." : `Импортировать (${importRows.length})`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MonitoringPage;
