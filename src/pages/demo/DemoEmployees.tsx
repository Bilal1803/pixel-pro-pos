import { Card, CardContent } from "@/components/ui/card";

const employees = [
  { id: "em1", name: "Александр Иванов", role: "owner", phone: "+7 999 100-00-01", email: "alex@filter.crm" },
  { id: "em2", name: "Дмитрий Сидоров", role: "manager", phone: "+7 999 100-00-02", email: "dmitry@filter.crm" },
  { id: "em3", name: "Екатерина Новикова", role: "employee", phone: "+7 999 100-00-03", email: "kate@filter.crm" },
  { id: "em4", name: "Максим Козлов", role: "employee", phone: "+7 999 100-00-04", email: "max@filter.crm" },
];

const roleLabels: Record<string, { label: string; color: string }> = {
  owner: { label: "Владелец", color: "bg-primary/10 text-primary" },
  manager: { label: "Менеджер", color: "bg-blue-100 text-blue-700" },
  employee: { label: "Продавец", color: "bg-muted text-muted-foreground" },
};

const DemoEmployees = () => (
  <div className="space-y-4">
    <h1 className="text-xl font-bold">Сотрудники</h1>
    <div className="space-y-2">
      {employees.map((e) => {
        const r = roleLabels[e.role] || { label: e.role, color: "" };
        return (
          <Card key={e.id}>
            <CardContent className="p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{e.name}</p>
                <p className="text-xs text-muted-foreground">{e.phone} · {e.email}</p>
              </div>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${r.color}`}>{r.label}</span>
            </CardContent>
          </Card>
        );
      })}
    </div>
  </div>
);

export default DemoEmployees;
