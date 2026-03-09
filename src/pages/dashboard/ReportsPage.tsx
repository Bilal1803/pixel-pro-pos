import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, CalendarIcon, FileSpreadsheet, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays } from "date-fns";
import { ru } from "date-fns/locale";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";

type Period = "day" | "week" | "month" | "year" | "custom";

const ReportsPage = () => {
  const { companyId } = useAuth();
  const { toast } = useToast();
  const [period, setPeriod] = useState<Period>("day");
  const [customFrom, setCustomFrom] = useState<Date | undefined>(subDays(new Date(), 7));
  const [customTo, setCustomTo] = useState<Date | undefined>(new Date());
  const [loading, setLoading] = useState(false);

  const dateRange = useMemo(() => {
    const now = new Date();
    switch (period) {
      case "day": return { from: startOfDay(now), to: endOfDay(now) };
      case "week": return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
      case "month": return { from: startOfMonth(now), to: endOfMonth(now) };
      case "year": return { from: startOfYear(now), to: endOfYear(now) };
      case "custom": return { from: customFrom ? startOfDay(customFrom) : startOfDay(subDays(now, 7)), to: customTo ? endOfDay(customTo) : endOfDay(now) };
    }
  }, [period, customFrom, customTo]);

  const periodLabel = useMemo(() => {
    switch (period) {
      case "day": return format(dateRange.from, "dd.MM.yyyy");
      case "week": return `${format(dateRange.from, "dd.MM")} — ${format(dateRange.to, "dd.MM.yyyy")}`;
      case "month": return format(dateRange.from, "LLLL yyyy", { locale: ru });
      case "year": return format(dateRange.from, "yyyy");
      case "custom": return `${format(dateRange.from, "dd.MM.yyyy")} — ${format(dateRange.to, "dd.MM.yyyy")}`;
    }
  }, [period, dateRange]);

  const generateReport = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const fromISO = dateRange.from.toISOString();
      const toISO = dateRange.to.toISOString();

      // Fetch all data in parallel
      const [salesRes, devicesRes, shiftsRes, profilesRes, expensesRes, buybacksRes, clientsRes] = await Promise.all([
        supabase.from("sales").select("*, sale_items(*, devices(*)), clients(name, phone)").eq("company_id", companyId).gte("created_at", fromISO).lte("created_at", toISO).order("created_at", { ascending: false }),
        supabase.from("devices").select("*").eq("company_id", companyId),
        supabase.from("shifts").select("*").eq("company_id", companyId).gte("start_time", fromISO).lte("start_time", toISO).order("start_time", { ascending: false }),
        supabase.from("profiles").select("user_id, full_name, phone, email").eq("company_id", companyId),
        supabase.from("expenses").select("*").eq("company_id", companyId).gte("date", format(dateRange.from, "yyyy-MM-dd")).lte("date", format(dateRange.to, "yyyy-MM-dd")),
        supabase.from("buybacks").select("*, clients(name, phone)").eq("company_id", companyId).gte("created_at", fromISO).lte("created_at", toISO),
        supabase.from("clients").select("*").eq("company_id", companyId),
      ]);

      const sales = salesRes.data || [];
      const devices = devicesRes.data || [];
      const shifts = shiftsRes.data || [];
      const profiles = profilesRes.data || [];
      const expenses = expensesRes.data || [];
      const buybacks = buybacksRes.data || [];

      const profileMap = new Map(profiles.map((p: any) => [p.user_id, p]));

      // === SHEET 1: Summary ===
      const totalRevenue = sales.reduce((s: number, sale: any) => s + Number(sale.total || 0), 0);
      const totalCost = sales.reduce((s: number, sale: any) => {
        const items = sale.sale_items || [];
        return s + items.reduce((is: number, i: any) => is + Number(i.cost_price || 0) * (i.quantity || 1), 0);
      }, 0);
      const totalExpenses = expenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
      const netProfit = totalRevenue - totalCost - totalExpenses;
      const totalBuybacks = buybacks.reduce((s: number, b: any) => s + Number(b.purchase_price || 0), 0);

      const summaryRows = [
        ["Отчёт за период", periodLabel],
        ["Дата формирования", format(new Date(), "dd.MM.yyyy HH:mm")],
        [],
        ["Показатель", "Значение"],
        ["Выручка", `${totalRevenue.toLocaleString("ru")} ₽`],
        ["Себестоимость проданных товаров", `${totalCost.toLocaleString("ru")} ₽`],
        ["Расходы", `${totalExpenses.toLocaleString("ru")} ₽`],
        ["Чистая прибыль", `${netProfit.toLocaleString("ru")} ₽`],
        ["Количество продаж", sales.length],
        ["Количество скупок", buybacks.length],
        ["Сумма скупок", `${totalBuybacks.toLocaleString("ru")} ₽`],
      ];

      // === SHEET 2: Sales details ===
      const salesHeader = [
        "№", "Дата", "Сотрудник", "Клиент", "Телефон клиента",
        "Способ оплаты", "Скидка", "Итого", "Позиции",
      ];
      const paymentLabels: Record<string, string> = { cash: "Наличные", card: "Карта", transfer: "Перевод", installments: "Рассрочка", mixed: "Смешанная" };
      const salesData = sales.map((s: any, idx: number) => {
        const emp = profileMap.get(s.employee_id);
        const items = (s.sale_items || []).map((i: any) => {
          let desc = `${i.name} — ${Number(i.price).toLocaleString("ru")} ₽`;
          if (i.devices) {
            const d = i.devices;
            desc += ` [IMEI: ${d.imei || "—"}, ${d.memory || ""} ${d.color || ""} АКБ: ${d.battery_health || "—"}]`;
          }
          return desc;
        }).join("; ");
        return [
          idx + 1,
          format(new Date(s.created_at), "dd.MM.yyyy HH:mm"),
          emp?.full_name || "—",
          s.clients?.name || "—",
          s.clients?.phone || "—",
          paymentLabels[s.payment_method] || s.payment_method,
          s.discount ? `${s.discount}` : "0",
          Number(s.total),
          items,
        ];
      });

      // === SHEET 3: Devices sold in period ===
      const soldDeviceIds = new Set<string>();
      sales.forEach((s: any) => {
        (s.sale_items || []).forEach((i: any) => { if (i.device_id) soldDeviceIds.add(i.device_id); });
      });
      const statusLabels: Record<string, string> = { testing: "Тестирование", available: "В наличии", reserved: "Резерв", sold: "Продан", defective: "Брак", rental: "Аренда" };
      const devicesHeader = ["IMEI", "Модель", "Память", "Цвет", "АКБ", "Закупка ₽", "Продажа ₽", "Статус", "Продан в этом периоде"];
      const devicesData = devices.map((d: any) => [
        d.imei, d.model, d.memory || "—", d.color || "—", d.battery_health || "—",
        d.purchase_price ?? "—", d.sale_price ?? "—",
        statusLabels[d.status] || d.status,
        soldDeviceIds.has(d.id) ? "Да" : "Нет",
      ]);

      // === SHEET 4: Employee shifts & revenue ===
      const employeeStats = new Map<string, { name: string; shifts: any[]; revenue: number; salesCount: number }>();
      profiles.forEach((p: any) => employeeStats.set(p.user_id, { name: p.full_name, shifts: [], revenue: 0, salesCount: 0 }));
      shifts.forEach((s: any) => {
        const e = employeeStats.get(s.employee_id);
        if (e) e.shifts.push(s);
      });
      sales.forEach((s: any) => {
        const e = employeeStats.get(s.employee_id);
        if (e) { e.revenue += Number(s.total || 0); e.salesCount++; }
      });
      const empHeader = ["Сотрудник", "Кол-во смен", "Кол-во продаж", "Выручка ₽", "Смены (начало → конец, касса)"];
      const empData = Array.from(employeeStats.values()).map((e) => {
        const shiftsStr = e.shifts.map((s: any) =>
          `${format(new Date(s.start_time), "dd.MM HH:mm")} → ${s.end_time ? format(new Date(s.end_time), "dd.MM HH:mm") : "активна"} (${s.cash_start ?? 0} → ${s.cash_end ?? "—"} ₽)`
        ).join("; ");
        return [e.name, e.shifts.length, e.salesCount, e.revenue, shiftsStr || "—"];
      });

      // === SHEET 5: Buybacks ===
      const buybackHeader = ["Дата", "Модель", "IMEI", "Память", "Цвет", "АКБ", "Цена скупки ₽", "Клиент", "Телефон клиента", "Заметки"];
      const buybackData = buybacks.map((b: any) => [
        format(new Date(b.created_at), "dd.MM.yyyy HH:mm"),
        b.model, b.imei || "—", b.memory || "—", b.color || "—", b.battery_health || "—",
        Number(b.purchase_price),
        b.clients?.name || "—", b.clients?.phone || "—",
        b.notes || "—",
      ]);

      // === SHEET 6: Expenses ===
      const expHeader = ["Дата", "Категория", "Сумма ₽", "Описание"];
      const expData = expenses.map((e: any) => [
        format(new Date(e.date), "dd.MM.yyyy"),
        e.category, Number(e.amount), e.description || "—",
      ]);

      // Build single sheet with all sections
      const wb = XLSX.utils.book_new();
      const allRows: any[][] = [
        ...summaryRows,
        [],
        [],
        ["═══ ПРОДАЖИ ═══"],
        salesHeader,
        ...salesData,
        [],
        [],
        ["═══ УСТРОЙСТВА ═══"],
        devicesHeader,
        ...devicesData,
        [],
        [],
        ["═══ СОТРУДНИКИ ═══"],
        empHeader,
        ...empData,
        [],
        [],
        ["═══ СКУПКИ ═══"],
        buybackHeader,
        ...buybackData,
        [],
        [],
        ["═══ РАСХОДЫ ═══"],
        expHeader,
        ...expData,
      ];

      const ws = XLSX.utils.aoa_to_sheet(allRows);
      ws["!cols"] = [{ wch: 35 }, { wch: 22 }, { wch: 20 }, { wch: 20 }, { wch: 16 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 30 }];
      XLSX.utils.book_append_sheet(wb, ws, "Отчёт");

      const fileName = `Отчёт_${format(dateRange.from, "dd.MM.yyyy")}_${format(dateRange.to, "dd.MM.yyyy")}.xlsx`;
      XLSX.writeFile(wb, fileName);

      toast({ title: "Отчёт скачан", description: fileName });
    } catch (err: any) {
      toast({ title: "Ошибка", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Отчёты</h1>
      </div>

      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="text-lg">Сформировать отчёт</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <TabsList className="flex flex-wrap h-auto gap-1">
              <TabsTrigger value="day">Сегодня</TabsTrigger>
              <TabsTrigger value="week">Неделя</TabsTrigger>
              <TabsTrigger value="month">Месяц</TabsTrigger>
              <TabsTrigger value="year">Год</TabsTrigger>
              <TabsTrigger value="custom">Свой период</TabsTrigger>
            </TabsList>
          </Tabs>

          {period === "custom" && (
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <span className="text-sm text-muted-foreground mb-1 block">От</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-[160px] justify-start text-left font-normal", !customFrom && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customFrom ? format(customFrom, "dd.MM.yyyy") : "Выбрать"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={customFrom} onSelect={setCustomFrom} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <span className="text-sm text-muted-foreground mb-1 block">До</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-[160px] justify-start text-left font-normal", !customTo && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customTo ? format(customTo, "dd.MM.yyyy") : "Выбрать"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={customTo} onSelect={setCustomTo} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}

          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground mb-1">Период отчёта</p>
            <p className="font-semibold text-lg">{periodLabel}</p>
          </div>

          <div className="rounded-lg border p-4 space-y-2">
            <p className="font-medium flex items-center gap-2"><FileSpreadsheet className="h-4 w-4 text-primary" /> Содержание отчёта (Excel, 1 лист):</p>
            <ul className="text-sm text-muted-foreground space-y-1 ml-6 list-disc">
              <li><strong>Сводка</strong> — выручка, себестоимость, расходы, чистая прибыль, скупки</li>
              <li><strong>Продажи</strong> — детали каждой продажи, позиции, клиенты, сотрудники</li>
              <li><strong>Устройства</strong> — все телефоны с IMEI, памятью, АКБ, статусом</li>
              <li><strong>Сотрудники</strong> — смены, выручка каждого, время работы, касса</li>
              <li><strong>Скупки</strong> — все скупки за период с характеристиками</li>
              <li><strong>Расходы</strong> — все расходы за период</li>
            </ul>
          </div>

          <Button onClick={generateReport} disabled={loading} size="lg" className="w-full sm:w-auto">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            {loading ? "Формирование..." : "Скачать отчёт"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportsPage;
