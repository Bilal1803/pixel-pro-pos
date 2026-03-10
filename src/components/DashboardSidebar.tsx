import { NavLink as RouterNavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Smartphone, ShoppingCart, ArrowDownUp, Users,
  Headphones, Wrench, Tag, TrendingUp, Megaphone, DollarSign,
  UserCog, Clock, FileBarChart, Settings, HelpCircle, LogOut, CreditCard, Shield, Lock,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePlatformAdmin } from "@/hooks/usePlatformAdmin";
import { useSubscription } from "@/hooks/useSubscription";

const navItems = [
  { to: "/dashboard", label: "Дашборд", icon: LayoutDashboard },
  { to: "/dashboard/inventory", label: "Склад", icon: Smartphone },
  { to: "/dashboard/sales", label: "Продажи", icon: ShoppingCart },
  { to: "/dashboard/buyback", label: "Скупка", icon: ArrowDownUp },
  { to: "/dashboard/customers", label: "Клиенты", icon: Users },
  { to: "/dashboard/accessories", label: "Аксессуары", icon: Headphones },
  { to: "/dashboard/repairs", label: "Ремонт", icon: Wrench, requiredPlan: ["business", "premier"] },
  { to: "/dashboard/price-tags", label: "Ценники", icon: Tag },
  { to: "/dashboard/monitoring", label: "Мониторинг цен", icon: TrendingUp, requiredPlan: ["business", "premier"] },
  { to: "/dashboard/listings", label: "Объявления", icon: Megaphone, requiredPlan: ["business", "premier"] },
  { to: "/dashboard/finances", label: "Финансы", icon: DollarSign },
  { to: "/dashboard/employees", label: "Сотрудники", icon: UserCog },
  { to: "/dashboard/shifts", label: "Смены", icon: Clock },
  { to: "/dashboard/reports", label: "Отчёты", icon: FileBarChart },
  { to: "/dashboard/settings", label: "Настройки", icon: Settings },
  { to: "/dashboard/pricing", label: "Тарифы", icon: CreditCard },
  { to: "/dashboard/support", label: "Поддержка", icon: HelpCircle },
];

const DashboardSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { isAdmin } = usePlatformAdmin();
  const { subscription } = useSubscription();

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r bg-card">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <Smartphone className="h-6 w-6 text-primary" />
        <span className="text-lg font-bold">PhoneCRM</span>
      </div>
      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = item.to === "/dashboard"
              ? location.pathname === "/dashboard"
              : location.pathname.startsWith(item.to);
            const isLocked = item.requiredPlan && !item.requiredPlan.includes(subscription.plan);
            return (
              <li key={item.to}>
                <RouterNavLink
                  to={item.to}
                  className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : isLocked
                        ? "text-muted-foreground/50 hover:bg-accent/50"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  <span className="flex-1">{item.label}</span>
                  {isLocked && <Lock className="h-3.5 w-3.5 text-muted-foreground/40" />}
                </RouterNavLink>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="border-t p-3 space-y-1">
        {isAdmin && (
          <RouterNavLink
            to="/admin"
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10"
          >
            <Shield className="h-4 w-4" />
            Админ-панель
          </RouterNavLink>
        )}
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        >
          <LogOut className="h-4 w-4" />
          Выйти
        </button>
      </div>
    </aside>
  );
};

export default DashboardSidebar;
