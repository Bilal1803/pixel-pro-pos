import { Navigate, Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import { usePlatformAdmin, PlatformAdminRole } from "@/hooks/usePlatformAdmin";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState, useEffect } from "react";
import {
  Shield, Image, Building2, Users, CreditCard, ArrowLeft,
  LayoutDashboard, DollarSign, HeadphonesIcon, BarChart3, Settings2,
  MoreHorizontal,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<any>;
  exact?: boolean;
  roles: PlatformAdminRole[];
};

const navItems: NavItem[] = [
  { to: "/admin", label: "Дашборд", icon: LayoutDashboard, exact: true, roles: ["full_admin", "manager"] },
  { to: "/admin/companies", label: "Компании", icon: Building2, roles: ["full_admin", "manager", "support"] },
  { to: "/admin/users", label: "Пользователи", icon: Users, roles: ["full_admin", "manager", "support"] },
  { to: "/admin/subscriptions", label: "Подписки", icon: CreditCard, roles: ["full_admin", "manager"] },
  { to: "/admin/finances", label: "Финансы", icon: DollarSign, roles: ["full_admin", "manager"] },
  { to: "/admin/stories", label: "Stories", icon: Image, roles: ["full_admin"] },
  { to: "/admin/support", label: "Поддержка", icon: HeadphonesIcon, roles: ["full_admin", "manager", "support"] },
  { to: "/admin/analytics", label: "Аналитика", icon: BarChart3, roles: ["full_admin", "manager"] },
  { to: "/admin/system", label: "Система", icon: Settings2, roles: ["full_admin"] },
];

const roleLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  full_admin: { label: "Полный доступ", variant: "default" },
  manager: { label: "Менеджер", variant: "secondary" },
  support: { label: "Поддержка", variant: "outline" },
};

/* ── Mobile bottom nav items (first 4 visible) ── */
const mobileMainCount = 4;

const AdminMobileNav = ({ items }: { items: NavItem[] }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isActive = (item: NavItem) =>
    item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to) && item.to !== "/admin";

  const mainItems = items.slice(0, mobileMainCount);
  const moreItems = items.slice(mobileMainCount);
  const isInMore = moreItems.some((i) => isActive(i));

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
              {items.map((item) => {
                const active = isActive(item);
                return (
                  <button
                    key={item.to}
                    onClick={() => navigate(item.to)}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-xl p-4 min-h-[72px] transition-all duration-150 active:scale-95",
                      active ? "bg-destructive/10 text-destructive" : "text-muted-foreground hover:bg-accent"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="text-[11px] font-medium leading-tight text-center">{item.label}</span>
                  </button>
                );
              })}
            </div>

            <Separator className="my-4" />
            <button
              onClick={() => navigate("/dashboard")}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-accent transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              Вернуться в CRM
            </button>
          </div>
        </DrawerContent>
      </Drawer>

      <nav
        className="fixed bottom-0 left-0 right-0 z-[80] border-t bg-background shadow-[0_-2px_10px_rgba(0,0,0,0.08)] print:hidden"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 4px)" }}
      >
        <div className="flex items-stretch justify-around">
          {mainItems.map((item) => {
            const active = isActive(item);
            return (
              <button
                key={item.to}
                onClick={() => navigate(item.to)}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 min-h-[56px] py-2 transition-colors active:scale-95 transition-transform duration-150",
                  active ? "text-destructive" : "text-muted-foreground"
                )}
              >
                <item.icon className={cn("h-5 w-5 transition-transform duration-200", active && "scale-110")} />
                <span className={cn("text-[10px] leading-tight font-medium", active && "font-semibold")}>
                  {item.label}
                </span>
                {active && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-destructive animate-scale-in" />
                )}
              </button>
            );
          })}

          {moreItems.length > 0 && (
            <button
              onClick={() => setDrawerOpen(!drawerOpen)}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 min-h-[56px] py-2 transition-colors active:scale-95 transition-transform duration-150",
                isInMore || drawerOpen ? "text-destructive" : "text-muted-foreground"
              )}
            >
              <MoreHorizontal className="h-5 w-5" />
              <span className="text-[10px] leading-tight font-medium">Ещё</span>
              {isInMore && !drawerOpen && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-destructive" />
              )}
            </button>
          )}
        </div>
      </nav>
    </>
  );
};

const AdminLayout = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, adminRole, isLoading } = usePlatformAdmin();
  const location = useLocation();
  const isMobile = useIsMobile();

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

  const visibleNavItems = navItems.filter(item => adminRole && item.roles.includes(adminRole));
  const rl = adminRole ? roleLabels[adminRole] : null;

  const isActiveDesktop = (item: NavItem) =>
    item.exact
      ? location.pathname === item.to
      : location.pathname.startsWith(item.to) && item.to !== "/admin";

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      {!isMobile && (
        <aside className="flex h-screen w-64 flex-col border-r bg-card sticky top-0">
          <div className="flex h-16 items-center gap-2 border-b px-6">
            <Shield className="h-6 w-6 text-destructive" />
            <span className="text-lg font-bold">Админ-панель</span>
          </div>
          {rl && (
            <div className="px-6 py-2 border-b">
              <Badge variant={rl.variant} className="text-xs">{rl.label}</Badge>
            </div>
          )}
          <nav className="flex-1 overflow-y-auto p-3">
            <ul className="space-y-1">
              {visibleNavItems.map((item) => {
                const active = isActiveDesktop(item);
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.exact}
                      className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                        active
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
      )}

      {/* Main content */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        <header className="sticky top-0 z-40 flex h-14 md:h-16 items-center justify-between border-b bg-background/95 backdrop-blur px-4 md:px-6 gap-3">
          <div className="flex items-center gap-2">
            {isMobile && <Shield className="h-5 w-5 text-destructive" />}
            <h2 className="text-base md:text-lg font-semibold text-foreground truncate">
              {isMobile ? "Админ-панель" : "Администрирование платформы"}
            </h2>
          </div>
          {rl && isMobile && (
            <Badge variant={rl.variant} className="text-xs shrink-0">{rl.label}</Badge>
          )}
        </header>
        <main className={cn("p-3 md:p-6", isMobile && "pb-28")} style={isMobile ? { paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 7rem)" } : undefined}>
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      {isMobile && <AdminMobileNav items={visibleNavItems} adminRole={adminRole} />}
    </div>
  );
};

export default AdminLayout;
