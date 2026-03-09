import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";

const devices = [
  { id: 1, model: "iPhone 14 Pro", memory: "128GB", color: "Чёрный", imei: "354678901234561", battery: "94%", purchasePrice: "42 000", salePrice: "52 000", status: "available" },
  { id: 2, model: "iPhone 13", memory: "128GB", color: "Белый", imei: "354678901234562", battery: "87%", purchasePrice: "25 000", salePrice: "32 000", status: "available" },
  { id: 3, model: "Samsung S24", memory: "256GB", color: "Фиолетовый", imei: "354678901234563", battery: "100%", purchasePrice: "48 000", salePrice: "—", status: "testing" },
  { id: 4, model: "Samsung S23", memory: "128GB", color: "Зелёный", imei: "354678901234564", battery: "91%", purchasePrice: "30 000", salePrice: "38 000", status: "reserved" },
  { id: 5, model: "Xiaomi 13T", memory: "256GB", color: "Чёрный", imei: "354678901234565", battery: "96%", purchasePrice: "18 000", salePrice: "22 500", status: "available" },
  { id: 6, model: "Pixel 8", memory: "128GB", color: "Голубой", imei: "354678901234566", battery: "99%", purchasePrice: "28 000", salePrice: "35 000", status: "available" },
  { id: 7, model: "iPhone 15", memory: "256GB", color: "Розовый", imei: "354678901234567", battery: "100%", purchasePrice: "55 000", salePrice: "64 000", status: "sold" },
  { id: 8, model: "iPhone 12", memory: "64GB", color: "Красный", imei: "354678901234568", battery: "78%", purchasePrice: "15 000", salePrice: "—", status: "defective" },
];

const statusLabels: Record<string, { label: string; className: string }> = {
  available: { label: "В наличии", className: "bg-success/10 text-success" },
  testing: { label: "Проверка", className: "bg-warning/10 text-warning" },
  reserved: { label: "Резерв", className: "bg-primary/10 text-primary" },
  sold: { label: "Продано", className: "bg-muted text-muted-foreground" },
  defective: { label: "Дефект", className: "bg-destructive/10 text-destructive" },
};

const InventoryPage = () => {
  const [search, setSearch] = useState("");
  const filtered = devices.filter(
    (d) =>
      d.model.toLowerCase().includes(search.toLowerCase()) ||
      d.imei.includes(search)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Склад устройств</h1>
        <Button><Plus className="mr-2 h-4 w-4" /> Добавить устройство</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Поиск по модели или IMEI..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card className="card-shadow overflow-hidden">
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
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((d) => (
                <tr key={d.id} className="hover:bg-muted/30 transition-colors cursor-pointer">
                  <td className="px-4 py-3 font-medium">{d.model}</td>
                  <td className="px-4 py-3">{d.memory}</td>
                  <td className="px-4 py-3">{d.color}</td>
                  <td className="px-4 py-3 font-mono text-xs">{d.imei}</td>
                  <td className="px-4 py-3">{d.battery}</td>
                  <td className="px-4 py-3">{d.purchasePrice} ₽</td>
                  <td className="px-4 py-3">{d.salePrice}{d.salePrice !== "—" ? " ₽" : ""}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusLabels[d.status].className}`}>
                      {statusLabels[d.status].label}
                    </span>
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

export default InventoryPage;
