import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CATEGORIES = [
  "Чехлы",
  "Защитные стёкла",
  "Кабели",
  "Зарядные устройства",
  "Наушники",
  "Держатели",
  "Плёнки",
  "Аккумуляторы",
  "Адаптеры",
  "Прочее",
];

const AccessoriesPage = () => {
  const { companyId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", category: "", cost_price: "", sale_price: "", stock: "" });

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const createProduct = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("No company");
      const { error } = await supabase.from("products").insert({
        company_id: companyId,
        name: form.name,
        category: form.category || null,
        cost_price: form.cost_price ? Number(form.cost_price) : null,
        sale_price: form.sale_price ? Number(form.sale_price) : null,
        stock: form.stock ? Number(form.stock) : 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Товар добавлен" });
      setOpen(false);
      setForm({ name: "", category: "", cost_price: "", sale_price: "", stock: "" });
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const filtered = products.filter((a: any) =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    (a.category || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Аксессуары</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Добавить товар</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Новый товар</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createProduct.mutate(); }} className="space-y-3">
              <div><Label>Название *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
              <div><Label>Категория</Label><Input placeholder="Чехлы, Стёкла, Кабели..." value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Себестоимость</Label><Input type="number" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: e.target.value })} /></div>
                <div><Label>Цена продажи</Label><Input type="number" value={form.sale_price} onChange={(e) => setForm({ ...form, sale_price: e.target.value })} /></div>
              </div>
              <div><Label>Остаток (шт.)</Label><Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></div>
              <Button type="submit" className="w-full" disabled={createProduct.isPending || !form.name}>
                {createProduct.isPending ? "Добавление..." : "Добавить"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Поиск по названию или категории..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card className="card-shadow overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Загрузка...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            {search ? "Ничего не найдено" : "Нет товаров. Добавьте первый аксессуар."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Название</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Категория</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Себестоимость</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Цена</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Остаток</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((a: any) => (
                  <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{a.name}</td>
                    <td className="px-4 py-3">
                      {a.category && <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">{a.category}</span>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{a.cost_price ? `${a.cost_price} ₽` : "—"}</td>
                    <td className="px-4 py-3 font-semibold">{a.sale_price ? `${a.sale_price} ₽` : "—"}</td>
                    <td className="px-4 py-3">
                      <span className={(a.stock || 0) < 10 ? "text-destructive font-medium" : ""}>{a.stock || 0} шт.</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default AccessoriesPage;
