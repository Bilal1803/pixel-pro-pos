import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

const products = [
  { id: "a1", name: "Чехол iPhone 15 Pro Max силикон", category: "Чехлы", stock: 24, costPrice: 350, salePrice: 990 },
  { id: "a2", name: "Защитное стекло iPhone 15", category: "Стёкла", stock: 18, costPrice: 120, salePrice: 490 },
  { id: "a3", name: "Кабель USB-C Lightning 1m", category: "Кабели", stock: 32, costPrice: 180, salePrice: 590 },
  { id: "a4", name: "Чехол Samsung S24 Ultra прозрачный", category: "Чехлы", stock: 12, costPrice: 280, salePrice: 790 },
  { id: "a5", name: "Зарядное устройство 20W USB-C", category: "Зарядки", stock: 8, costPrice: 450, salePrice: 1290 },
  { id: "a6", name: "Наушники AirPods Pro 2 (копия)", category: "Наушники", stock: 5, costPrice: 800, salePrice: 2490 },
];

const DemoAccessories = () => {
  const [search, setSearch] = useState("");
  const handleAction = () => toast({ title: "Демо-режим", description: "В демо-режиме изменения не сохраняются" });

  const filtered = products.filter((p) => !search || `${p.name} ${p.category}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Аксессуары</h1>
        <button onClick={handleAction} className="text-sm text-primary font-medium hover:underline">+ Добавить</button>
      </div>
      <Input placeholder="Поиск по названию..." value={search} onChange={(e) => setSearch(e.target.value)} />
      <div className="space-y-2">
        {filtered.map((p) => (
          <Card key={p.id}>
            <CardContent className="p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{p.name}</p>
                <p className="text-xs text-muted-foreground">{p.category} · Остаток: {p.stock} шт</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-primary">{p.salePrice.toLocaleString("ru")} ₽</p>
                <p className="text-[10px] text-muted-foreground">Закупка: {p.costPrice.toLocaleString("ru")} ₽</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default DemoAccessories;
