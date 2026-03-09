import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

const devices = [
  { id: 1, model: "iPhone 14 Pro", memory: "128GB", color: "Чёрный", battery: "94%", imei: "354678901234561", price: "52 000" },
  { id: 2, model: "iPhone 13", memory: "128GB", color: "Белый", battery: "87%", imei: "354678901234562", price: "32 000" },
  { id: 3, model: "Samsung S23", memory: "128GB", color: "Зелёный", battery: "91%", imei: "354678901234564", price: "38 000" },
  { id: 4, model: "Xiaomi 13T", memory: "256GB", color: "Чёрный", battery: "96%", imei: "354678901234565", price: "22 500" },
  { id: 5, model: "Pixel 8", memory: "128GB", color: "Голубой", battery: "99%", imei: "354678901234566", price: "35 000" },
];

const PriceTagsPage = () => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <h1 className="text-2xl font-bold">Ценники</h1>
        <Button onClick={handlePrint}><Printer className="mr-2 h-4 w-4" /> Печать ценников</Button>
      </div>

      <p className="text-sm text-muted-foreground print:hidden">
        Выберите устройства и нажмите «Печать» для генерации ценников формата A4.
      </p>

      {/* Print layout */}
      <div className="grid grid-cols-2 gap-4 print:grid-cols-2 print:gap-2">
        {devices.map((d) => (
          <Card key={d.id} className="p-5 card-shadow print:shadow-none print:border print:p-3">
            <div className="space-y-2">
              <h3 className="text-lg font-bold print:text-base">{d.model}</h3>
              <div className="grid grid-cols-2 gap-1 text-sm">
                <span className="text-muted-foreground">Память:</span>
                <span className="font-medium">{d.memory}</span>
                <span className="text-muted-foreground">Цвет:</span>
                <span className="font-medium">{d.color}</span>
                <span className="text-muted-foreground">АКБ:</span>
                <span className="font-medium">{d.battery}</span>
                <span className="text-muted-foreground">IMEI:</span>
                <span className="font-mono text-xs">{d.imei}</span>
              </div>
              <div className="border-t pt-2 mt-2">
                <span className="text-2xl font-extrabold print:text-xl">{d.price} ₽</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default PriceTagsPage;
