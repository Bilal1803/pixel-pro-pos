import { Navigate, Outlet, NavLink, useLocation } from "react-router-dom";
import { usePlatformAdmin } from "@/hooks/usePlatformAdmin";
import { useAuth } from "@/contexts/AuthContext";
import { Shield, Image, Building2, Users, CreditCard, ArrowLeft } from "lucide-react";

const navItems = [
  { to: "/admin/stories", label: "Stories", icon: Image },
  { to: "/admin/companies", label: "Компании", icon: Building2 },
  { to: "/admin/users", label: "Пользователи", icon: Users },
  { to: "/admin/subscriptions", label: "Подписки", icon: CreditCard },
];

const AdminLayout = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isLoading } = usePlatformAdmin();
  const location = useLocation();

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Загрузка...</div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex min-h-screen">
      <aside className="flex h-screen w-64 flex-col border-r bg-card">
        <div className="flex h-16 items-center gap-2 border-b px-6">
          <Shield className="h-6 w-6 text-destructive" />
          <span className="text-lg font-bold">Админ-панель</span>
        </div>
        <nav className="flex-1 overflow-y-auto p-3">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname.startsWith(item.to);
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-destructive/10 text-destructive"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="border-t p-3">
          <NavLink
            to="/dashboard"
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Вернуться в CRM
          </NavLink>
        </div>
      </aside>
      <div className="flex-1 overflow-auto">
        <header className="sticky top-0 z-40 flex h-16 items-center border-b bg-background/95 backdrop-blur px-6">
          <h2 className="text-lg font-semibold text-foreground">Администрирование платформы</h2>
        </header>
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
