import { Outlet } from "react-router-dom";
import DashboardSidebar from "@/components/DashboardSidebar";

const DashboardLayout = () => {
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
    </div>
  );
};

export default DashboardLayout;
