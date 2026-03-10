import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import DashboardSidebar from "@/components/DashboardSidebar";
import OnboardingTour from "@/components/OnboardingTour";
import NotificationBell from "@/components/NotificationBell";
import TrialPaywall from "@/components/TrialPaywall";
import { useSubscription } from "@/hooks/useSubscription";

const DashboardLayout = () => {
  const { user, loading } = useAuth();
  const { isTrialExpired, isLoading: subLoading } = useSubscription();
  const location = useLocation();

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

  // Allow access to pricing page even when trial expired
  const isPricingPage = location.pathname === "/dashboard/pricing";

  if (isTrialExpired && !isPricingPage) {
    return <TrialPaywall />;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <DashboardSidebar />
      <div className="flex-1 min-w-0 overflow-y-auto">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-background/95 backdrop-blur px-6">
          <h2 className="text-lg font-semibold text-foreground">Панель управления</h2>
          <NotificationBell />
        </header>
        <main className="p-6">
          <Outlet />
        </main>
      </div>
      <OnboardingTour />
    </div>
  );
};

export default DashboardLayout;
