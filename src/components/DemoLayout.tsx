import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { DemoProvider } from "@/contexts/DemoContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Package, ShoppingCart, DollarSign, ClipboardList,
  BarChart3, Tag, Megaphone, ArrowRight, X, ArrowDownUp, Users,
  Headphones, Wrench, TrendingUp, Banknote, UserCog, Clock,
  FileBarChart, Sparkles, Settings,
} from "lucide-react";
import { useState } from "react";

const demoNav = [
  { to: "/demo", label: "Дашборд", icon: LayoutDashboard },
  { to: "/demo/inventory", label: "Склад", icon: Package },
  { to: "/demo/sales", label: "Продажи", icon: ShoppingCart },
  { to: "/demo/buyback", label: "Скупка", icon: ArrowDownUp },
  { to: "/demo/customers", label: "Клиенты", icon: Users },
  { to: "/demo/accessories", label: "Аксессуары", icon: Headphones },
  { to: "/demo/repairs", label: "Ремонт", icon: Wrench },
  { to: "/demo/price-tags", label: "Ценники", icon: Tag },
  { to: "/demo/monitoring", label: "Мониторинг цен", icon: TrendingUp },
  { to: "/demo/listings", label: "Объявления", icon: Megaphone },
  { to: "/demo/finances", label: "Финансы", icon: BarChart3 },
  { to: "/demo/cash", label: "Касса", icon: Banknote },
  { to: "/demo/employees", label: "Сотрудники", icon: UserCog },
  { to: "/demo/shifts", label: "Смены", icon: Clock },
  { to: "/demo/tasks", label: "Задачи", icon: ClipboardList },
  { to: "/demo/reports", label: "Отчёты", icon: FileBarChart },
  { to: "/demo/ai", label: "AI Ассистент", icon: Sparkles },
  { to: "/demo/settings", label: "Настройки", icon: Settings },
];

const DemoLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [bannerVisible, setBannerVisible] = useState(true);

  const isActive = (path: string) =>
    path === "/demo" ? location.pathname === "/demo" : location.pathname.startsWith(path);

  return (
    <DemoProvider>
      <div className="flex flex-col h-screen overflow-hidden">
        {/* Demo banner */}
        {bannerVisible && (
          <div className="bg-primary text-primary-foreground px-4 py-2.5 flex items-center justify-between gap-3 text-sm shrink-0 z-50">
            <span className="font-medium truncate">
              🎯 Вы в демо-режиме FILTER CRM — данные демонстрационные
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <Button size="sm" variant="secondary" className="h-7 text-xs" asChild>
                <Link to="/register">
                  Создать свой магазин <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
              <button onClick={() => setBannerVisible(false)} className="text-primary-foreground/70 hover:text-primary-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-1 min-h-0">
          {/* Sidebar — desktop */}
          {!isMobile && (
            <aside className="w-56 shrink-0 border-r bg-card overflow-y-auto">
              <div className="p-4">
                <Link to="/" className="text-lg font-bold text-foreground">
                  PhoneCRM
                </Link>
                <p className="text-[10px] text-muted-foreground mt-0.5">Демо-режим</p>
              </div>
              <nav className="px-2 pb-4 space-y-0.5">
                {demoNav.map((n) => (
                  <Link
                    key={n.to}
                    to={n.to}
                    className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                      isActive(n.to)
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <n.icon className="h-4 w-4" />
                    {n.label}
                  </Link>
                ))}
              </nav>
              <div className="px-4 pb-4 mt-auto">
                <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => navigate("/")}>
                  ← Вернуться на сайт
                </Button>
              </div>
            </aside>
          )}

          {/* Main content */}
          <div className="flex-1 min-w-0 overflow-y-auto">
            <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background/95 backdrop-blur px-4 gap-3">
              <h2 className="text-base font-semibold text-foreground truncate">Демо — Магазин «Техно-Старт»</h2>
              <Button size="sm" variant="default" className="h-8 text-xs shrink-0" asChild>
                <Link to="/register">Начать использовать CRM</Link>
              </Button>
            </header>
            <main className={`p-3 md:p-6 ${isMobile ? "pb-24" : ""}`}>
              <Outlet />
            </main>
          </div>
        </div>

        {/* Mobile bottom nav */}
        {isMobile && (
          <nav className="fixed bottom-0 inset-x-0 border-t bg-background/95 backdrop-blur z-40 flex justify-around py-1.5" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 6px)" }}>
            {demoNav.slice(0, 5).map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className={`flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] ${
                  isActive(n.to) ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <n.icon className="h-5 w-5" />
                {n.label}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </DemoProvider>
  );
};

export default DemoLayout;
