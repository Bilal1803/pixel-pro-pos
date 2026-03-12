import { useDemo } from "@/contexts/DemoContext";
import { Card, CardContent } from "@/components/ui/card";
import { Wallet } from "lucide-react";

const typeLabels: Record<string, { label: string; color: string }> = {
  sale: { label: "Продажа", color: "text-green-600" },
  expense: { label: "Расход", color: "text-destructive" },
  deposit: { label: "Внесение", color: "text-blue-600" },
};

const DemoCash = () => {
  const { cashOps, stats } = useDemo();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Касса</h1>

      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4 flex items-center gap-4">
          <Wallet className="h-8 w-8 text-primary" />
          <div>
            <p className="text-sm text-muted-foreground">Текущий остаток</p>
            <p className="text-2xl font-bold text-foreground">{stats.currentCash.toLocaleString("ru")} ₽</p>
          </div>
        </CardContent>
      </Card>

      <p className="text-sm font-semibold">Операции</p>
      <div className="space-y-2">
        {cashOps.map((op) => {
          const t = typeLabels[op.type] || { label: op.type, color: "" };
          return (
            <Card key={op.id}>
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{op.reason}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.label} · {new Date(op.created_at).toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <span className={`font-bold text-sm ${t.color}`}>
                  {op.amount > 0 ? "+" : ""}{op.amount.toLocaleString("ru")} ₽
                </span>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default DemoCash;
