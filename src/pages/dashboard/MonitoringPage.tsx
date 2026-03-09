import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, TrendingUp, TrendingDown, Minus, Trash2, Search, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const IPHONE_CATALOG: { name: string; memories: string[] }[] = [
  { name: "iPhone X", memories: ["64GB", "256GB"] },
  { name: "iPhone XR", memories: ["64GB", "128GB", "256GB"] },
  { name: "iPhone XS", memories: ["64GB", "256GB", "512GB"] },
  { name: "iPhone XS Max", memories: ["64GB", "256GB", "512GB"] },
  { name: "iPhone 11", memories: ["64GB", "128GB", "256GB"] },
  { name: "iPhone 11 Pro", memories: ["64GB", "256GB", "512GB"] },
  { name: "iPhone 11 Pro Max", memories: ["64GB", "256GB", "512GB"] },
  { name: "iPhone SE (2020)", memories: ["64GB", "128GB", "256GB"] },
  { name: "iPhone 12 mini", memories: ["64GB", "128GB", "256GB"] },
  { name: "iPhone 12", memories: ["64GB", "128GB", "256GB"] },
  { name: "iPhone 12 Pro", memories: ["128GB", "256GB", "512GB"] },
  { name: "iPhone 12 Pro Max", memories: ["128GB", "256GB", "512GB"] },
  { name: "iPhone 13 mini", memories: ["128GB", "256GB", "512GB"] },
  { name: "iPhone 13", memories: ["128GB", "256GB", "512GB"] },
  { name: "iPhone 13 Pro", memories: ["128GB", "256GB", "512GB", "1TB"] },
  { name: "iPhone 13 Pro Max", memories: ["128GB", "256GB", "512GB", "1TB"] },
  { name: "iPhone SE (2022)", memories: ["64GB", "128GB", "256GB"] },
  { name: "iPhone 14", memories: ["128GB", "256GB", "512GB"] },
  { name: "iPhone 14 Plus", memories: ["128GB", "256GB", "512GB"] },
  { name: "iPhone 14 Pro", memories: ["128GB", "256GB", "512GB", "1TB"] },
  { name: "iPhone 14 Pro Max", memories: ["128GB", "256GB", "512GB", "1TB"] },
  { name: "iPhone 15", memories: ["128GB", "256GB", "512GB"] },
  { name: "iPhone 15 Plus", memories: ["128GB", "256GB", "512GB"] },
  { name: "iPhone 15 Pro", memories: ["128GB", "256GB", "512GB", "1TB"] },
  { name: "iPhone 15 Pro Max", memories: ["256GB", "512GB", "1TB"] },
  { name: "iPhone 16", memories: ["128GB", "256GB", "512GB"] },
  { name: "iPhone 16 Plus", memories: ["128GB", "256GB", "512GB"] },
  { name: "iPhone 16 Pro", memories: ["128GB", "256GB", "512GB", "1TB"] },
  { name: "iPhone 16 Pro Max", memories: ["256GB", "512GB", "1TB"] },
  { name: "iPhone 16e", memories: ["128GB", "256GB", "512GB"] },
  { name: "iPhone 17", memories: ["128GB", "256GB", "512GB"] },
  { name: "iPhone 17 Air", memories: ["256GB", "512GB"] },
  { name: "iPhone 17 Pro", memories: ["256GB", "512GB", "1TB"] },
  { name: "iPhone 17 Pro Max", memories: ["256GB", "512GB", "1TB"] },
];

const MonitoringPage = () => {
  const { companyId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedModel, setSelectedModel] = useState<{ name: string; memory: string } | null>(null);
  const [priceDialogOpen, setPriceDialogOpen] = useState(false);
  const [ourPrice, setOurPrice] = useState("");
  const [priceSlots, setPriceSlots] = useState<string[]>(Array(10).fill(""));

  const filteredCatalog = useMemo(() => {
    if (!search.trim()) return IPHONE_CATALOG;
    const q = search.toLowerCase();
    return IPHONE_CATALOG.filter(m => m.name.toLowerCase().includes(q));
  }, [search]);

  const { data: monitoring = [], isLoading } = useQuery({
    queryKey: ["price-monitoring", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("price_monitoring")
        .select("*")
        .eq("company_id", companyId)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const createEntry = useMutation({
    mutationFn: async () => {
      if (!companyId || !selectedModel) throw new Error("No company or model");
      const modelName = `${selectedModel.name} ${selectedModel.memory}`;
      const pricesArr = priceSlots.map(Number).filter(n => !isNaN(n) && n > 0);
      const avg = pricesArr.length > 0 ? Math.round(pricesArr.reduce((a, b) => a + b, 0) / pricesArr.length) : null;
      const { error } = await supabase.from("price_monitoring").insert({
        company_id: companyId,
        model: modelName,
        our_price: ourPrice ? Number(ourPrice) : null,
        prices: pricesArr,
        avg_price: avg,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["price-monitoring"] });
      toast({ title: "Модель добавлена" });
      setPriceDialogOpen(false);
      setSheetOpen(false);
      setSelectedModel(null);
      setOurPrice("");
      setPriceSlots(Array(10).fill(""));
      setSearch("");
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("price_monitoring").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["price-monitoring"] });
      toast({ title: "Удалено" });
    },
  });

  const handleSelectMemory = (modelName: string, memory: string) => {
    setSelectedModel({ name: modelName, memory });
    setPriceDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Мониторинг цен</h1>
        <Sheet open={sheetOpen} onOpenChange={(v) => { setSheetOpen(v); if (!v) { setSearch(""); } }}>
          <SheetTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Добавить модель</Button>
          </SheetTrigger>
          <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
            <SheetHeader className="p-6 pb-2">
              <SheetTitle>Выберите модель iPhone</SheetTitle>
            </SheetHeader>
            <div className="px-6 pb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск модели..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <ScrollArea className="flex-1 px-6 pb-6">
              <div className="space-y-1">
                {filteredCatalog.map((model) => (
                  <div key={model.name}>
                    <p className="text-sm font-semibold text-foreground py-2 sticky top-0 bg-background">{model.name}</p>
                    <div className="grid grid-cols-2 gap-1.5 pb-2">
                      {model.memories.map((mem) => (
                        <Button
                          key={mem}
                          variant="outline"
                          size="sm"
                          className="justify-between text-xs h-8"
                          onClick={() => handleSelectMemory(model.name, mem)}
                        >
                          {mem}
                          <ChevronRight className="h-3 w-3 text-muted-foreground" />
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
                {filteredCatalog.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">Ничего не найдено</p>
                )}
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </div>

      {/* Price entry dialog */}
      <Dialog open={priceDialogOpen} onOpenChange={setPriceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedModel ? `${selectedModel.name} ${selectedModel.memory}` : "Модель"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createEntry.mutate(); }} className="space-y-4">
            <div>
              <Label>Наша цена</Label>
              <Input type="number" placeholder="55000" value={ourPrice} onChange={(e) => setOurPrice(e.target.value)} />
            </div>
            <div>
              <Label className="mb-2 block">Цены с Avito (10 позиций)</Label>
              <div className="grid grid-cols-5 gap-2">
                {priceSlots.map((val, i) => (
                  <div key={i} className="relative">
                    <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-muted-foreground">{i + 1}</span>
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
            </div>
            <Button type="submit" className="w-full" disabled={createEntry.isPending || priceSlots.every(v => !v)}>
              {createEntry.isPending ? "Добавление..." : "Добавить"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <p className="text-sm text-muted-foreground">
        Выберите модель iPhone из каталога, введите цены с Avito — система рассчитает среднюю рыночную цену и рекомендацию.
      </p>

      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground">Загрузка...</div>
      ) : monitoring.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">Нет моделей для мониторинга</div>
      ) : (
        <div className="grid gap-4">
          {monitoring.map((m: any) => {
            const prices: number[] = m.prices || [];
            const avgPrice = m.avg_price || 0;
            const ourPrice = m.our_price || 0;
            const diff = ourPrice - avgPrice;
            const diffPercent = avgPrice > 0 ? ((diff / avgPrice) * 100).toFixed(1) : "0";
            const recommended = avgPrice > 0 ? Math.round(avgPrice * 0.95) : 0;

            return (
              <Card key={m.id} className="p-5 card-shadow">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{m.model}</h3>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteEntry.mutate(m.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </div>
                    {prices.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {prices.map((p: number, i: number) => (
                          <span key={i} className="rounded bg-muted px-2 py-0.5 text-xs font-mono">
                            {p.toLocaleString("ru")}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-6 text-sm sm:text-right">
                    <div>
                      <p className="text-muted-foreground">Средняя</p>
                      <p className="text-lg font-bold">{avgPrice > 0 ? `${avgPrice.toLocaleString("ru")} ₽` : "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Наша цена</p>
                      <p className="text-lg font-bold">{ourPrice > 0 ? `${ourPrice.toLocaleString("ru")} ₽` : "—"}</p>
                    </div>
                    {avgPrice > 0 && ourPrice > 0 && (
                      <div>
                        <p className="text-muted-foreground">Разница</p>
                        <p className={`text-lg font-bold flex items-center gap-1 ${diff > 0 ? "text-destructive" : diff < 0 ? "text-success" : ""}`}>
                          {diff > 0 ? <TrendingUp className="h-4 w-4" /> : diff < 0 ? <TrendingDown className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                          {diffPercent}%
                        </p>
                      </div>
                    )}
                    {avgPrice > 0 && (
                      <div>
                        <p className="text-muted-foreground">Рекомендация</p>
                        <p className="text-lg font-bold text-primary">{recommended.toLocaleString("ru")} ₽</p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MonitoringPage;
