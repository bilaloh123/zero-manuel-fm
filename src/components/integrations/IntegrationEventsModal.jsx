import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import { supabase } from "../../lib/supabaseClient";

const STATUS_BADGE = {
  success: "bg-brand-100 text-brand-700",
  failed: "bg-red-100 text-red-700",
  pending: "bg-amber-100 text-amber-700",
};

export default function IntegrationEventsModal({ open, integration, onClose }) {
  const { t } = useTranslation();
  const [events, setEvents] = useState(null);

  useEffect(() => {
    supabase
      .from("integration_events")
      .select("id, direction, event_type, status, error_message, occurred_at")
      .eq("integration_id", integration.id)
      .order("occurred_at", { ascending: false })
      .limit(50)
      .then(({ data }) => setEvents(data || []));
  }, [integration.id]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("integrations.events.title", { name: integration.provider_name })}
      footer={
        <Button variant="secondary" onClick={onClose}>
          {t("common.cancel")}
        </Button>
      }
    >
      {events === null ? (
        <p className="py-4 text-center text-sm text-ink-muted">{t("common.loading")}</p>
      ) : events.length === 0 ? (
        <p className="py-4 text-center text-sm text-ink-muted">{t("integrations.events.noEvents")}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {events.map((ev) => (
            <li key={ev.id} className="rounded-control border border-border px-3 py-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium text-ink">{ev.event_type}</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[ev.status]}`}>
                  {t(`integrations.events.status.${ev.status}`)}
                </span>
              </div>
              <p className="text-xs text-ink-muted">
                {t(`integrations.events.direction.${ev.direction}`)} — {new Date(ev.occurred_at).toLocaleString()}
              </p>
              {ev.error_message && <p className="mt-1 text-xs text-red-600">{ev.error_message}</p>}
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
