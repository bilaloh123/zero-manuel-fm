import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import OfflineBanner from "./OfflineBanner";
import { AlertsProvider } from "../../context/AlertsContext";
import { NotificationsProvider } from "../../context/NotificationsContext";

export default function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Closes the mobile drawer automatically whenever navigation happens,
  // regardless of which NavLink (top-level or inside a NavSection) fired it.
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <AlertsProvider>
      <NotificationsProvider>
        <div className="flex h-screen w-full overflow-hidden bg-cream">
          <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <div className="flex min-w-0 flex-1 flex-col">
            <OfflineBanner />
            <Topbar onOpenSidebar={() => setSidebarOpen(true)} />
            <main className="flex-1 overflow-y-auto p-6">
              <Outlet />
            </main>
          </div>
        </div>
      </NotificationsProvider>
    </AlertsProvider>
  );
}
