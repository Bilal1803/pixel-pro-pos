import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const repairs = [
  { id: 1, device: "iPhone 13", client: "Иванов А.", issue: "Замена экрана", price: "8 500 ₽", status: "in_progress", date: "09.03.2026" },
  { id: 2, device: "Samsung S22", client: "Козлова М.", issue: "Замена батареи", price: "3 500 ₽", status: "ready", date: "08.03.2026" },
  { id: 3, device: "iPhone 14", client: "Сидоров В.", issue: "Замена заднего стекла", price: "6 000 ₽", status: "in_progress", date: "08.03.2026" },
  { id: 4, device: "Xiaomi 12", client: "Петров Б.", issue: "Не заряжается (разъём)", price: "2 500 ₽", status: "done", date: "07.03.2026" },
  { id: 5, device: "iPhone 11", client: "Морозов Е.", issue: "Замена камеры", price: "5 000 ₽", status: "waiting_parts", date: "06.03.2026" },
];

const statusLabels: Record<string, { label: string; className: string }> = {
  in_progress: { label: "В работе", className: "bg-primary/10 text-primary" },
  ready: { label: "Готов", className: "bg-success/10 text-success" },
  done: { label: "Выдан", className: "bg-muted text-muted-foreground" },
  waiting_parts: { label: "Ожидание запчастей", className: "bg-warning/10 text-warning" },
};

const RepairsPage = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Ремонт</h1>
        <Button><Plus className="mr-2 h-4 w-4" /> Новый заказ</Button>
      </div>

      <Card className="card-shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">№</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Устройство</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Клиент</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Проблема</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Цена</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Статус</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Дата</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {repairs.map((r) => (
                <tr key={r.id} className="hover:bg-muted/30 transition-colors cursor-pointer">
                  <td className="px-4 py-3 font-medium">{r.id}</td>
                  <td className="px-4 py-3">{r.device}</td>
                  <td className="px-4 py-3">{r.client}</td>
                  <td className="px-4 py-3">{r.issue}</td>
                  <td className="px-4 py-3 font-semibold">{r.price}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusLabels[r.status].className}`}>
                      {statusLabels[r.status].label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{r.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default RepairsPage;
