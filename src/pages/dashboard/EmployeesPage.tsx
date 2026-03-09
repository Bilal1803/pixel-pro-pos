import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const employees = [
  { id: 1, name: "Алексей Смирнов", role: "owner", email: "alexey@example.com", phone: "+7 (999) 111-22-33" },
  { id: 2, name: "Мария Козлова", role: "manager", email: "maria@example.com", phone: "+7 (999) 222-33-44" },
  { id: 3, name: "Дмитрий Попов", role: "employee", email: "dmitry@example.com", phone: "+7 (999) 333-44-55" },
];

const roleLabels: Record<string, string> = {
  owner: "Владелец",
  manager: "Менеджер",
  employee: "Сотрудник",
};

const EmployeesPage = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Сотрудники</h1>
        <Button><Plus className="mr-2 h-4 w-4" /> Добавить сотрудника</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {employees.map((e) => (
          <Card key={e.id} className="p-5 card-shadow">
            <h3 className="font-semibold">{e.name}</h3>
            <p className="mt-1 text-sm text-primary font-medium">{roleLabels[e.role]}</p>
            <div className="mt-3 space-y-1 text-sm text-muted-foreground">
              <p>{e.email}</p>
              <p>{e.phone}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default EmployeesPage;
