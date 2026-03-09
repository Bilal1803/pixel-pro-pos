import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import DashboardSidebar from "@/components/DashboardSidebar";
import OnboardingTour from "@/components/OnboardingTour";

const DashboardLayout = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Загрузка...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex min-h-screen">
      <DashboardSidebar />
      <div className="flex-1 overflow-auto">
        <header className="sticky top-0 z-40 flex h-16 items-center border-b bg-background/95 backdrop-blur px-6">
          <h2 className="text-lg font-semibold text-foreground">Панель управления</h2>
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
