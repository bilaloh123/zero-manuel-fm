import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { FiltersProvider } from "./context/FiltersContext";
import AppShell from "./components/layout/AppShell";
import LoginPage from "./pages/LoginPage";
import AccessBlockedPage from "./pages/AccessBlockedPage";
import DashboardPage from "./pages/DashboardPage";
import PlaceholderPage from "./pages/PlaceholderPage";
import FarmsPage from "./pages/FarmsPage";
import SitesPage from "./pages/SitesPage";
import ParcelsPage from "./pages/ParcelsPage";
import CropsPage from "./pages/CropsPage";
import VarietiesPage from "./pages/VarietiesPage";
import SeasonsPage from "./pages/SeasonsPage";
import CropCyclesPage from "./pages/CropCyclesPage";
import EmployeesPage from "./pages/EmployeesPage";
import TeamsPage from "./pages/TeamsPage";
import AttendancePage from "./pages/AttendancePage";
import PayrollPage from "./pages/PayrollPage";
import ProductsPage from "./pages/ProductsPage";
import WarehousesPage from "./pages/WarehousesPage";
import StockMovementsPage from "./pages/StockMovementsPage";
import StockBalancesPage from "./pages/StockBalancesPage";
import SuppliersPage from "./pages/SuppliersPage";
import PurchaseRequestsPage from "./pages/PurchaseRequestsPage";
import PurchaseOrdersPage from "./pages/PurchaseOrdersPage";
import ReceptionsPage from "./pages/ReceptionsPage";
import InvoicesPage from "./pages/InvoicesPage";
import HarvestPlansPage from "./pages/HarvestPlansPage";
import HarvestSessionsPage from "./pages/HarvestSessionsPage";
import LotsPage from "./pages/LotsPage";
import VehiclesPage from "./pages/VehiclesPage";
import DriversPage from "./pages/DriversPage";
import WeighingTicketsPage from "./pages/WeighingTicketsPage";
import TransportMissionsPage from "./pages/TransportMissionsPage";
import EquipmentPage from "./pages/EquipmentPage";
import MaintenanceRecordsPage from "./pages/MaintenanceRecordsPage";
import FuelLogsPage from "./pages/FuelLogsPage";
import QualityChecksPage from "./pages/QualityChecksPage";
import ExpensesPage from "./pages/ExpensesPage";
import CustomersPage from "./pages/CustomersPage";
import QuotesPage from "./pages/QuotesPage";
import SalesPage from "./pages/SalesPage";
import ProfitabilityPage from "./pages/ProfitabilityPage";
import AlertsPage from "./pages/AlertsPage";
import ReportsPage from "./pages/ReportsPage";
import NotificationsPage from "./pages/NotificationsPage";
import GroupsPage from "./pages/GroupsPage";
import TransfersPage from "./pages/TransfersPage";
import RolesPage from "./pages/RolesPage";
import UsersPage from "./pages/UsersPage";
import AuditLogPage from "./pages/AuditLogPage";
import PeriodLocksPage from "./pages/PeriodLocksPage";
import ImportPage from "./pages/ImportPage";
import { navSections } from "./routes/navConfig";

const PAGE_OVERRIDES = {
  farms: FarmsPage,
  sites: SitesPage,
  parcels: ParcelsPage,
  crops: CropsPage,
  varieties: VarietiesPage,
  seasons: SeasonsPage,
  cropCycles: CropCyclesPage,
  employees: EmployeesPage,
  teams: TeamsPage,
  attendance: AttendancePage,
  payroll: PayrollPage,
  products: ProductsPage,
  warehouses: WarehousesPage,
  stockMovements: StockMovementsPage,
  stockBalances: StockBalancesPage,
  suppliers: SuppliersPage,
  purchaseRequests: PurchaseRequestsPage,
  purchaseOrders: PurchaseOrdersPage,
  receptions: ReceptionsPage,
  invoices: InvoicesPage,
  harvestPlans: HarvestPlansPage,
  harvestSessions: HarvestSessionsPage,
  lots: LotsPage,
  vehicles: VehiclesPage,
  drivers: DriversPage,
  weighingTickets: WeighingTicketsPage,
  transportMissions: TransportMissionsPage,
  equipment: EquipmentPage,
  maintenance: MaintenanceRecordsPage,
  fuelLogs: FuelLogsPage,
  qualityChecks: QualityChecksPage,
  expenses: ExpensesPage,
  customers: CustomersPage,
  quotes: QuotesPage,
  sales: SalesPage,
  profitability: ProfitabilityPage,
  groups: GroupsPage,
  transfers: TransfersPage,
  roles: RolesPage,
  users: UsersPage,
  auditLog: AuditLogPage,
  periodLocks: PeriodLocksPage,
  importData: ImportPage,
};

function FullScreenLoader() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream">
      <p className="text-sm text-ink-muted">{t("common.loading")}</p>
    </div>
  );
}

function Gate() {
  const { authLoading, isAuthenticated, profileLoading, appUser, isSuperAdmin, farmAccess, profileError } =
    useAuth();

  if (authLoading) return <FullScreenLoader />;
  if (!isAuthenticated) return <LoginPage />;
  if (profileLoading) return <FullScreenLoader />;
  if (profileError || !appUser) return <AccessBlockedPage reason="noProfile" />;
  if (!isSuperAdmin && farmAccess.length === 0) return <AccessBlockedPage reason="noFarmAccess" />;

  return (
    <FiltersProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="alerts" element={<AlertsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          {navSections.flatMap((section) =>
            section.items.map((item) => {
              const Override = PAGE_OVERRIDES[item.key];
              return (
                <Route
                  key={item.path}
                  path={item.path.slice(1)}
                  element={Override ? <Override /> : <PlaceholderPage titleKey={`nav.items.${item.key}`} />}
                />
              );
            })
          )}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </FiltersProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Gate />
      </AuthProvider>
    </BrowserRouter>
  );
}
