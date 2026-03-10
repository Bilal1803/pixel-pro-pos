import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import PlanGate from "@/components/PlanGate";
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
import ReportsPage from "./pages/dashboard/ReportsPage";
import SettingsPage from "./pages/dashboard/SettingsPage";
import SupportPage from "./pages/dashboard/SupportPage";
import PricingPage from "./pages/dashboard/PricingPage";
import AIPage from "./pages/dashboard/AIPage";
import AdminLayout from "./components/AdminLayout";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import AdminStoriesPage from "./pages/admin/AdminStoriesPage";
import AdminCompaniesPage from "./pages/admin/AdminCompaniesPage";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AdminSubscriptionsPage from "./pages/admin/AdminSubscriptionsPage";
import AdminFinancesPage from "./pages/admin/AdminFinancesPage";
import AdminSupportPage from "./pages/admin/AdminSupportPage";
import AdminAnalyticsPage from "./pages/admin/AdminAnalyticsPage";
import AdminSystemPage from "./pages/admin/AdminSystemPage";
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
              <Route path="repairs" element={<PlanGate feature="repairs"><RepairsPage /></PlanGate>} />
              <Route path="price-tags" element={<PriceTagsPage />} />
              <Route path="monitoring" element={<PlanGate feature="monitoring"><MonitoringPage /></PlanGate>} />
              <Route path="listings" element={<PlanGate feature="listings"><ListingsPage /></PlanGate>} />
              <Route path="finances" element={<FinancesPage />} />
              <Route path="employees" element={<EmployeesPage />} />
              <Route path="shifts" element={<ShiftsPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="pricing" element={<PricingPage />} />
              <Route path="support" element={<SupportPage />} />
              <Route path="ai" element={<PlanGate feature="ai"><AIPage /></PlanGate>} />
            </Route>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboardPage />} />
              <Route path="companies" element={<AdminCompaniesPage />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="subscriptions" element={<AdminSubscriptionsPage />} />
              <Route path="finances" element={<AdminFinancesPage />} />
              <Route path="stories" element={<AdminStoriesPage />} />
              <Route path="support" element={<AdminSupportPage />} />
              <Route path="analytics" element={<AdminAnalyticsPage />} />
              <Route path="system" element={<AdminSystemPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
