import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Database, Server, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { useState, useEffect } from "react";

const AdminMonitoringPage = () => {
  const [apiLatency, setApiLatency] = useState<number | null>(null);
  const [dbStatus, setDbStatus] = useState<"ok" | "error" | "checking">("checking");

  // Check API latency
  useEffect(() => {
    const checkLatency = async () => {
      const start = performance.now();
      try {
        await supabase.from("companies").select("id").limit(1);
        setApiLatency(Math.round(performance.now() - start));
        setDbStatus("ok");
      } catch {
        setApiLatency(null);
        setDbStatus("error");
      }
    };
    checkLatency();
    const interval = setInterval(checkLatency, 30000);
    return () => clearInterval(interval);
  }, []);

  const { data: recentErrors = [] } = useQuery({
    queryKey: ["admin-monitoring-errors"],
    queryFn: async () => {
      const { data } = await supabase
        .from("system_errors")
        .select("id, created_at")
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
      return data || [];
    },
    refetchInterval: 60000,
  });

  const { data: todaySales = [] } = useQuery({
    queryKey: ["admin-monitoring-sales"],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await supabase.from("sales").select("id").gte("created_at", today);
      return data || [];
    },
    refetchInterval: 60000,
  });

  const { data: activeShifts = [] } = useQuery({
    queryKey: ["admin-monitoring-shifts"],
    queryFn: async () => {
      const { data } = await supabase.from("shifts").select("id").eq("status", "active");
      return data || [];
    },
    refetchInterval: 60000,
  });

  const hasIssues = dbStatus === "error" || (apiLatency !== null && apiLatency > 2000) || recentErrors.length > 10;

  const statusItems = [
    {
      label: "Сервер API",
      status: apiLatency !== null ? "ok" : "error",
      detail: apiLatency !== null ? `${apiLatency} мс` : "Недоступен",
      icon: Server,
    },
    {
      label: "База данных",
      status: dbStatus,
      detail: dbStatus === "ok" ? "Подключена" : dbStatus === "checking" ? "Проверка..." : "Ошибка подключения",
      icon: Database,
    },
    {
      label: "Время отклика API",
      status: apiLatency !== null && apiLatency < 1000 ? "ok" : apiLatency !== null && apiLatency < 2000 ? "warning" : "error",
      detail: apiLatency !== null ? `${apiLatency} мс` : "—",
      icon: Clock,
    },
    {
      label: "Ошибки (24ч)",
      status: recentErrors.length === 0 ? "ok" : recentErrors.length < 10 ? "warning" : "error",
      detail: `${recentErrors.length} ошибок`,
      icon: AlertTriangle,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Состояние системы</h1>
        <p className="text-sm text-muted-foreground">Мониторинг работоспособности платформы в реальном времени</p>
      </div>

      {hasIssues && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
            <div>
              <p className="font-medium text-sm text-destructive">Обнаружены проблемы</p>
              <p className="text-xs text-muted-foreground">Проверьте состояние компонентов системы ниже</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statusItems.map((item) => (
          <Card key={item.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <item.icon className="h-5 w-5 text-muted-foreground" />
                {item.status === "ok" ? (
                  <Badge className="bg-success/10 text-success border-0 text-xs">OK</Badge>
                ) : item.status === "warning" ? (
                  <Badge className="bg-warning/10 text-warning border-0 text-xs">Внимание</Badge>
                ) : item.status === "checking" ? (
                  <Badge variant="secondary" className="text-xs">Проверка</Badge>
                ) : (
                  <Badge variant="destructive" className="text-xs">Ошибка</Badge>
                )}
              </div>
              <p className="text-sm font-medium">{item.label}</p>
              <p className="text-xs text-muted-foreground mt-1">{item.detail}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" /> Активность сейчас
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Активные смены</span>
              <span className="font-medium">{activeShifts.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Продажи сегодня</span>
              <span className="font-medium">{todaySales.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Ошибки за 24ч</span>
              <span className="font-medium">{recentErrors.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4" /> Общее состояние
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
              {hasIssues ? (
                <>
                  <AlertTriangle className="h-8 w-8 text-warning" />
                  <div>
                    <p className="font-medium">Требуется внимание</p>
                    <p className="text-xs text-muted-foreground">Некоторые компоненты работают с отклонениями</p>
                  </div>
                </>
              ) : (
                <>
                  <CheckCircle className="h-8 w-8 text-success" />
                  <div>
                    <p className="font-medium">Всё в порядке</p>
                    <p className="text-xs text-muted-foreground">Все системы работают нормально</p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminMonitoringPage;
