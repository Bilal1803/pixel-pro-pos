import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, ShoppingCart, Smartphone, ArrowDownUp, X } from "lucide-react";
import { cn } from "@/lib/utils";

const actions = [
  { label: "Продажа", icon: ShoppingCart, route: "/dashboard/sales", color: "bg-green-500" },
  { label: "Приход", icon: Smartphone, route: "/dashboard/inventory", color: "bg-primary" },
  { label: "Скупка", icon: ArrowDownUp, route: "/dashboard/buyback", color: "bg-amber-500" },
];

const QuickActionButton = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="relative">
      {/* Floating action items */}
      {open && (
        <>
          <div className="fixed inset-0 z-[85]" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 z-[86] flex flex-col items-center gap-2 animate-scale-in">
            {actions.map((action, i) => (
              <button
                key={action.label}
                onClick={() => {
                  navigate(action.route);
                  setOpen(false);
                }}
                className={cn(
                  "flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium text-white shadow-lg transition-all",
                  action.color
                )}
                style={{
                  animationDelay: `${i * 50}ms`,
                  animationFillMode: "both",
                }}
              >
                <action.icon className="h-4 w-4" />
                {action.label}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Main FAB */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "relative -top-3 flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all duration-200",
          open
            ? "bg-muted-foreground rotate-45"
            : "bg-primary hover:bg-primary/90"
        )}
      >
        {open ? (
          <X className="h-5 w-5 text-white" />
        ) : (
          <Plus className="h-6 w-6 text-primary-foreground" />
        )}
      </button>
    </div>
  );
};

export default QuickActionButton;
