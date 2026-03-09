import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, TrendingUp, TrendingDown, Minus } from "lucide-react";

const monitoring = [
  {
    id: 1, model: "iPhone 14 Pro 128GB", ourPrice: 52000, avgPrice: 50500,
    prices: [49000, 50000, 51000, 48000, 52000, 50000, 51500, 49500, 53000, 51000],
  },
  {
    id: 2, model: "iPhone 13 128GB", ourPrice: 32000, avgPrice: 30800,
    prices: [30000, 31000, 29000, 32000, 31500, 30000, 32000, 29500, 31000, 32000],
  },
  {
    id: 3, model: "Samsung S23 128GB", ourPrice: 38000, avgPrice: 36200,
    prices: [35000, 37000, 36000, 38000, 35500, 36000, 37000, 35000, 36500, 36000],
  },
  {
    id: 4, model: "Xiaomi 13T 256GB", ourPrice: 22500, avgPrice: 21900,
    prices: [21000, 22000, 21500, 23000, 22000, 21000, 22500, 21500, 22000, 22500],
  },
];

const MonitoringPage = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Мониторинг цен</h1>
        <Button><Plus className="mr-2 h-4 w-4" /> Добавить модель</Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Введите 10 цен с Avito — система рассчитает среднюю рыночную цену и рекомендованную цену продажи.
      </p>

      <div className="grid gap-4">
        {monitoring.map((m) => {
          const diff = m.ourPrice - m.avgPrice;
          const diffPercent = ((diff / m.avgPrice) * 100).toFixed(1);
          const recommended = Math.round(m.avgPrice * 0.95);

          return (
            <Card key={m.id} className="p-5 card-shadow">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{m.model}</h3>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {m.prices.map((p, i) => (
                      <span key={i} className="rounded bg-muted px-2 py-0.5 text-xs font-mono">
                        {p.toLocaleString("ru")}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-6 text-sm sm:text-right">
                  <div>
                    <p className="text-muted-foreground">Средняя</p>
                    <p className="text-lg font-bold">{m.avgPrice.toLocaleString("ru")} ₽</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Наша цена</p>
                    <p className="text-lg font-bold">{m.ourPrice.toLocaleString("ru")} ₽</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Разница</p>
                    <p className={`text-lg font-bold flex items-center gap-1 ${diff > 0 ? "text-destructive" : diff < 0 ? "text-success" : ""}`}>
                      {diff > 0 ? <TrendingUp className="h-4 w-4" /> : diff < 0 ? <TrendingDown className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                      {diffPercent}%
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Рекомендация</p>
                    <p className="text-lg font-bold text-primary">{recommended.toLocaleString("ru")} ₽</p>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default MonitoringPage;
