import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState } from "react";

const clients = [
  { id: "cl1", name: "Алексей Михайлов", phone: "+7 999 111-22-33", email: "alex@mail.ru", totalSpent: 137980, visits: 3 },
  { id: "cl2", name: "Мария Козлова", phone: "+7 999 444-55-66", email: null, totalSpent: 38990, visits: 1 },
  { id: "cl3", name: "Иван Дмитриев", phone: "+7 999 777-88-99", email: "ivan.d@gmail.com", totalSpent: 28990, visits: 1 },
  { id: "cl4", name: "Сергей Петров", phone: "+7 999 222-33-44", email: null, totalSpent: 22000, visits: 1 },
  { id: "cl5", name: "Анна Волкова", phone: "+7 999 555-66-77", email: "anna.v@yandex.ru", totalSpent: 62990, visits: 2 },
];

const DemoCustomers = () => {
  const [search, setSearch] = useState("");
  const filtered = clients.filter((c) => !search || `${c.name} ${c.phone}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Клиенты</h1>
      <Input placeholder="Поиск по имени или телефону..." value={search} onChange={(e) => setSearch(e.target.value)} />
      <div className="space-y-2">
        {filtered.map((c) => (
          <Card key={c.id}>
            <CardContent className="p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.phone}{c.email ? ` · ${c.email}` : ""}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-foreground">{c.totalSpent.toLocaleString("ru")} ₽</p>
                <p className="text-[10px] text-muted-foreground">{c.visits} покупок</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default DemoCustomers;
