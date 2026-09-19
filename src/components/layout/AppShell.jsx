import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { AlertsProvider } from "../../context/AlertsContext";
import { NotificationsProvider } from "../../context/NotificationsContext";

export default function AppShell() {
  return (
    <AlertsProvider>
      <NotificationsProvider>
        <div className="flex h-screen w-full overflow-hidden bg-cream">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <Topbar />
            <main className="flex-1 overflow-y-auto p-6">
              <Outlet />
            </main>
          </div>
        </div>
      </NotificationsProvider>
    </AlertsProvider>
  );
}
