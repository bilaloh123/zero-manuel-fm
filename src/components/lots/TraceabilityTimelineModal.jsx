import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Sprout, Truck, ShieldCheck, PackageCheck, Circle, Paperclip } from "lucide-react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import DocumentsModal from "../ui/DocumentsModal";
import { supabase } from "../../lib/supabaseClient";

const EVENT_ICONS = {
  harvest: Sprout,
  transport: Truck,
  quality_check: ShieldCheck,
  shipment: PackageCheck,
};

export default function TraceabilityTimelineModal({ open, lot, onClose }) {
  const { t } = useTranslation();
  const [events, setEvents] = useState(null);
  const [error, setError] = useState(null);
  const [documentsTarget, setDocumentsTarget] = useState(null);

  const loadEvents = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from("traceability_events")
      .select("id, event_type, occurred_at, location, photos, app_users:actor_id(full_name)")
      .eq("lot_id", lot.id)
      .order("occurred_at", { ascending: true });
    if (fetchError) {
      setError(fetchError.message);
      setEvents([]);
      return;
    }
    setEvents(data);
  }, [lot.id]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${t("traceability.title")} — ${lot.lot_code}`}
      footer={<Button onClick={onClose}>{t("common.confirm")}</Button>}
    >
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      {events === null ? (
        <p className="py-8 text-center text-sm text-ink-muted">{t("common.loading")}</p>
      ) : events.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-muted">{t("traceability.noEvents")}</p>
      ) : (
        <ol className="relative flex flex-col gap-6 ps-8">
          {events.map((event) => {
            const Icon = EVENT_ICONS[event.event_type] || Circle;
            return (
              <li key={event.id} className="relative">
                <span className="absolute -start-8 flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-brand-700 ring-4 ring-white">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="absolute -start-[19px] top-7 h-full w-px bg-border last:hidden" />
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-ink">
                    {t(`traceability.eventTypes.${event.event_type}`, event.event_type)}
                  </p>
                  <button
                    type="button"
                    onClick={() => setDocumentsTarget(event)}
                    className="flex h-6 w-6 items-center justify-center rounded-control text-ink-muted hover:bg-cream-soft"
                    title={t("documents.title")}
                  >
                    <Paperclip className="h-3.5 w-3.5" />
                    {(event.photos || []).length > 0 && (
                      <span className="ms-0.5 text-[10px] font-semibold text-brand-600">{event.photos.length}</span>
                    )}
                  </button>
                </div>
                <p className="text-xs text-ink-muted">{new Date(event.occurred_at).toLocaleString()}</p>
                {event.app_users?.full_name && (
                  <p className="text-xs text-ink-muted">{t("traceability.by", { name: event.app_users.full_name })}</p>
                )}
                {event.location && (
                  <p className="text-xs text-ink-muted">{t("traceability.location", { location: event.location })}</p>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {documentsTarget && (
        <DocumentsModal
          open
          table="traceability_events"
          record={documentsTarget}
          column="photos"
          mode="gallery"
          accept="image/jpeg,image/png,image/webp"
          title={t("documents.title")}
          onClose={() => {
            setDocumentsTarget(null);
            loadEvents();
          }}
        />
      )}
    </Modal>
  );
}
