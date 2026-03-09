import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, AlertCircle, Plus } from "lucide-react";

const listings = [
  { id: 1, group: "iPhone 14 Pro 128GB Чёрный", count: 3, url: "https://avito.ru/listing/123", daysLeft: 5 },
  { id: 2, group: "iPhone 13 128GB Белый", count: 2, url: "https://avito.ru/listing/124", daysLeft: 28 },
  { id: 3, group: "Samsung S23 128GB Зелёный", count: 1, url: "https://avito.ru/listing/125", daysLeft: 2 },
  { id: 4, group: "Xiaomi 13T 256GB Чёрный", count: 4, url: "", daysLeft: 0 },
  { id: 5, group: "Pixel 8 128GB Голубой", count: 1, url: "https://avito.ru/listing/126", daysLeft: 15 },
];

const ListingsPage = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Объявления</h1>
        <Button><Plus className="mr-2 h-4 w-4" /> Добавить объявление</Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Устройства группируются по модели, памяти и цвету. Привяжите ссылку на объявление Avito.
      </p>

      <Card className="card-shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Группа</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Кол-во</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ссылка Avito</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Обновить через</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {listings.map((l) => (
                <tr key={l.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{l.group}</td>
                  <td className="px-4 py-3">{l.count} шт.</td>
                  <td className="px-4 py-3">
                    {l.url ? (
                      <a href={l.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                        Открыть <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-muted-foreground">Не привязано</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {l.daysLeft <= 3 && l.url ? (
                      <span className="inline-flex items-center gap-1 text-destructive font-medium">
                        <AlertCircle className="h-3.5 w-3.5" /> {l.daysLeft} дн.
                      </span>
                    ) : l.url ? (
                      <span>{l.daysLeft} дн.</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default ListingsPage;
