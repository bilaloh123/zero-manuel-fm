import { useTranslation } from "react-i18next";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function AccessBlockedPage({ reason }) {
  const { t } = useTranslation();
  const { signOut } = useAuth();

  const message = reason === "noFarmAccess" ? t("auth.noFarmAccess") : t("auth.noProfile");

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4">
      <div className="w-full max-w-sm rounded-card bg-white p-8 text-center shadow-card">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-cream-soft">
          <ShieldAlert className="h-6 w-6 text-ink-faint" />
        </div>
        <p className="mb-6 text-sm text-ink-muted">{message}</p>
        <button
          type="button"
          onClick={signOut}
          className="rounded-control bg-sidebar px-4 py-2 text-sm font-semibold text-white hover:bg-sidebar-dark"
        >
          {t("common.logout")}
        </button>
      </div>
    </div>
  );
}
