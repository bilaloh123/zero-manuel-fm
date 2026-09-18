import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";

const WARNING_DAYS = 30;

function expiryStatus(dateStr, t) {
  if (!dateStr) return null;
  const days = Math.floor((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
  if (days < 0) return { label: t("common.expired"), className: "bg-red-100 text-red-700" };
  if (days <= WARNING_DAYS) return { label: t("common.expiring"), className: "bg-amber-100 text-amber-700" };
  return null;
}

export default function ExpiryCell({ date }) {
  const { t } = useTranslation();
  const warning = expiryStatus(date, t);
  return (
    <div className="flex flex-col gap-1">
      <span className="text-ink-muted">{date || "—"}</span>
      {warning && (
        <span className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${warning.className}`}>
          <AlertTriangle className="h-3 w-3" />
          {warning.label}
        </span>
      )}
    </div>
  );
}
