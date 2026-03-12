import { useEffect, useState, memo, useCallback } from "react";
import { useLocation, useNavigate, Outlet } from "react-router-dom";
import { Home, Smartphone, ShoppingCart, Banknote, Clock, MoreHorizontal, Loader2, HeadphonesIcon, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Drawer, DrawerContent } from "@/components/ui/drawer";

const tmaNavItems = [
  { to: "/tma", label: "Главная", icon: Home, exact: true },
  { to: "/tma/inventory", label: "Склад", icon: Smartphone },
  { to: "/tma/sales", label: "Продажи", icon: ShoppingCart },
  { to: "/tma/cash", label: "Касса", icon: Banknote },
  { to: "/tma/shift", label: "Смена", icon: Clock },
];

const moreMenuItems = [
  { to: "/tma", label: "Главная", icon: Home },
  { to: "/tma/inventory", label: "Склад", icon: Smartphone },
  { to: "/tma/sales", label: "Продажи", icon: ShoppingCart },
  { to: "/tma/cash", label: "Касса", icon: Banknote },
  { to: "/tma/shift", label: "Смена", icon: Clock },
  { to: "/tma/analytics", label: "Аналитика", icon: BarChart3 },
];

const TmaNavBar = memo(({ pathname, onNavigate, onMore, moreActive }: {
  pathname: string;
  onNavigate: (to: string) => void;
  onMore: () => void;
  moreActive: boolean;
}) => {
  const isActive = (item: typeof tmaNavItems[0]) =>
    item.exact ? pathname === item.to : pathname.startsWith(item.to);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100"
      style={{
        paddingBottom: "max(env(safe-area-inset-bottom, 0px), 8px)",
        boxShadow: "0 -1px 12px rgba(0,0,0,0.06)",
      }}
    >
      <div className="flex items-stretch">
        {tmaNavItems.map((item) => {
          const active = isActive(item);
          return (
            <button
              key={item.to}
              onClick={() => onNavigate(item.to)}
              className={cn(
                "relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2 min-h-[50px] transition-colors",
                active ? "text-blue-600" : "text-gray-400"
              )}
            >
              <item.icon className={cn("h-5 w-5", active && "scale-110")} strokeWidth={active ? 2.2 : 1.8} />
              <span className={cn("text-[10px] leading-tight", active ? "font-semibold" : "font-medium")}>
                {item.label}
              </span>
              {active && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-blue-600" />
              )}
            </button>
          );
        })}

        <button
          onClick={onMore}
          className={cn(
            "relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2 min-h-[50px] transition-colors",
            moreActive ? "text-blue-600" : "text-gray-400"
          )}
        >
          <MoreHorizontal className="h-5 w-5" strokeWidth={1.8} />
          <span className="text-[10px] leading-tight font-medium">Ещё</span>
        </button>
      </div>
    </nav>
  );
});

TmaNavBar.displayName = "TmaNavBar";

const TmaLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [tmaAuthLoading, setTmaAuthLoading] = useState(false);
  const [tmaAuthError, setTmaAuthError] = useState("");
  const [showNotFound, setShowNotFound] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  // Init Telegram WebApp
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      tg.setHeaderColor?.("#ffffff");
      tg.setBackgroundColor?.("#ffffff");
    }
  }, []);

  // Auto-authenticate via Telegram ID
  useEffect(() => {
    if (authLoading || user) return;

    const tg = (window as any).Telegram?.WebApp;
    const telegramId = tg?.initDataUnsafe?.user?.id ?? null;
    const initData = tg?.initData ?? null;

    if (!telegramId && !initData) return;

    const autoAuth = async () => {
      setTmaAuthLoading(true);
      setTmaAuthError("");
      setShowNotFound(false);

      try {
        const { data, error } = await supabase.functions.invoke("tma-auth", {
          body: { initData, telegramId: telegramId ? telegramId.toString() : null },
        });

        if (error) throw new Error("Ошибка подключения к серверу.");
        if (data?.error === "not_found") { setShowNotFound(true); return; }
        if (data?.error) throw new Error(data.error);
        if (data?.session) {
          await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          });
        }
      } catch (err: any) {
        setTmaAuthError(err.message || "Ошибка авторизации");
      } finally {
        setTmaAuthLoading(false);
      }
    };

    autoAuth();
  }, [authLoading, user]);

  const handleInviteSubmit = useCallback(async () => {
    if (!inviteCode.trim()) return;
    setInviteLoading(true);
    try {
      const tg = (window as any).Telegram?.WebApp;
      const telegramId = tg?.initDataUnsafe?.user?.id || null;

      const res = await supabase.functions.invoke("accept-invite", {
        body: { code: inviteCode.trim(), telegramId: telegramId?.toString() },
      });

      const data = res.data;
      if (data?.error) throw new Error(data.error);
      if (res.error && !data) throw res.error;

      if (data?.session) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      }
      toast({ title: "Добро пожаловать!", description: "Вы подключены к магазину." });
      setShowNotFound(false);
    } catch (err: any) {
      toast({ title: "Ошибка", description: err.message || "Не удалось активировать приглашение", variant: "destructive" });
    } finally {
      setInviteLoading(false);
    }
  }, [inviteCode, toast]);

  const handleNavigate = useCallback((to: string) => {
    navigate(to);
    setMoreOpen(false);
  }, [navigate]);

  // Close drawer on route change
  useEffect(() => { setMoreOpen(false); }, [location.pathname]);

  // Loading
  if (authLoading || tmaAuthLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
          <p className="text-gray-500 text-sm">Загрузка...</p>
        </div>
      </div>
    );
  }

  // Not found — invite code
  if (!user && showNotFound) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white p-5">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 space-y-5">
            <div className="text-center space-y-2">
              <div className="mx-auto h-14 w-14 rounded-full bg-blue-50 flex items-center justify-center">
                <Smartphone className="h-7 w-7 text-blue-600" />
              </div>
              <h1 className="text-lg font-bold text-gray-900">Подключение к магазину</h1>
              <p className="text-sm text-gray-500 leading-relaxed">
                Введите 6-значный код приглашения от владельца или менеджера
              </p>
            </div>

            <Input
              placeholder="000000"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              maxLength={6}
              className="h-14 text-center text-2xl tracking-[0.3em] font-bold rounded-xl border-gray-200 bg-gray-50 focus:bg-white"
              disabled={inviteLoading}
            />

            <Button
              onClick={handleInviteSubmit}
              disabled={inviteCode.trim().length < 6 || inviteLoading}
              className="w-full h-12 rounded-xl text-base font-semibold bg-blue-600 hover:bg-blue-700"
            >
              {inviteLoading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
              Подключиться
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Error
  if (!user && tmaAuthError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white p-5">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 text-center space-y-4 max-w-sm w-full">
          <div className="mx-auto h-14 w-14 rounded-full bg-red-50 flex items-center justify-center">
            <span className="text-2xl">⚠️</span>
          </div>
          <p className="text-lg font-bold text-gray-900">Не удалось войти</p>
          <p className="text-sm text-gray-500">{tmaAuthError}</p>
          <Button variant="outline" onClick={() => window.location.reload()} className="rounded-xl">
            Попробовать снова
          </Button>
        </div>
      </div>
    );
  }

  // No user / no Telegram
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white p-5">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 text-center space-y-4 max-w-sm w-full">
          <div className="mx-auto h-14 w-14 rounded-full bg-blue-50 flex items-center justify-center">
            <Smartphone className="h-7 w-7 text-blue-600" />
          </div>
          <p className="text-lg font-bold text-gray-900">FILTER CRM</p>
          <p className="text-sm text-gray-500">
            Откройте приложение через Telegram-бот @filtercrm_bot
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <main
        className="flex-1 overflow-y-auto"
        style={{ paddingBottom: "calc(max(env(safe-area-inset-bottom, 0px), 8px) + 58px)" }}
      >
        <div className="p-4">
          <Outlet />
        </div>
      </main>

      <TmaNavBar
        pathname={location.pathname}
        onNavigate={handleNavigate}
        onMore={() => setMoreOpen(true)}
        moreActive={moreOpen}
      />

      <Drawer open={moreOpen} onOpenChange={setMoreOpen}>
        <DrawerContent className="bg-white">
          <div className="px-4 pt-2 pb-6">
            <div className="mx-auto w-10 h-1 rounded-full bg-gray-200 mb-5" />

            {user && (
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <p className="font-semibold text-sm text-gray-900">{user.user_metadata?.full_name || "Сотрудник"}</p>
                <p className="text-xs text-gray-500 mt-0.5">{user.email}</p>
              </div>
            )}

            <div className="space-y-1">
              {moreMenuItems.map((item) => (
                <button
                  key={item.to + item.label}
                  onClick={() => handleNavigate(item.to)}
                  className="w-full flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                >
                  <item.icon className="h-5 w-5 text-gray-400" />
                  {item.label}
                </button>
              ))}
            </div>

            <div className="border-t border-gray-100 mt-3 pt-3">
              <button
                onClick={() => handleNavigate("/tma/support")}
                className="w-full flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-medium text-blue-600 hover:bg-blue-50 active:bg-blue-100 transition-colors"
              >
                <HeadphonesIcon className="h-5 w-5" />
                Поддержка
              </button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
};

export default TmaLayout;
