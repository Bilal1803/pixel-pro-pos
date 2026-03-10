import { useEffect } from "react";
import { useLocation, useNavigate, Outlet } from "react-router-dom";
import { Home, Smartphone, ShoppingCart, DollarSign, Clock, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

const tmaNavItems = [
  { to: "/tma", label: "Главная", icon: Home, exact: true },
  { to: "/tma/inventory", label: "Склад", icon: Smartphone },
  { to: "/tma/sales", label: "Продажи", icon: ShoppingCart },
  { to: "/tma/cash", label: "Касса", icon: DollarSign },
  { to: "/tma/shift", label: "Смена", icon: Clock },
  { to: "/tma/more", label: "Ещё", icon: MoreHorizontal },
];

const TmaLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Init Telegram WebApp
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      // Apply Telegram theme
      if (tg.themeParams?.bg_color) {
        document.documentElement.style.setProperty("--background", tg.themeParams.bg_color);
      }
    }
  }, []);

  const isActive = (item: typeof tmaNavItems[0]) => {
    if (item.exact) return location.pathname === item.to;
    return location.pathname.startsWith(item.to);
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <main className="flex-1 overflow-y-auto p-4 pb-24">
        <Outlet />
      </main>

      {/* Scrollable bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 backdrop-blur-md safe-area-bottom">
        <ScrollArea className="w-full">
          <div className="flex min-w-max">
            {tmaNavItems.map((item) => {
              const active = isActive(item);
              return (
                <button
                  key={item.to}
                  onClick={() => navigate(item.to)}
                  className={cn(
                    "relative flex flex-col items-center justify-center gap-1 py-3 px-5 min-h-[56px] min-w-[72px] transition-all duration-150 active:scale-95",
                    active ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  <item.icon className={cn("h-5 w-5 transition-transform duration-200", active && "scale-110")} />
                  <span className={cn("text-[10px] font-medium whitespace-nowrap", active && "font-semibold")}>
                    {item.label}
                  </span>
                  {active && (
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary" />
                  )}
                </button>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" className="h-0" />
        </ScrollArea>
      </nav>
    </div>
  );
};

export default TmaLayout;
