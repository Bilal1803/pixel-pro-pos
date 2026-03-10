import { useEffect, useState } from "react";
import { useLocation, useNavigate, Outlet } from "react-router-dom";
import { Home, Smartphone, ShoppingCart, DollarSign, Clock, MoreHorizontal, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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
  const { user, loading: authLoading } = useAuth();
  const [tmaAuthLoading, setTmaAuthLoading] = useState(false);
  const [tmaAuthError, setTmaAuthError] = useState("");

  // Init Telegram WebApp + auto-auth
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      if (tg.themeParams?.bg_color) {
        document.documentElement.style.setProperty("--background", tg.themeParams.bg_color);
      }
    }
  }, []);

  // Auto-authenticate via Telegram ID if not already logged in
  useEffect(() => {
    if (authLoading) return; // Wait for auth check to finish
    if (user) return; // Already logged in

    const tg = (window as any).Telegram?.WebApp;
    const telegramId = tg?.initDataUnsafe?.user?.id;
    const initData = tg?.initData;

    if (!telegramId) return; // Not in Telegram context

    const autoAuth = async () => {
      setTmaAuthLoading(true);
      setTmaAuthError("");

      try {
        const { data, error } = await supabase.functions.invoke("tma-auth", {
          body: { initData: initData || null, telegramId },
        });

        if (error) throw error;

        if (data.error === "not_found") {
          setTmaAuthError("Аккаунт не найден. Попросите владельца отправить ссылку приглашения.");
          return;
        }

        if (data.error) throw new Error(data.error);

        if (data.session) {
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

  const isActive = (item: typeof tmaNavItems[0]) => {
    if (item.exact) return location.pathname === item.to;
    return location.pathname.startsWith(item.to);
  };

  // Show loading while checking auth or performing TMA auth
  if (authLoading || tmaAuthLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground text-sm">Авторизация...</p>
        </div>
      </div>
    );
  }

  // Show error if TMA auth failed and no user
  if (!user && tmaAuthError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="text-center space-y-4 max-w-sm">
          <p className="text-lg font-semibold text-destructive">Не удалось войти</p>
          <p className="text-muted-foreground text-sm">{tmaAuthError}</p>
        </div>
      </div>
    );
  }

  // If no user and no Telegram context, prompt login
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="text-center space-y-4 max-w-sm">
          <p className="text-lg font-semibold">Требуется авторизация</p>
          <p className="text-muted-foreground text-sm">
            Откройте приложение через Telegram или используйте ссылку приглашения.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <main className="flex-1 overflow-y-auto p-4 pb-24">
        <Outlet />
      </main>

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
