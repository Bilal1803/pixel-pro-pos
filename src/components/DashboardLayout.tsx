import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import DashboardSidebar from "@/components/DashboardSidebar";
import MobileBottomNav from "@/components/MobileBottomNav";
import OnboardingTour from "@/components/OnboardingTour";
import NotificationBell from "@/components/NotificationBell";
import StoreSelector from "@/components/StoreSelector";
import TrialPaywall from "@/components/TrialPaywall";
import { useSubscription } from "@/hooks/useSubscription";
import { useIsMobile } from "@/hooks/use-mobile";
import { StoreProvider } from "@/contexts/StoreContext";

const DashboardContent = () => {
  const { user, loading } = useAuth();
  const { isTrialExpired, isLoading: subLoading, subscription } = useSubscription();
  const location = useLocation();
  const isMobile = useIsMobile();
  const isPremier = subscription.plan === "premier";

  if (loading || subLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Загрузка...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const isPricingPage = location.pathname === "/dashboard/pricing";

  if (isTrialExpired && !isPricingPage) {
    return <TrialPaywall />;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {!isMobile && <DashboardSidebar />}

      <div className="flex-1 min-w-0 overflow-y-auto">
        <header className="sticky top-0 z-40 flex h-14 md:h-16 items-center justify-between border-b bg-background/95 backdrop-blur px-4 md:px-6 gap-3">
          <h2 className="text-base md:text-lg font-semibold text-foreground truncate">Панель управления</h2>
          <div className="flex items-center gap-2">
            {isPremier && <StoreSelector />}
            <NotificationBell />
          </div>
        </header>
        <main className={`p-3 md:p-6 ${isMobile ? "pb-28" : ""}`} style={isMobile ? { paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 7rem)" } : undefined}>
          <Outlet />
        </main>
      </div>

      {isMobile && <MobileBottomNav />}

      <OnboardingTour />
    </div>
  );
};

const DashboardLayout = () => {
  return (
    <StoreProvider>
      <DashboardContent />
    </StoreProvider>
  );
};

export default DashboardLayout;
