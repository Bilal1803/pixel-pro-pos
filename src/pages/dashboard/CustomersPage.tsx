import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { useState } from "react";

const customers = [
  { id: 1, name: "Иванов Алексей", phone: "+7 (999) 123-45-67", discount: "5%", totalSpent: "156 000 ₽", purchases: 4 },
  { id: 2, name: "Петров Борис", phone: "+7 (999) 234-56-78", discount: "3%", totalSpent: "78 500 ₽", purchases: 2 },
  { id: 3, name: "Сидорова Виктория", phone: "+7 (999) 345-67-89", discount: "—", totalSpent: "32 000 ₽", purchases: 1 },
  { id: 4, name: "Козлов Дмитрий", phone: "+7 (999) 456-78-90", discount: "7%", totalSpent: "245 000 ₽", purchases: 8 },
  { id: 5, name: "Морозов Евгений", phone: "+7 (999) 567-89-01", discount: "10%", totalSpent: "412 000 ₽", purchases: 12 },
];

const CustomersPage = () => {
  const [search, setSearch] = useState("");
  const filtered = customers.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Клиенты</h1>
        <Button><Plus className="mr-2 h-4 w-4" /> Добавить клиента</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Поиск по имени или телефону..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card className="card-shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Имя</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Телефон</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Скидка</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Покупки</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Потрачено</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-muted/30 transition-colors cursor-pointer">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3">{c.phone}</td>
                  <td className="px-4 py-3">{c.discount}</td>
                  <td className="px-4 py-3">{c.purchases}</td>
                  <td className="px-4 py-3 font-semibold">{c.totalSpent}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default CustomersPage;
