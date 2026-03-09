import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardLayout from "./components/DashboardLayout";
import DashboardHome from "./pages/dashboard/DashboardHome";
import InventoryPage from "./pages/dashboard/InventoryPage";
import SalesPage from "./pages/dashboard/SalesPage";
import BuybackPage from "./pages/dashboard/BuybackPage";
import CustomersPage from "./pages/dashboard/CustomersPage";
import AccessoriesPage from "./pages/dashboard/AccessoriesPage";
import RepairsPage from "./pages/dashboard/RepairsPage";
import PriceTagsPage from "./pages/dashboard/PriceTagsPage";
import MonitoringPage from "./pages/dashboard/MonitoringPage";
import ListingsPage from "./pages/dashboard/ListingsPage";
import FinancesPage from "./pages/dashboard/FinancesPage";
import EmployeesPage from "./pages/dashboard/EmployeesPage";
import ShiftsPage from "./pages/dashboard/ShiftsPage";
import SettingsPage from "./pages/dashboard/SettingsPage";
import SupportPage from "./pages/dashboard/SupportPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
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
              <Route path="accessories" element={<AccessoriesPage />} />
              <Route path="repairs" element={<RepairsPage />} />
              <Route path="price-tags" element={<PriceTagsPage />} />
              <Route path="monitoring" element={<MonitoringPage />} />
              <Route path="listings" element={<ListingsPage />} />
              <Route path="finances" element={<FinancesPage />} />
              <Route path="employees" element={<EmployeesPage />} />
              <Route path="shifts" element={<ShiftsPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="support" element={<SupportPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
