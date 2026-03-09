import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const sales = [
  { id: 1, items: "iPhone 14 Pro 128GB", total: "52 000 ₽", payment: "Наличные", customer: "Иванов А.", employee: "Алексей", date: "09.03.2026, 14:23" },
  { id: 2, items: "Samsung S23 256GB + чехол", total: "40 500 ₽", payment: "Карта", customer: "Петров Б.", employee: "Мария", date: "09.03.2026, 12:05" },
  { id: 3, items: "iPhone 13 128GB", total: "32 000 ₽", payment: "Перевод", customer: "Сидорова В.", employee: "Алексей", date: "09.03.2026, 10:41" },
  { id: 4, items: "Xiaomi 13T 256GB + стекло + чехол", total: "24 200 ₽", payment: "Смешанная", customer: "Козлов Д.", employee: "Мария", date: "08.03.2026, 18:30" },
  { id: 5, items: "iPhone 15 256GB", total: "64 000 ₽", payment: "Рассрочка", customer: "Морозов Е.", employee: "Алексей", date: "08.03.2026, 16:12" },
];

const SalesPage = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Продажи</h1>
        <Button><Plus className="mr-2 h-4 w-4" /> Новая продажа</Button>
      </div>

      <Card className="card-shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">№</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Товары</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Сумма</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Оплата</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Клиент</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Сотрудник</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Дата</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sales.map((s) => (
                <tr key={s.id} className="hover:bg-muted/30 transition-colors cursor-pointer">
                  <td className="px-4 py-3 font-medium">{s.id}</td>
                  <td className="px-4 py-3">{s.items}</td>
                  <td className="px-4 py-3 font-semibold">{s.total}</td>
                  <td className="px-4 py-3">{s.payment}</td>
                  <td className="px-4 py-3">{s.customer}</td>
                  <td className="px-4 py-3">{s.employee}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default SalesPage;
