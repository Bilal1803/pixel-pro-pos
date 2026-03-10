import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ExternalLink, AlertCircle, Plus, Trash2, Search, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { IPHONE_CATALOG } from "@/data/deviceCatalog";
import SectionHelp from "@/components/SectionHelp";
import { SECTION_TIPS } from "@/data/sectionTips";

const ListingsPage = () => {
  const { companyId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Selection state
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [selectedMemory, setSelectedMemory] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);

  // Dialog form state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [avitoUrl, setAvitoUrl] = useState("");
  const [deviceCount, setDeviceCount] = useState("");

  const filteredCatalog = useMemo(
    () => IPHONE_CATALOG.filter((m) => m.name.toLowerCase().includes(search.toLowerCase())),
    [search]
  );

  const currentModelData = useMemo(
    () => IPHONE_CATALOG.find((m) => m.name === selectedModel),
    [selectedModel]
  );

  const handleSelectModel = (name: string) => {
    setSelectedModel(name);
    setSelectedMemory(null);
    setSelectedColor(null);
  };

  const handleSelectMemory = (memory: string) => {
    setSelectedMemory(memory);
    setSelectedColor(null);
  };

  const handleSelectColor = (color: string) => {
    setSelectedColor(color);
    setSheetOpen(false);
    setDialogOpen(true);
  };

  const groupName = selectedModel && selectedMemory && selectedColor
    ? `${selectedModel} ${selectedMemory} ${selectedColor}`
    : "";

  const { data: listings = [], isLoading } = useQuery({
    queryKey: ["listings", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const createListing = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("No company");
      const { error } = await supabase.from("listings").insert({
        company_id: companyId,
        group_name: groupName,
        avito_url: avitoUrl || null,
        device_count: deviceCount ? Number(deviceCount) : 0,
        last_refreshed: avitoUrl ? new Date().toISOString() : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["listings"] });
      toast({ title: "Объявление добавлено" });
      resetForm();
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const resetForm = () => {
    setDialogOpen(false);
    setSelectedModel(null);
    setSelectedMemory(null);
    setSelectedColor(null);
    setAvitoUrl("");
    setDeviceCount("");
    setSearch("");
  };

  const refreshListing = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("listings").update({ last_refreshed: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["listings"] });
      toast({ title: "Дата обновления сброшена" });
    },
  });

  const deleteListing = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("listings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["listings"] });
      toast({ title: "Удалено" });
    },
  });

  const getDaysLeft = (lastRefreshed: string | null) => {
    if (!lastRefreshed) return null;
    const refreshed = new Date(lastRefreshed);
    const expiry = new Date(refreshed.getTime() + 30 * 24 * 60 * 60 * 1000);
    const now = new Date();
    return Math.max(0, Math.ceil((expiry.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Объявления</h1>
        <Sheet open={sheetOpen} onOpenChange={(v) => { setSheetOpen(v); if (!v) setSearch(""); }}>
          <SheetTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Добавить объявление</Button>
          </SheetTrigger>
          <SheetContent className="w-full sm:max-w-md">
            <SheetHeader>
              <SheetTitle>
                {!selectedModel ? "Выберите модель" : !selectedMemory ? `${selectedModel} — память` : `${selectedModel} ${selectedMemory} — цвет`}
              </SheetTitle>
            </SheetHeader>

            {/* Back button */}
            {selectedModel && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 mb-1"
                onClick={() => {
                  if (selectedMemory) {
                    setSelectedMemory(null);
                    setSelectedColor(null);
                  } else {
                    setSelectedModel(null);
                  }
                }}
              >
                ← Назад
              </Button>
            )}

            {/* Step 1: Model selection */}
            {!selectedModel && (
              <>
                <div className="relative mt-3 mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Поиск модели..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <ScrollArea className="h-[calc(100vh-200px)]">
                  <div className="space-y-1 pr-3">
                    {filteredCatalog.map((model) => (
                      <button
                        key={model.name}
                        className="w-full flex items-center justify-between rounded-md px-3 py-2.5 text-sm hover:bg-accent transition-colors text-left"
                        onClick={() => handleSelectModel(model.name)}
                      >
                        <span>{model.name}</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </>
            )}

            {/* Step 2: Memory selection */}
            {selectedModel && !selectedMemory && currentModelData && (
              <ScrollArea className="h-[calc(100vh-220px)] mt-3">
                <div className="space-y-1 pr-3">
                  {currentModelData.memories.map((mem) => (
                    <button
                      key={mem}
                      className="w-full flex items-center justify-between rounded-md px-3 py-2.5 text-sm hover:bg-accent transition-colors text-left"
                      onClick={() => handleSelectMemory(mem)}
                    >
                      <span>{mem}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}

            {/* Step 3: Color selection */}
            {selectedModel && selectedMemory && currentModelData && (
              <ScrollArea className="h-[calc(100vh-220px)] mt-3">
                <div className="space-y-1 pr-3">
                  {currentModelData.colors.map((color) => (
                    <button
                      key={color}
                      className="w-full flex items-center justify-between rounded-md px-3 py-2.5 text-sm hover:bg-accent transition-colors text-left"
                      onClick={() => handleSelectColor(color)}
                    >
                      <span>{color}</span>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
          </SheetContent>
        </Sheet>
      </div>

      {/* Dialog for URL + count after model/memory/color selected */}
      <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) resetForm(); else setDialogOpen(v); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Новое объявление</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createListing.mutate(); }} className="space-y-3">
            <div>
              <Label>Группа (модель)</Label>
              <Input value={groupName} readOnly className="bg-muted" />
            </div>
            <div>
              <Label>Ссылка Avito</Label>
              <Input placeholder="https://avito.ru/..." value={avitoUrl} onChange={(e) => setAvitoUrl(e.target.value)} />
            </div>
            <div>
              <Label>Кол-во устройств</Label>
              <Input type="number" value={deviceCount} onChange={(e) => setDeviceCount(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={createListing.isPending || !groupName}>
              {createListing.isPending ? "Добавление..." : "Добавить"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <p className="text-sm text-muted-foreground">
        Устройства группируются по модели, памяти и цвету. Привяжите ссылку на объявление Avito.
      </p>

      <Card className="card-shadow overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Загрузка...</div>
        ) : listings.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">Нет объявлений</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Группа</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Кол-во</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ссылка Avito</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Обновить через</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {listings.map((l: any) => {
                  const daysLeft = getDaysLeft(l.last_refreshed);
                  return (
                    <tr key={l.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">{l.group_name}</td>
                      <td className="px-4 py-3">{l.device_count || 0} шт.</td>
                      <td className="px-4 py-3">
                        {l.avito_url ? (
                          <a href={l.avito_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                            Открыть <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-muted-foreground">Не привязано</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {daysLeft !== null && daysLeft <= 3 && l.avito_url ? (
                          <span className="inline-flex items-center gap-1 text-destructive font-medium">
                            <AlertCircle className="h-3.5 w-3.5" /> {daysLeft} дн.
                          </span>
                        ) : daysLeft !== null && l.avito_url ? (
                          <span>{daysLeft} дн.</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {l.avito_url && (
                            <Button variant="ghost" size="sm" onClick={() => refreshListing.mutate(l.id)}>Обновить</Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteListing.mutate(l.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ListingsPage;
