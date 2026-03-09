import { NavLink as RouterNavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Smartphone, ShoppingCart, ArrowDownUp, Users,
  Headphones, Wrench, Tag, TrendingUp, Megaphone, DollarSign,
  UserCog, Clock, FileBarChart, Settings, HelpCircle, LogOut,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { to: "/dashboard", label: "Дашборд", icon: LayoutDashboard },
  { to: "/dashboard/inventory", label: "Склад", icon: Smartphone },
  { to: "/dashboard/sales", label: "Продажи", icon: ShoppingCart },
  { to: "/dashboard/buyback", label: "Скупка", icon: ArrowDownUp },
  { to: "/dashboard/customers", label: "Клиенты", icon: Users },
  { to: "/dashboard/accessories", label: "Аксессуары", icon: Headphones },
  { to: "/dashboard/repairs", label: "Ремонт", icon: Wrench },
  { to: "/dashboard/price-tags", label: "Ценники", icon: Tag },
  { to: "/dashboard/monitoring", label: "Мониторинг цен", icon: TrendingUp },
  { to: "/dashboard/listings", label: "Объявления", icon: Megaphone },
  { to: "/dashboard/finances", label: "Финансы", icon: DollarSign },
  { to: "/dashboard/employees", label: "Сотрудники", icon: UserCog },
  { to: "/dashboard/shifts", label: "Смены", icon: Clock },
  { to: "/dashboard/reports", label: "Отчёты", icon: FileBarChart },
  { to: "/dashboard/settings", label: "Настройки", icon: Settings },
  { to: "/dashboard/support", label: "Поддержка", icon: HelpCircle },
];

const DashboardSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-card">
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
            return (
              <li key={item.to}>
                <RouterNavLink
                  to={item.to}
                  className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </RouterNavLink>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="border-t p-3">
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
