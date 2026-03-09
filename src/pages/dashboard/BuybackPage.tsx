import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const buybacks = [
  { id: 1, model: "iPhone 13 128GB", color: "Белый", imei: "354678901234570", battery: "85%", price: "20 000 ₽", seller: "Иванов А.", status: "testing", date: "09.03.2026" },
  { id: 2, model: "Samsung S22 128GB", color: "Чёрный", imei: "354678901234571", battery: "91%", price: "15 000 ₽", seller: "Козлова М.", status: "available", date: "08.03.2026" },
  { id: 3, model: "iPhone 12 64GB", color: "Синий", imei: "354678901234572", battery: "78%", price: "12 000 ₽", seller: "Сидоров В.", status: "testing", date: "08.03.2026" },
];

const statusLabels: Record<string, { label: string; className: string }> = {
  testing: { label: "Проверка", className: "bg-warning/10 text-warning" },
  available: { label: "В наличии", className: "bg-success/10 text-success" },
};

const BuybackPage = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Скупка устройств</h1>
        <Button><Plus className="mr-2 h-4 w-4" /> Оформить скупку</Button>
      </div>

      <Card className="card-shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Модель</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Цвет</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">IMEI</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">АКБ</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Цена скупки</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Продавец</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Статус</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Дата</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {buybacks.map((b) => (
                <tr key={b.id} className="hover:bg-muted/30 transition-colors cursor-pointer">
                  <td className="px-4 py-3 font-medium">{b.model}</td>
                  <td className="px-4 py-3">{b.color}</td>
                  <td className="px-4 py-3 font-mono text-xs">{b.imei}</td>
                  <td className="px-4 py-3">{b.battery}</td>
                  <td className="px-4 py-3 font-semibold">{b.price}</td>
                  <td className="px-4 py-3">{b.seller}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusLabels[b.status].className}`}>
                      {statusLabels[b.status].label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{b.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default BuybackPage;
