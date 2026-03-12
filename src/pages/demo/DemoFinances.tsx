import { useDemo } from "@/contexts/DemoContext";
import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, TrendingUp, TrendingDown, Wallet } from "lucide-react";

const DemoFinances = () => {
  const { sales, expenses, stats } = useDemo();

  const totalRevenue = sales.reduce((s, v) => s + v.total, 0);
  const totalProfit = sales.reduce((s, v) => s + v.profit, 0);
  const totalExpenses = expenses.reduce((s, v) => s + v.amount, 0);

  const kpis = [
    { label: "Общая выручка", value: `${totalRevenue.toLocaleString("ru")} ₽`, icon: DollarSign, color: "text-green-600" },
    { label: "Прибыль", value: `${totalProfit.toLocaleString("ru")} ₽`, icon: TrendingUp, color: "text-primary" },
    { label: "Расходы", value: `${totalExpenses.toLocaleString("ru")} ₽`, icon: TrendingDown, color: "text-destructive" },
    { label: "Касса", value: `${stats.currentCash.toLocaleString("ru")} ₽`, icon: Wallet, color: "text-blue-600" },
  ];

  const byCategory = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Финансы</h1>

      <div className="grid gap-3 grid-cols-2">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <k.icon className={`h-5 w-5 ${k.color}`} />
                <div>
                  <p className="text-[10px] text-muted-foreground">{k.label}</p>
                  <p className={`text-base font-bold ${k.color}`}>{k.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-4">
          <p className="text-sm font-semibold mb-3">Расходы по категориям</p>
          <div className="space-y-2">
            {Object.entries(byCategory).map(([cat, amount]) => (
              <div key={cat} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                <span className="text-foreground">{cat}</span>
                <span className="font-medium text-foreground">{amount.toLocaleString("ru")} ₽</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <p className="text-sm font-semibold mb-3">Последние расходы</p>
          <div className="space-y-2">
            {expenses.map((e) => (
              <div key={e.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                <div>
                  <p className="font-medium text-foreground">{e.description}</p>
                  <p className="text-xs text-muted-foreground">{e.category}</p>
                </div>
                <span className="text-destructive font-medium">-{e.amount.toLocaleString("ru")} ₽</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DemoFinances;
