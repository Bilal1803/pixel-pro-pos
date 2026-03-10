import { useLocation, useNavigate, Outlet } from "react-router-dom";
import { ShoppingCart, Smartphone, DollarSign, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const tmaNavItems = [
  { to: "/tma/sales", label: "Продажа", icon: ShoppingCart },
  { to: "/tma/inventory", label: "Склад", icon: Smartphone },
  { to: "/tma/cash", label: "Касса", icon: DollarSign },
  { to: "/tma/shift", label: "Смена", icon: Clock },
];

const TmaLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Content */}
      <main className="flex-1 overflow-y-auto p-4 pb-24">
        <Outlet />
      </main>

      {/* TMA bottom nav — simplified, 4 items */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 backdrop-blur-md safe-area-bottom">
        <div className="grid grid-cols-4">
          {tmaNavItems.map((item) => {
            const active = isActive(item.to);
            return (
              <button
                key={item.to}
                onClick={() => navigate(item.to)}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-1 py-3 min-h-[56px] transition-colors",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                {active && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary animate-scale-in" />
                )}
                <item.icon className={cn("h-6 w-6 transition-transform", active && "scale-110")} />
                <span className={cn("text-xs font-medium", active && "font-semibold")}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default TmaLayout;
