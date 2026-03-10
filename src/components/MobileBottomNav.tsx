import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Smartphone, ShoppingCart, ArrowDownUp, Users,
  DollarSign, UserCog, MoreHorizontal, Wrench, Tag, TrendingUp,
  Megaphone, Clock, FileBarChart, Settings, HelpCircle, CreditCard, Sparkles, Headphones,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import QuickActionButton from "./QuickActionButton";

const mainItems = [
  { to: "/dashboard", label: "Дашборд", icon: LayoutDashboard },
  { to: "/dashboard/inventory", label: "Склад", icon: Smartphone },
  { to: "/dashboard/sales", label: "Продажи", icon: ShoppingCart },
  { to: "/dashboard/buyback", label: "Скупка", icon: ArrowDownUp },
  { to: "/dashboard/customers", label: "Клиенты", icon: Users },
  { to: "/dashboard/finances", label: "Финансы", icon: DollarSign },
  { to: "/dashboard/employees", label: "Сотрудники", icon: UserCog },
];

const moreItems = [
  { to: "/dashboard/accessories", label: "Аксессуары", icon: Headphones },
  { to: "/dashboard/repairs", label: "Ремонт", icon: Wrench },
  { to: "/dashboard/price-tags", label: "Ценники", icon: Tag },
  { to: "/dashboard/monitoring", label: "Мониторинг", icon: TrendingUp },
  { to: "/dashboard/listings", label: "Объявления", icon: Megaphone },
  { to: "/dashboard/shifts", label: "Смены", icon: Clock },
  { to: "/dashboard/reports", label: "Отчёты", icon: FileBarChart },
  { to: "/dashboard/ai", label: "AI", icon: Sparkles },
  { to: "/dashboard/settings", label: "Настройки", icon: Settings },
  { to: "/dashboard/pricing", label: "Тарифы", icon: CreditCard },
  { to: "/dashboard/support", label: "Поддержка", icon: HelpCircle },
];

const MobileBottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isActive = (path: string) =>
    path === "/dashboard"
      ? location.pathname === "/dashboard"
      : location.pathname.startsWith(path);

  const isInMoreSection = moreItems.some((item) => isActive(item.to));

  // Close "more" on route change
  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname]);

  return (
    <>
      {/* "More" overlay menu */}
      {moreOpen && (
        <div className="fixed inset-0 z-[90] flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
            onClick={() => setMoreOpen(false)}
          />
          <div className="relative z-10 mx-2 mb-[72px] rounded-2xl border bg-card p-3 shadow-2xl animate-scale-in">
            <div className="grid grid-cols-4 gap-1">
              {moreItems.map((item) => {
                const active = isActive(item.to);
                return (
                  <button
                    key={item.to}
                    onClick={() => {
                      navigate(item.to);
                      setMoreOpen(false);
                    }}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-xl p-3 min-h-[64px] transition-all duration-150 active:scale-95",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="text-[10px] font-medium leading-tight text-center">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bottom nav bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-[80] border-t bg-card/95 backdrop-blur-md print:hidden safe-area-bottom">
        <div
          ref={scrollRef}
          className="flex items-stretch overflow-x-auto scrollbar-none"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {mainItems.map((item, i) => {
            const active = isActive(item.to);
            const showQuickAction = i === 3;
            return (
              <div key={item.to} className="contents">
                {showQuickAction && (
                  <div className="flex items-center justify-center px-1">
                    <QuickActionButton />
                  </div>
                )}
                <button
                  onClick={() => navigate(item.to)}
                  className={cn(
                    "relative flex flex-col items-center justify-center gap-0.5 min-w-[64px] min-h-[56px] px-2 py-1.5 transition-colors flex-shrink-0 active:scale-95 transition-transform duration-150",
                    active ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  <item.icon className={cn("h-5 w-5 transition-transform duration-200", active && "scale-110")} />
                  <span className={cn(
                    "text-[10px] leading-tight font-medium",
                    active && "font-semibold"
                  )}>
                    {item.label}
                  </span>
                  {/* Active indicator — bottom */}
                  {active && (
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-primary animate-scale-in" />
                  )}
                </button>
              </div>
            );
          })}

          {/* "More" button */}
          <button
            onClick={() => setMoreOpen(!moreOpen)}
            className={cn(
              "relative flex flex-col items-center justify-center gap-0.5 min-w-[64px] min-h-[56px] px-2 py-1.5 transition-colors flex-shrink-0 active:scale-95 transition-transform duration-150",
              isInMoreSection || moreOpen ? "text-primary" : "text-muted-foreground"
            )}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-[10px] leading-tight font-medium">Ещё</span>
            {(isInMoreSection && !moreOpen) && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-primary" />
            )}
          </button>
        </div>
      </nav>
    </>
  );
};

export default MobileBottomNav;
