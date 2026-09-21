import { useTranslation } from "react-i18next";
import { useRegisterSW } from "virtual:pwa-register/react";
import { RefreshCw, X } from "lucide-react";

export default function PwaUpdatePrompt() {
  const { t } = useTranslation();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  // updateServiceWorker(true) only sends the SKIP_WAITING message — the
  // actual reload-after-activation in vite-plugin-pwa's own code is gated
  // on workbox-window's internal isUpdate bookkeeping, which (verified via
  // a real two-build test) does not reliably fire here. The native
  // controllerchange event does fire reliably once the new worker takes
  // over, so the reload is wired to that directly instead of trusting the
  // library's default. Only attached on click (never on mount), so a
  // fresh install's first-ever controllerchange never triggers an
  // unwanted reload.
  const handleReload = () => {
    navigator.serviceWorker.addEventListener("controllerchange", () => window.location.reload(), { once: true });
    updateServiceWorker(true);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] flex justify-center p-4">
      <div className="flex items-center gap-3 rounded-card bg-sidebar px-4 py-3 text-sm text-white shadow-card">
        <span>{t("pwa.updateAvailable")}</span>
        <button
          type="button"
          onClick={handleReload}
          className="flex items-center gap-1.5 rounded-control bg-white/10 px-3 py-1.5 font-medium hover:bg-white/20"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {t("pwa.reload")}
        </button>
        <button
          type="button"
          onClick={() => setNeedRefresh(false)}
          className="flex h-7 w-7 items-center justify-center rounded-control hover:bg-white/10"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
