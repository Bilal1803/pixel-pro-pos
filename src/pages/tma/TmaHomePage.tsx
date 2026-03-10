import { ShoppingCart, Smartphone, DollarSign, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";

const quickLinks = [
  { to: "/tma/sales", label: "Новая продажа", icon: ShoppingCart, color: "bg-green-500" },
  { to: "/tma/inventory", label: "Склад", icon: Smartphone, color: "bg-primary" },
  { to: "/tma/cash", label: "Касса", icon: DollarSign, color: "bg-amber-500" },
  { to: "/tma/shift", label: "Смена", icon: Clock, color: "bg-purple-500" },
];

const TmaHomePage = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">PhoneCRM</h1>
        <p className="text-sm text-muted-foreground">Быстрый доступ</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {quickLinks.map((link) => (
          <button
            key={link.to}
            onClick={() => navigate(link.to)}
            className="flex flex-col items-center gap-3 rounded-2xl border bg-card p-6 shadow-sm transition-all active:scale-95"
          >
            <div className={`flex h-14 w-14 items-center justify-center rounded-xl ${link.color}`}>
              <link.icon className="h-7 w-7 text-white" />
            </div>
            <span className="text-sm font-semibold">{link.label}</span>
          </button>
        ))}
      </div>

      <div className="rounded-2xl border bg-card p-4 space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Сегодня</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-accent p-3">
            <p className="text-2xl font-bold">0 ₽</p>
            <p className="text-xs text-muted-foreground">Выручка</p>
          </div>
          <div className="rounded-xl bg-accent p-3">
            <p className="text-2xl font-bold">0</p>
            <p className="text-xs text-muted-foreground">Продажи</p>
          </div>
          <div className="rounded-xl bg-accent p-3">
            <p className="text-2xl font-bold">0</p>
            <p className="text-xs text-muted-foreground">На складе</p>
          </div>
          <div className="rounded-xl bg-accent p-3">
            <p className="text-2xl font-bold">0 ₽</p>
            <p className="text-xs text-muted-foreground">Наличные</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TmaHomePage;
