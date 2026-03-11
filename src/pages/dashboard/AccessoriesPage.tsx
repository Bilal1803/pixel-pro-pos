import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SectionHelp from "@/components/SectionHelp";
import { SECTION_TIPS } from "@/data/sectionTips";

const CATEGORIES = [
  "Чехлы", "Защитные стёкла", "Кабели", "Зарядные устройства", "Наушники",
  "Держатели", "Плёнки", "Аккумуляторы", "Адаптеры", "Прочее",
];

/* ── Inline editable cell ── */
const InlineEdit = ({ value, suffix = "", onSave, type = "text" }: { value: string | number | null; suffix?: string; onSave: (v: string) => void; type?: string }) => {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(value ?? ""));
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);

  const commit = () => {
    setEditing(false);
    if (val !== String(value ?? "")) onSave(val);
  };

  if (!editing) {
    return (
      <span
        className="cursor-pointer rounded px-1 -mx-1 hover:bg-muted transition-colors"
        onClick={() => { setVal(String(value ?? "")); setEditing(true); }}
      >
        {value != null && value !== "" ? `${value} ${suffix}`.trim() : "—"}
      </span>
    );
  }

  return (
    <Input
      ref={ref}
      type={type}
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
      className="h-7 w-24 text-sm"
    />
  );
};

const AccessoriesPage = () => {
  const { companyId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", category: "", cost_price: "", sale_price: "", stock: "" });
  const [editForm, setEditForm] = useState<{ id: string; name: string; category: string; cost_price: string; sale_price: string; stock: string }>({ id: "", name: "", category: "", cost_price: "", sale_price: "", stock: "" });

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("products").select("*").eq("company_id", companyId).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const createProduct = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("No company");
      const { error } = await supabase.from("products").insert({
        company_id: companyId, name: form.name, category: form.category || null,
        cost_price: form.cost_price ? Number(form.cost_price) : null,
        sale_price: form.sale_price ? Number(form.sale_price) : null,
        stock: form.stock ? Number(form.stock) : 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Товар добавлен" });
      setCreateOpen(false);
      setForm({ name: "", category: "", cost_price: "", sale_price: "", stock: "" });
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const updateProduct = useMutation({
    mutationFn: async (payload: { id: string; data: Record<string, any> }) => {
      const { error } = await supabase.from("products").update(payload.data).eq("id", payload.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Товар успешно обновлён" });
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Товар удалён" });
      setDeleteId(null);
    },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const openEdit = (p: any) => {
    setEditForm({
      id: p.id, name: p.name, category: p.category || "",
      cost_price: p.cost_price?.toString() || "", sale_price: p.sale_price?.toString() || "",
      stock: p.stock?.toString() || "0",
    });
    setEditOpen(true);
  };

  const saveEdit = () => {
    updateProduct.mutate({
      id: editForm.id,
      data: {
        name: editForm.name, category: editForm.category || null,
        cost_price: editForm.cost_price ? Number(editForm.cost_price) : null,
        sale_price: editForm.sale_price ? Number(editForm.sale_price) : null,
        stock: editForm.stock ? Number(editForm.stock) : 0,
      },
    });
    setEditOpen(false);
  };

  const inlineSave = (id: string, field: string, value: string) => {
    const numVal = value === "" ? null : Number(value);
    updateProduct.mutate({ id, data: { [field]: field === "stock" ? (numVal ?? 0) : numVal } });
  };

  const filtered = products.filter((a: any) =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    (a.category || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Аксессуары</h1>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Добавить товар</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Новый товар</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createProduct.mutate(); }} className="space-y-3">
              <div><Label>Название *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
              <div>
                <Label>Категория</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue placeholder="Выберите категорию" /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
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

      <SectionHelp tips={SECTION_TIPS.accessories} />

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
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((a: any) => (
                  <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{a.name}</td>
                    <td className="px-4 py-3">
                      {a.category && <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">{a.category}</span>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <InlineEdit value={a.cost_price} suffix="₽" type="number" onSave={(v) => inlineSave(a.id, "cost_price", v)} />
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      <InlineEdit value={a.sale_price} suffix="₽" type="number" onSave={(v) => inlineSave(a.id, "sale_price", v)} />
                    </td>
                    <td className="px-4 py-3">
                      <InlineEdit
                        value={a.stock ?? 0} suffix="шт." type="number"
                        onSave={(v) => inlineSave(a.id, "stock", v)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(a)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(a.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Редактировать товар</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Название *</Label><Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></div>
            <div>
              <Label>Категория</Label>
              <Select value={editForm.category} onValueChange={(v) => setEditForm({ ...editForm, category: v })}>
                <SelectTrigger><SelectValue placeholder="Выберите категорию" /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Себестоимость</Label><Input type="number" value={editForm.cost_price} onChange={(e) => setEditForm({ ...editForm, cost_price: e.target.value })} /></div>
              <div><Label>Цена продажи</Label><Input type="number" value={editForm.sale_price} onChange={(e) => setEditForm({ ...editForm, sale_price: e.target.value })} /></div>
            </div>
            <div><Label>Остаток (шт.)</Label><Input type="number" value={editForm.stock} onChange={(e) => setEditForm({ ...editForm, stock: e.target.value })} /></div>
            <Button className="w-full" disabled={!editForm.name} onClick={saveEdit}>Сохранить</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить товар?</AlertDialogTitle>
            <AlertDialogDescription>Вы уверены, что хотите удалить товар? Это действие нельзя отменить.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteProduct.mutate(deleteId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AccessoriesPage;
