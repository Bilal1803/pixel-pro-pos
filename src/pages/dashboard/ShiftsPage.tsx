import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const shifts = [
  { id: 1, employee: "Алексей Смирнов", start: "09.03.2026, 09:00", end: "—", cashStart: "10 000 ₽", cashEnd: "—", status: "active" },
  { id: 2, employee: "Мария Козлова", start: "08.03.2026, 09:00", end: "08.03.2026, 21:00", cashStart: "10 000 ₽", cashEnd: "87 500 ₽", status: "closed" },
  { id: 3, employee: "Дмитрий Попов", start: "07.03.2026, 09:00", end: "07.03.2026, 21:00", cashStart: "10 000 ₽", cashEnd: "42 300 ₽", status: "closed" },
];

const ShiftsPage = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Смены</h1>
        <Button><Plus className="mr-2 h-4 w-4" /> Открыть смену</Button>
      </div>

      <Card className="card-shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Сотрудник</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Начало</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Конец</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Касса (начало)</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Касса (конец)</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Статус</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {shifts.map((s) => (
                <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{s.employee}</td>
                  <td className="px-4 py-3">{s.start}</td>
                  <td className="px-4 py-3">{s.end}</td>
                  <td className="px-4 py-3">{s.cashStart}</td>
                  <td className="px-4 py-3">{s.cashEnd}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      s.status === "active" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                    }`}>
                      {s.status === "active" ? "Активна" : "Закрыта"}
                    </span>
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

export default ShiftsPage;
