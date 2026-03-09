import { Card } from "@/components/ui/card";
import { DollarSign, TrendingDown, TrendingUp, Percent } from "lucide-react";

const stats = [
  { label: "Выручка за месяц", value: "1 245 000 ₽", icon: DollarSign },
  { label: "Закупки", value: "892 000 ₽", icon: TrendingDown },
  { label: "Расходы", value: "68 000 ₽", icon: TrendingDown },
  { label: "Чистая прибыль", value: "285 000 ₽", icon: TrendingUp },
];

const expenses = [
  { id: 1, category: "Аренда", amount: "35 000 ₽", date: "01.03.2026" },
  { id: 2, category: "Зарплата", amount: "120 000 ₽", date: "05.03.2026" },
  { id: 3, category: "Реклама", amount: "15 000 ₽", date: "07.03.2026" },
  { id: 4, category: "Доставка", amount: "8 000 ₽", date: "08.03.2026" },
];

const FinancesPage = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Финансы</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-5 card-shadow">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{s.label}</span>
              <s.icon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="mt-2 text-2xl font-bold">{s.value}</div>
          </Card>
        ))}
      </div>

      <Card className="card-shadow">
        <div className="border-b p-4">
          <h3 className="font-semibold">Расходы</h3>
        </div>
        <div className="divide-y">
          {expenses.map((e) => (
            <div key={e.id} className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm font-medium">{e.category}</p>
                <p className="text-xs text-muted-foreground">{e.date}</p>
              </div>
              <span className="text-sm font-semibold">{e.amount}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default FinancesPage;
