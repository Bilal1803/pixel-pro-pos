import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import PlanGate from "@/components/PlanGate";
import { Loader2 } from "lucide-react";

// Eagerly loaded (auth & landing)
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import TermsPage from "./pages/TermsPage";
import PrivacyPage from "./pages/PrivacyPage";
import NotFound from "./pages/NotFound";

// Lazy-loaded layouts
const DashboardLayout = lazy(() => import("./components/DashboardLayout"));
const AdminLayout = lazy(() => import("./components/AdminLayout"));
const TmaLayout = lazy(() => import("./components/TmaLayout"));

// Lazy-loaded dashboard pages
const DashboardHome = lazy(() => import("./pages/dashboard/DashboardHome"));
const InventoryPage = lazy(() => import("./pages/dashboard/InventoryPage"));
const SalesPage = lazy(() => import("./pages/dashboard/SalesPage"));
const BuybackPage = lazy(() => import("./pages/dashboard/BuybackPage"));
const CustomersPage = lazy(() => import("./pages/dashboard/CustomersPage"));
const AccessoriesPage = lazy(() => import("./pages/dashboard/AccessoriesPage"));
const RepairsPage = lazy(() => import("./pages/dashboard/RepairsPage"));
const PriceTagsPage = lazy(() => import("./pages/dashboard/PriceTagsPage"));
const MonitoringPage = lazy(() => import("./pages/dashboard/MonitoringPage"));
const ListingsPage = lazy(() => import("./pages/dashboard/ListingsPage"));
const FinancesPage = lazy(() => import("./pages/dashboard/FinancesPage"));
const CashPage = lazy(() => import("./pages/dashboard/CashPage"));
const EmployeesPage = lazy(() => import("./pages/dashboard/EmployeesPage"));
const ShiftsPage = lazy(() => import("./pages/dashboard/ShiftsPage"));
const ReportsPage = lazy(() => import("./pages/dashboard/ReportsPage"));
const SettingsPage = lazy(() => import("./pages/dashboard/SettingsPage"));
const SupportPage = lazy(() => import("./pages/dashboard/SupportPage"));
const PricingPage = lazy(() => import("./pages/dashboard/PricingPage"));
const AIPage = lazy(() => import("./pages/dashboard/AIPage"));
const NetworkPage = lazy(() => import("./pages/dashboard/NetworkPage"));
const ComparisonPage = lazy(() => import("./pages/dashboard/ComparisonPage"));
const TransfersPage = lazy(() => import("./pages/dashboard/TransfersPage"));
const TasksPage = lazy(() => import("./pages/dashboard/TasksPage"));

// Lazy-loaded admin pages
const AdminDashboardPage = lazy(() => import("./pages/admin/AdminDashboardPage"));
const AdminStoriesPage = lazy(() => import("./pages/admin/AdminStoriesPage"));
const AdminCompaniesPage = lazy(() => import("./pages/admin/AdminCompaniesPage"));
const AdminUsersPage = lazy(() => import("./pages/admin/AdminUsersPage"));
const AdminSubscriptionsPage = lazy(() => import("./pages/admin/AdminSubscriptionsPage"));
const AdminFinancesPage = lazy(() => import("./pages/admin/AdminFinancesPage"));
const AdminSupportPage = lazy(() => import("./pages/admin/AdminSupportPage"));
const AdminAnalyticsPage = lazy(() => import("./pages/admin/AdminAnalyticsPage"));
const AdminSystemPage = lazy(() => import("./pages/admin/AdminSystemPage"));

// Lazy-loaded TMA pages
const TmaHomePage = lazy(() => import("./pages/tma/TmaHomePage"));
const TmaSalesPage = lazy(() => import("./pages/tma/TmaSalesPage"));
const TmaInventoryPage = lazy(() => import("./pages/tma/TmaInventoryPage"));
const TmaCashPage = lazy(() => import("./pages/tma/TmaCashPage"));
const TmaShiftPage = lazy(() => import("./pages/tma/TmaShiftPage"));
const TmaMorePage = lazy(() => import("./pages/tma/TmaMorePage"));
const TmaSupportPage = lazy(() => import("./pages/tma/TmaSupportPage"));
const TmaAnalyticsPage = lazy(() => import("./pages/tma/TmaAnalyticsPage"));
const TmaTasksPage = lazy(() => import("./pages/tma/TmaTasksPage"));

// Lazy-loaded misc pages
const InvitePage = lazy(() => import("./pages/InvitePage"));

// Lazy-loaded demo pages
const DemoLayout = lazy(() => import("./components/DemoLayout"));
const DemoDashboard = lazy(() => import("./pages/demo/DemoDashboard"));
const DemoInventory = lazy(() => import("./pages/demo/DemoInventory"));
const DemoSales = lazy(() => import("./pages/demo/DemoSales"));
const DemoCash = lazy(() => import("./pages/demo/DemoCash"));
const DemoFinances = lazy(() => import("./pages/demo/DemoFinances"));
const DemoTasks = lazy(() => import("./pages/demo/DemoTasks"));
const DemoPriceTags = lazy(() => import("./pages/demo/DemoPriceTags"));
const DemoListings = lazy(() => import("./pages/demo/DemoListings"));
const DemoBuyback = lazy(() => import("./pages/demo/DemoBuyback"));
const DemoCustomers = lazy(() => import("./pages/demo/DemoCustomers"));
const DemoAccessories = lazy(() => import("./pages/demo/DemoAccessories"));
const DemoRepairs = lazy(() => import("./pages/demo/DemoRepairs"));
const DemoMonitoring = lazy(() => import("./pages/demo/DemoMonitoring"));
const DemoEmployees = lazy(() => import("./pages/demo/DemoEmployees"));
const DemoShifts = lazy(() => import("./pages/demo/DemoShifts"));
const DemoReports = lazy(() => import("./pages/demo/DemoReports"));
const DemoAI = lazy(() => import("./pages/demo/DemoAI"));
const DemoSettings = lazy(() => import("./pages/demo/DemoSettings"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const PageLoader = () => (
  <div className="flex min-h-[50vh] items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/invite/:code" element={<InvitePage />} />
              <Route path="/demo" element={<DemoLayout />}>
                <Route index element={<DemoDashboard />} />
                <Route path="inventory" element={<DemoInventory />} />
                <Route path="sales" element={<DemoSales />} />
                <Route path="buyback" element={<DemoBuyback />} />
                <Route path="customers" element={<DemoCustomers />} />
                <Route path="accessories" element={<DemoAccessories />} />
                <Route path="repairs" element={<DemoRepairs />} />
                <Route path="cash" element={<DemoCash />} />
                <Route path="finances" element={<DemoFinances />} />
                <Route path="tasks" element={<DemoTasks />} />
                <Route path="price-tags" element={<DemoPriceTags />} />
                <Route path="listings" element={<DemoListings />} />
                <Route path="monitoring" element={<DemoMonitoring />} />
                <Route path="employees" element={<DemoEmployees />} />
                <Route path="shifts" element={<DemoShifts />} />
                <Route path="reports" element={<DemoReports />} />
                <Route path="ai" element={<DemoAI />} />
                <Route path="settings" element={<DemoSettings />} />
              </Route>
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
                <Route path="cash" element={<CashPage />} />
                <Route path="employees" element={<EmployeesPage />} />
                <Route path="shifts" element={<ShiftsPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="pricing" element={<PricingPage />} />
                <Route path="support" element={<SupportPage />} />
                <Route path="ai" element={<PlanGate feature="ai"><AIPage /></PlanGate>} />
                <Route path="network" element={<PlanGate feature="network"><NetworkPage /></PlanGate>} />
                <Route path="comparison" element={<PlanGate feature="comparison"><ComparisonPage /></PlanGate>} />
                <Route path="transfers" element={<PlanGate feature="transfers"><TransfersPage /></PlanGate>} />
                <Route path="tasks" element={<TasksPage />} />
              </Route>
              <Route path="/tma" element={<TmaLayout />}>
                <Route index element={<TmaHomePage />} />
                <Route path="sales" element={<TmaSalesPage />} />
                <Route path="inventory" element={<TmaInventoryPage />} />
                <Route path="cash" element={<TmaCashPage />} />
                <Route path="shift" element={<TmaShiftPage />} />
                <Route path="more" element={<TmaMorePage />} />
                <Route path="support" element={<TmaSupportPage />} />
                <Route path="analytics" element={<TmaAnalyticsPage />} />
                <Route path="tasks" element={<TmaTasksPage />} />
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
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
