import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Download, CalendarIcon, FileSpreadsheet, Loader2, TrendingUp, TrendingDown, DollarSign, ShoppingBag, Users, Package, ArrowDownUp } from "lucide-react";
import SectionHelp from "@/components/SectionHelp";
import { SECTION_TIPS } from "@/data/sectionTips";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
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
  const [downloading, setDownloading] = useState(false);

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

  const fromISO = dateRange.from.toISOString();
  const toISO = dateRange.to.toISOString();

  // Fetch report data live
  const { data: reportData, isLoading } = useQuery({
    queryKey: ["report-data", companyId, fromISO, toISO],
    queryFn: async () => {
      if (!companyId) return null;
      const [salesRes, devicesRes, shiftsRes, profilesRes, expensesRes, buybacksRes, repairsRes] = await Promise.all([
        supabase.from("sales").select("*, sale_items(name, price, cost_price, item_type, quantity, device_id, devices(*)), clients(name, phone)").eq("company_id", companyId).gte("created_at", fromISO).lte("created_at", toISO).order("created_at", { ascending: false }),
        supabase.from("devices").select("*").eq("company_id", companyId),
        supabase.from("shifts").select("*").eq("company_id", companyId).gte("start_time", fromISO).lte("start_time", toISO).order("start_time", { ascending: false }),
        supabase.from("profiles").select("user_id, full_name, phone, email").eq("company_id", companyId),
        supabase.from("expenses").select("*").eq("company_id", companyId).gte("date", format(dateRange.from, "yyyy-MM-dd")).lte("date", format(dateRange.to, "yyyy-MM-dd")),
        supabase.from("buybacks").select("*, clients(name, phone)").eq("company_id", companyId).gte("created_at", fromISO).lte("created_at", toISO),
        supabase.from("repairs").select("price, status, created_at").eq("company_id", companyId).in("status", ["done", "ready"]).gte("created_at", fromISO).lte("created_at", toISO),
      ]);

      const sales = salesRes.data || [];
      const devices = devicesRes.data || [];
      const shifts = shiftsRes.data || [];
      const profiles = profilesRes.data || [];
      const expenses = expensesRes.data || [];
      const buybacks = buybacksRes.data || [];
      const repairs = repairsRes.data || [];

      const profileMap = new Map(profiles.map((p: any) => [p.user_id, p]));

      const salesRevenue = sales.reduce((s: number, sale: any) => s + Number(sale.total || 0), 0);
      const totalPaymentFees = sales.reduce((s: number, sale: any) => s + Number(sale.payment_fee || 0), 0);
      const salesProductRevenue = salesRevenue - totalPaymentFees;
      const repairRevenue = repairs.reduce((s: number, r: any) => s + Number(r.price || 0), 0);
      const totalRevenue = salesRevenue + repairRevenue;
      const totalCost = sales.reduce((s: number, sale: any) => {
        return s + (sale.sale_items || []).reduce((is: number, i: any) => is + Number(i.cost_price || 0) * (i.quantity || 1), 0);
      }, 0);
      const totalExpenses = expenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
      // Profit excludes payment fees
      const netProfit = salesProductRevenue + repairRevenue - totalCost - totalExpenses;
      const totalBuybacks = buybacks.reduce((s: number, b: any) => s + Number(b.purchase_price || 0), 0);
      const avgCheck = sales.length > 0 ? Math.round(salesRevenue / sales.length) : 0;

      // Employee stats
      const employeeStats = new Map<string, { name: string; shifts: any[]; revenue: number; salesCount: number }>();
      profiles.forEach((p: any) => employeeStats.set(p.user_id, { name: p.full_name, shifts: [], revenue: 0, salesCount: 0 }));
      shifts.forEach((s: any) => { const e = employeeStats.get(s.employee_id); if (e) e.shifts.push(s); });
      sales.forEach((s: any) => { const e = employeeStats.get(s.employee_id); if (e) { e.revenue += Number(s.total || 0); e.salesCount++; } });

      return {
        sales, devices, shifts, profiles, expenses, buybacks, profileMap,
        totalRevenue, totalCost, totalExpenses, netProfit, totalBuybacks, avgCheck,
        totalPaymentFees, salesProductRevenue,
        employeeStats,
      };
    },
    enabled: !!companyId,
  });

  const paymentLabels: Record<string, string> = { cash: "Наличные", card: "Карта", transfer: "Перевод", installments: "Рассрочка", mixed: "Смешанная" };
  const statusLabels: Record<string, string> = { testing: "Тестирование", available: "В наличии", reserved: "Резерв", sold: "Продан", defective: "Брак", rental: "Аренда" };

  const downloadExcel = () => {
    if (!reportData) return;
    setDownloading(true);
    try {
      const { sales, devices, shifts, profiles, expenses, buybacks, profileMap, totalRevenue, totalCost, totalExpenses, netProfit, totalBuybacks, totalPaymentFees, salesProductRevenue } = reportData;

      const summaryRows = [
        ["Отчёт за период", periodLabel],
        ["Дата формирования", format(new Date(), "dd.MM.yyyy HH:mm")],
        [], ["Показатель", "Значение"],
        ["Выручка от товаров", `${(salesProductRevenue || 0).toLocaleString("ru")} ₽`],
        ["Комиссии оплаты", `${(totalPaymentFees || 0).toLocaleString("ru")} ₽`],
        ["Общий оборот", `${totalRevenue.toLocaleString("ru")} ₽`],
        ["Себестоимость", `${totalCost.toLocaleString("ru")} ₽`],
        ["Расходы", `${totalExpenses.toLocaleString("ru")} ₽`],
        ["Чистая прибыль", `${netProfit.toLocaleString("ru")} ₽`],
        ["Кол-во продаж", sales.length],
        ["Кол-во скупок", buybacks.length],
        ["Сумма скупок", `${totalBuybacks.toLocaleString("ru")} ₽`],
      ];

      const salesHeader = ["№", "Дата", "Сотрудник", "Клиент", "Телефон", "Оплата", "Скидка", "Итого", "Позиции"];
      const salesData = sales.map((s: any, idx: number) => {
        const emp = profileMap.get(s.employee_id);
        const items = (s.sale_items || []).map((i: any) => {
          let desc = `${i.name} — ${Number(i.price).toLocaleString("ru")} ₽`;
          if (i.devices) { const d = i.devices; desc += ` [IMEI: ${d.imei || "—"}, ${d.memory || ""} ${d.color || ""} АКБ: ${d.battery_health || "—"}]`; }
          return desc;
        }).join("; ");
        return [idx + 1, format(new Date(s.created_at), "dd.MM.yyyy HH:mm"), emp?.full_name || "—", s.clients?.name || "—", s.clients?.phone || "—", paymentLabels[s.payment_method] || s.payment_method, s.discount || 0, Number(s.total), items];
      });

      const devicesHeader = ["IMEI", "Модель", "Память", "Цвет", "АКБ", "Закупка ₽", "Продажа ₽", "Статус"];
      const devicesData = devices.map((d: any) => [d.imei, d.model, d.memory || "—", d.color || "—", d.battery_health || "—", d.purchase_price ?? "—", d.sale_price ?? "—", statusLabels[d.status] || d.status]);

      const empHeader = ["Сотрудник", "Смен", "Продаж", "Выручка ₽", "Детали смен"];
      const empData = Array.from(reportData.employeeStats.values()).map((e: any) => {
        const shiftsStr = e.shifts.map((s: any) => `${format(new Date(s.start_time), "dd.MM HH:mm")} → ${s.end_time ? format(new Date(s.end_time), "dd.MM HH:mm") : "активна"}`).join("; ");
        return [e.name, e.shifts.length, e.salesCount, e.revenue, shiftsStr || "—"];
      });

      const buybackHeader = ["Дата", "Модель", "IMEI", "Память", "Цвет", "АКБ", "Цена ₽", "Клиент", "Телефон", "Заметки"];
      const buybackData = buybacks.map((b: any) => [format(new Date(b.created_at), "dd.MM.yyyy HH:mm"), b.model, b.imei || "—", b.memory || "—", b.color || "—", b.battery_health || "—", Number(b.purchase_price), b.clients?.name || "—", b.clients?.phone || "—", b.notes || "—"]);

      const expHeader = ["Дата", "Категория", "Сумма ₽", "Описание"];
      const expData = expenses.map((e: any) => [format(new Date(e.date), "dd.MM.yyyy"), e.category, Number(e.amount), e.description || "—"]);

      const allRows: any[][] = [...summaryRows, [], [], ["═══ ПРОДАЖИ ═══"], salesHeader, ...salesData, [], [], ["═══ УСТРОЙСТВА ═══"], devicesHeader, ...devicesData, [], [], ["═══ СОТРУДНИКИ ═══"], empHeader, ...empData, [], [], ["═══ СКУПКИ ═══"], buybackHeader, ...buybackData, [], [], ["═══ РАСХОДЫ ═══"], expHeader, ...expData];

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(allRows);
      ws["!cols"] = [{ wch: 35 }, { wch: 22 }, { wch: 20 }, { wch: 20 }, { wch: 16 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 30 }];
      XLSX.utils.book_append_sheet(wb, ws, "Отчёт");
      const fileName = `Report_${format(dateRange.from, "dd-MM-yyyy")}_${format(dateRange.to, "dd-MM-yyyy")}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast({ title: "Отчёт скачан", description: fileName });
    } catch (err: any) {
      toast({ title: "Ошибка", description: err.message, variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  };

  const r = reportData;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Отчёты</h1>
        {r && (
          <Button onClick={downloadExcel} disabled={downloading}>
            {downloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Скачать Excel
          </Button>
        )}
      </div>

      <SectionHelp tips={SECTION_TIPS.reports} />

      {/* Period selector */}
      <Card>
        <CardContent className="pt-6 space-y-4">
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

          <div className="rounded-lg border bg-muted/30 px-4 py-3">
            <p className="text-xs text-muted-foreground">Период отчёта</p>
            <p className="font-semibold">{periodLabel}</p>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Загрузка данных...
        </div>
      ) : r ? (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <DollarSign className="h-3.5 w-3.5" /> Выручка от товаров
                </div>
                <p className="text-xl font-bold">{(r.salesProductRevenue || 0).toLocaleString("ru")} ₽</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <ArrowDownUp className="h-3.5 w-3.5" /> Комиссии оплаты
                </div>
                <p className="text-xl font-bold">{(r.totalPaymentFees || 0).toLocaleString("ru")} ₽</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <TrendingUp className="h-3.5 w-3.5" /> Чистая прибыль
                </div>
                <p className={`text-xl font-bold ${r.netProfit >= 0 ? "text-success" : "text-destructive"}`}>
                  {r.netProfit.toLocaleString("ru")} ₽
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <ShoppingBag className="h-3.5 w-3.5" /> Продажи
                </div>
                <p className="text-xl font-bold">{r.sales.length}</p>
                <p className="text-xs text-muted-foreground">Ср. чек: {r.avgCheck.toLocaleString("ru")} ₽</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <TrendingDown className="h-3.5 w-3.5" /> Расходы
                </div>
                <p className="text-xl font-bold">{(r.totalExpenses + r.totalCost).toLocaleString("ru")} ₽</p>
                <p className="text-xs text-muted-foreground">Себест.: {r.totalCost.toLocaleString("ru")} ₽</p>
              </CardContent>
            </Card>
          </div>

          {/* Sales Table */}
          {r.sales.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4 text-primary" />
                  Продажи ({r.sales.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Дата</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Сотрудник</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Клиент</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Оплата</th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">Сумма</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Позиции</th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.sales.slice(0, 50).map((s: any, i: number) => {
                        const emp = r.profileMap.get(s.employee_id);
                        const items = (s.sale_items || []).map((it: any) => it.name).join(", ");
                        return (
                          <tr key={s.id} className="border-b last:border-0">
                            <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{format(new Date(s.created_at), "dd.MM HH:mm")}</td>
                            <td className="px-3 py-2">{emp?.full_name || "—"}</td>
                            <td className="px-3 py-2">{s.clients?.name || "—"}</td>
                            <td className="px-3 py-2">
                              <Badge variant="secondary" className="text-xs">{paymentLabels[s.payment_method] || s.payment_method}</Badge>
                            </td>
                            <td className="px-3 py-2 text-right font-medium">{Number(s.total).toLocaleString("ru")} ₽</td>
                            <td className="px-3 py-2 text-muted-foreground text-xs max-w-[200px] truncate">{items || "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {r.sales.length > 50 && (
                    <p className="text-xs text-muted-foreground text-center py-2">Показаны первые 50 из {r.sales.length}. Скачайте Excel для полного отчёта.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Employees */}
          {r.employeeStats.size > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Сотрудники
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Сотрудник</th>
                        <th className="px-3 py-2 text-center font-medium text-muted-foreground">Смен</th>
                        <th className="px-3 py-2 text-center font-medium text-muted-foreground">Продаж</th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">Выручка</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from(r.employeeStats.values()).filter((e: any) => e.shifts.length > 0 || e.salesCount > 0).map((e: any, i: number) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="px-3 py-2 font-medium">{e.name}</td>
                          <td className="px-3 py-2 text-center">{e.shifts.length}</td>
                          <td className="px-3 py-2 text-center">{e.salesCount}</td>
                          <td className="px-3 py-2 text-right font-medium">{e.revenue.toLocaleString("ru")} ₽</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Buybacks & Expenses side by side */}
          <div className="grid md:grid-cols-2 gap-4">
            {r.buybacks.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ArrowDownUp className="h-4 w-4 text-primary" />
                    Скупки ({r.buybacks.length}) — {r.totalBuybacks.toLocaleString("ru")} ₽
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {r.buybacks.slice(0, 20).map((b: any) => (
                      <div key={b.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                        <div>
                          <p className="font-medium">{b.model} {b.memory || ""}</p>
                          <p className="text-xs text-muted-foreground">{format(new Date(b.created_at), "dd.MM HH:mm")} · {b.clients?.name || "—"}</p>
                        </div>
                        <span className="font-medium">{Number(b.purchase_price).toLocaleString("ru")} ₽</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {r.expenses.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-destructive" />
                    Расходы ({r.expenses.length}) — {r.totalExpenses.toLocaleString("ru")} ₽
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {r.expenses.slice(0, 20).map((e: any) => (
                      <div key={e.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                        <div>
                          <p className="font-medium">{e.category}</p>
                          <p className="text-xs text-muted-foreground">{format(new Date(e.date), "dd.MM.yyyy")} · {e.description || "—"}</p>
                        </div>
                        <span className="font-medium text-destructive">{Number(e.amount).toLocaleString("ru")} ₽</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Empty state */}
          {r.sales.length === 0 && r.buybacks.length === 0 && r.expenses.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <FileSpreadsheet className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p>За выбранный период данных нет</p>
              </CardContent>
            </Card>
          )}
        </>
      ) : null}
    </div>
  );
};

export default ReportsPage;
