import { Card, CardContent } from "@/components/ui/card";
import { Clock } from "lucide-react";

const shifts = [
  { id: "sh1", employee: "Екатерина Новикова", start: "2026-03-12T09:00:00Z", end: null, status: "open", cashStart: 50000, cashEnd: null },
  { id: "sh2", employee: "Максим Козлов", start: "2026-03-11T09:00:00Z", end: "2026-03-11T21:00:00Z", status: "closed", cashStart: 45000, cashEnd: 128500 },
  { id: "sh3", employee: "Дмитрий Сидоров", start: "2026-03-10T09:00:00Z", end: "2026-03-10T21:00:00Z", status: "closed", cashStart: 38000, cashEnd: 97200 },
];

const DemoShifts = () => (
  <div className="space-y-4">
    <h1 className="text-xl font-bold">Смены</h1>
    <div className="space-y-2">
      {shifts.map((s) => (
        <Card key={s.id}>
          <CardContent className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className={`h-5 w-5 ${s.status === "open" ? "text-green-600" : "text-muted-foreground"}`} />
              <div>
                <p className="text-sm font-medium text-foreground">{s.employee}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(s.start).toLocaleDateString("ru", { day: "numeric", month: "short" })} · {new Date(s.start).toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" })}
                  {s.end ? ` — ${new Date(s.end).toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" })}` : " — сейчас"}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Касса: {s.cashStart.toLocaleString("ru")} ₽ → {s.cashEnd ? `${s.cashEnd.toLocaleString("ru")} ₽` : "..."}
                </p>
              </div>
            </div>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${s.status === "open" ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
              {s.status === "open" ? "Открыта" : "Закрыта"}
            </span>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

export default DemoShifts;
