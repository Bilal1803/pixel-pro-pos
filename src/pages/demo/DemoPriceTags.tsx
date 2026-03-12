import { useDemo } from "@/contexts/DemoContext";
import { Card, CardContent } from "@/components/ui/card";
import { Printer } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const DemoPriceTags = () => {
  const { devices } = useDemo();
  const available = devices.filter((d) => d.status === "available");

  const handlePrint = () => {
    toast({ title: "Демо-режим", description: "В демо-режиме печать недоступна" });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Ценники</h1>
        <button onClick={handlePrint} className="text-sm text-primary font-medium hover:underline flex items-center gap-1">
          <Printer className="h-3.5 w-3.5" /> Печать
        </button>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
        {available.map((d) => (
          <Card key={d.id} className="text-center">
            <CardContent className="p-4">
              <p className="font-bold text-foreground text-sm">{d.brand} {d.model}</p>
              <p className="text-xs text-muted-foreground">{d.memory} · {d.color}</p>
              <p className="text-xl font-extrabold text-primary mt-2">{d.sale_price.toLocaleString("ru")} ₽</p>
              <p className="text-[10px] text-muted-foreground mt-1">IMEI: {d.imei.slice(0, 6)}...{d.imei.slice(-4)}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default DemoPriceTags;
