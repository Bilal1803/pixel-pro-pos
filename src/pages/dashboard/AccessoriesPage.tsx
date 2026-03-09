import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";

const accessories = [
  { id: 1, name: "Чехол iPhone 14 Pro силиконовый", category: "Чехлы", price: "1 200 ₽", cost: "400 ₽", stock: 24 },
  { id: 2, name: "Защитное стекло iPhone 14 Pro", category: "Стёкла", price: "800 ₽", cost: "150 ₽", stock: 45 },
  { id: 3, name: "Чехол Samsung S24 прозрачный", category: "Чехлы", price: "900 ₽", cost: "300 ₽", stock: 18 },
  { id: 4, name: "Кабель USB-C Lightning 1м", category: "Кабели", price: "600 ₽", cost: "180 ₽", stock: 32 },
  { id: 5, name: "Зарядное устройство 20W USB-C", category: "Зарядки", price: "1 500 ₽", cost: "500 ₽", stock: 15 },
  { id: 6, name: "Защитное стекло Samsung S24", category: "Стёкла", price: "700 ₽", cost: "120 ₽", stock: 38 },
  { id: 7, name: "AirPods Pro 2 (копия)", category: "Наушники", price: "2 500 ₽", cost: "800 ₽", stock: 8 },
  { id: 8, name: "Чехол iPhone 15 MagSafe", category: "Чехлы", price: "1 800 ₽", cost: "600 ₽", stock: 12 },
];

const AccessoriesPage = () => {
  const [search, setSearch] = useState("");
  const filtered = accessories.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase()) || a.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Аксессуары</h1>
        <Button><Plus className="mr-2 h-4 w-4" /> Добавить товар</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Поиск по названию или категории..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card className="card-shadow overflow-hidden">
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
              {filtered.map((a) => (
                <tr key={a.id} className="hover:bg-muted/30 transition-colors cursor-pointer">
                  <td className="px-4 py-3 font-medium">{a.name}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">{a.category}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{a.cost}</td>
                  <td className="px-4 py-3 font-semibold">{a.price}</td>
                  <td className="px-4 py-3">
                    <span className={a.stock < 10 ? "text-destructive font-medium" : ""}>{a.stock} шт.</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default AccessoriesPage;
