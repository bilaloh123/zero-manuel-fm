import { useTranslation } from "react-i18next";
import { Info, AlertTriangle, AlertOctagon, CheckCheck } from "lucide-react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";
import { useNotificationsContext } from "../context/NotificationsContext";
import { notificationMessage } from "../lib/notificationDisplay";

const SEVERITY_STYLE = {
  info: { badge: "bg-blue-100 text-blue-700", icon: Info },
  warning: { badge: "bg-amber-100 text-amber-700", icon: AlertTriangle },
  critical: { badge: "bg-red-100 text-red-700", icon: AlertOctagon },
};

export default function NotificationsPage() {
  const { t } = useTranslation();
  const { notifications, loading, unreadCount, markAsRead, markAllAsRead } = useNotificationsContext();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">{t("notifications.title")}</h1>
        <Button variant="secondary" onClick={markAllAsRead} disabled={unreadCount === 0}>
          <CheckCheck className="h-4 w-4" />
          {t("notifications.markAllRead")}
        </Button>
      </div>

      <Card>
        {loading ? (
          <p className="py-8 text-center text-sm text-ink-muted">{t("common.loading")}</p>
        ) : notifications.length === 0 ? (
          <EmptyState message={t("notifications.empty")} />
        ) : (
          <ul className="flex flex-col gap-2">
            {notifications.map((n) => {
              const style = SEVERITY_STYLE[n.severity] || SEVERITY_STYLE.info;
              const Icon = style.icon;
              return (
                <li
                  key={n.id}
                  className={`flex items-start gap-3 rounded-control border px-3 py-3 ${
                    n.is_read ? "border-border" : "border-brand-300 bg-brand-50/40"
                  }`}
                >
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${style.badge}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="flex flex-1 flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-ink">{t(`notifications.types.${n.type}`, n.type)}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${style.badge}`}>
                        {t(`notifications.severity.${n.severity}`)}
                      </span>
                      {n.farms?.name && <span className="text-xs text-ink-muted">— {n.farms.name}</span>}
                    </div>
                    <p className="text-sm text-ink-muted">{notificationMessage(n, t)}</p>
                    <p className="text-xs text-ink-muted">{new Date(n.created_at).toLocaleString()}</p>
                  </div>
                  {!n.is_read && (
                    <button
                      type="button"
                      onClick={() => markAsRead(n.id)}
                      className="shrink-0 rounded-control border border-border px-2.5 py-1 text-xs font-medium text-ink hover:bg-cream-soft"
                    >
                      {t("notifications.markRead")}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
