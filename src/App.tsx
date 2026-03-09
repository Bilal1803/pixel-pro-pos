import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardLayout from "./components/DashboardLayout";
import DashboardHome from "./pages/dashboard/DashboardHome";
import InventoryPage from "./pages/dashboard/InventoryPage";
import SalesPage from "./pages/dashboard/SalesPage";
import BuybackPage from "./pages/dashboard/BuybackPage";
import CustomersPage from "./pages/dashboard/CustomersPage";
import FinancesPage from "./pages/dashboard/FinancesPage";
import EmployeesPage from "./pages/dashboard/EmployeesPage";
import ShiftsPage from "./pages/dashboard/ShiftsPage";
import PlaceholderPage from "./pages/dashboard/PlaceholderPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<DashboardHome />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="sales" element={<SalesPage />} />
            <Route path="buyback" element={<BuybackPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="accessories" element={<PlaceholderPage title="Аксессуары" />} />
            <Route path="repairs" element={<PlaceholderPage title="Ремонт" />} />
            <Route path="price-tags" element={<PlaceholderPage title="Ценники" />} />
            <Route path="monitoring" element={<PlaceholderPage title="Мониторинг цен" />} />
            <Route path="listings" element={<PlaceholderPage title="Объявления" />} />
            <Route path="finances" element={<FinancesPage />} />
            <Route path="employees" element={<EmployeesPage />} />
            <Route path="shifts" element={<ShiftsPage />} />
            <Route path="settings" element={<PlaceholderPage title="Настройки" />} />
            <Route path="support" element={<PlaceholderPage title="Поддержка" />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
