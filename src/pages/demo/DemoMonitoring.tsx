import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

const models = [
  { model: "iPhone 15 Pro 256GB", ourPrice: 109990, avgPrice: 112500, trend: "down" },
  { model: "iPhone 14 128GB", ourPrice: 54990, avgPrice: 53200, trend: "up" },
  { model: "iPhone 13 128GB", ourPrice: 39990, avgPrice: 40500, trend: "stable" },
  { model: "Samsung S24 Ultra 512GB", ourPrice: 119990, avgPrice: 121000, trend: "down" },
  { model: "Samsung S23 256GB", ourPrice: 62990, avgPrice: 61500, trend: "up" },
  { model: "iPhone 15 128GB", ourPrice: 69990, avgPrice: 71200, trend: "down" },
  { model: "Xiaomi 14 Ultra 512GB", ourPrice: 79990, avgPrice: 78500, trend: "up" },
  { model: "Google Pixel 8 Pro 256GB", ourPrice: 59990, avgPrice: 62000, trend: "down" },
];

const TrendIcon = ({ trend }: { trend: string }) => {
  if (trend === "up") return <TrendingUp className="h-4 w-4 text-destructive" />;
  if (trend === "down") return <TrendingDown className="h-4 w-4 text-green-600" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
};

const DemoMonitoring = () => (
  <div className="space-y-4">
    <h1 className="text-xl font-bold">Мониторинг цен</h1>
    <p className="text-sm text-muted-foreground">Сравнение ваших цен со средними по рынку</p>
    <div className="space-y-2">
      {models.map((m) => {
        const diff = m.ourPrice - m.avgPrice;
        return (
          <Card key={m.model}>
            <CardContent className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TrendIcon trend={m.trend} />
                <div>
                  <p className="text-sm font-medium text-foreground">{m.model}</p>
                  <p className="text-xs text-muted-foreground">Средняя: {m.avgPrice.toLocaleString("ru")} ₽</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-foreground">{m.ourPrice.toLocaleString("ru")} ₽</p>
                <p className={`text-[10px] font-medium ${diff > 0 ? "text-destructive" : diff < 0 ? "text-green-600" : "text-muted-foreground"}`}>
                  {diff > 0 ? "+" : ""}{diff.toLocaleString("ru")} ₽
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  </div>
);

export default DemoMonitoring;
