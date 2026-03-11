import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Smartphone, ShoppingCart, ArrowDownUp,
  Users, DollarSign, UserCog, Wrench, Clock, FileBarChart,
  Settings, HelpCircle, CreditCard, Sparkles, Headphones,
  Store, BarChart3, ArrowRightLeft, Tag, TrendingUp, Megaphone,
  MoreHorizontal, Shield, LogOut, Banknote,
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useSubscription } from "@/hooks/useSubscription";
import { usePlatformAdmin } from "@/hooks/usePlatformAdmin";
import { useAuth } from "@/contexts/AuthContext";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Separator } from "@/components/ui/separator";

const mainItems = [
  { to: "/dashboard", label: "Дашборд", icon: LayoutDashboard },
  { to: "/dashboard/inventory", label: "Склад", icon: Smartphone },
  { to: "/dashboard/sales", label: "Продажи", icon: ShoppingCart },
  { to: "/dashboard/buyback", label: "Скупка", icon: ArrowDownUp },
];

const moreItems = [
  { to: "/dashboard/customers", label: "Клиенты", icon: Users },
  { to: "/dashboard/finances", label: "Финансы", icon: DollarSign },
  { to: "/dashboard/employees", label: "Сотрудники", icon: UserCog },
  { to: "/dashboard/shifts", label: "Смены", icon: Clock },
  { to: "/dashboard/repairs", label: "Ремонт", icon: Wrench },
  { to: "/dashboard/accessories", label: "Аксессуары", icon: Headphones },
  { to: "/dashboard/cash", label: "Касса", icon: Banknote },
  { to: "/dashboard/monitoring", label: "Мониторинг", icon: TrendingUp },
  { to: "/dashboard/price-tags", label: "Ценники", icon: Tag },
  { to: "/dashboard/listings", label: "Объявления", icon: Megaphone },
  { to: "/dashboard/reports", label: "Отчёты", icon: FileBarChart },
  { to: "/dashboard/ai", label: "AI Ассистент", icon: Sparkles },
  { to: "/dashboard/settings", label: "Настройки", icon: Settings },
  { to: "/dashboard/pricing", label: "Тарифы", icon: CreditCard },
  { to: "/dashboard/support", label: "Поддержка", icon: HelpCircle },
];

const premierMoreItems = [
  { to: "/dashboard/network", label: "Сеть", icon: Store },
  { to: "/dashboard/comparison", label: "Сравнение", icon: BarChart3 },
  { to: "/dashboard/transfers", label: "Перемещения", icon: ArrowRightLeft },
];

const MobileBottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { subscription } = useSubscription();
  const { isAdmin } = usePlatformAdmin();
  const { signOut } = useAuth();
  const isPremier = subscription.plan === "premier";

  const allMoreItems = isPremier ? [...premierMoreItems, ...moreItems] : moreItems;

  const isActive = (path: string) =>
    path === "/dashboard"
      ? location.pathname === "/dashboard"
      : location.pathname.startsWith(path);

  const isInMoreSection = allMoreItems.some((item) => isActive(item.to));

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  return (
    <>
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent className="max-h-[80vh]">
          <div className="px-4 pt-2 pb-6 overflow-y-auto">
            <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-muted mb-4" />
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 px-1">Все разделы</h3>
            <div className="grid grid-cols-3 gap-2">
              {allMoreItems.map((item) => {
                const active = isActive(item.to);
                return (
                  <button
                    key={item.to}
                    onClick={() => {
                      navigate(item.to);
                      setDrawerOpen(false);
                    }}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-xl p-4 min-h-[72px] transition-all duration-150 active:scale-95",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="text-[11px] font-medium leading-tight text-center">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      <nav className="fixed bottom-0 left-0 right-0 z-[80] border-t bg-background shadow-[0_-2px_10px_rgba(0,0,0,0.08)] print:hidden"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 4px)" }}
      >
        <div className="flex items-stretch justify-around">
          {mainItems.map((item) => {
            const active = isActive(item.to);
            return (
              <button
                key={item.to}
                onClick={() => navigate(item.to)}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 min-h-[56px] py-2 transition-colors active:scale-95 transition-transform duration-150",
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
                {active && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-primary animate-scale-in" />
                )}
              </button>
            );
          })}

          <button
            onClick={() => setDrawerOpen(!drawerOpen)}
            className={cn(
              "relative flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 min-h-[56px] py-2 transition-colors active:scale-95 transition-transform duration-150",
              isInMoreSection || drawerOpen ? "text-primary" : "text-muted-foreground"
            )}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-[10px] leading-tight font-medium">Ещё</span>
            {(isInMoreSection && !drawerOpen) && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-primary" />
            )}
          </button>
        </div>
      </nav>
    </>
  );
};

export default MobileBottomNav;
