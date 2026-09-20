import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import { supabase } from "../../lib/supabaseClient";

const DECISION_BADGE = {
  approved: "bg-brand-100 text-brand-700",
  rejected: "bg-red-100 text-red-700",
  returned_for_correction: "bg-amber-100 text-amber-700",
};

export default function DecisionHistoryModal({ open, request, onClose }) {
  const { t } = useTranslation();
  const [decisions, setDecisions] = useState(null);

  useEffect(() => {
    supabase
      .from("approval_decisions")
      .select("id, step_order, decision, decided_at, comment, app_users:approver_id(full_name)")
      .eq("approval_request_id", request.id)
      .order("decided_at", { ascending: true })
      .then(({ data }) => setDecisions(data || []));
  }, [request.id]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("approvalRequests.history.title")}
      footer={
        <Button variant="secondary" onClick={onClose}>
          {t("common.cancel")}
        </Button>
      }
    >
      {decisions === null ? (
        <p className="py-4 text-center text-sm text-ink-muted">{t("common.loading")}</p>
      ) : decisions.length === 0 ? (
        <p className="py-4 text-center text-sm text-ink-muted">{t("approvalRequests.history.noDecisions")}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {decisions.map((d) => (
            <li key={d.id} className="rounded-control border border-border px-3 py-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-ink">{d.app_users?.full_name || "—"}</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${DECISION_BADGE[d.decision]}`}>
                  {t(`approvalRequests.decisions.${d.decision}`)}
                </span>
              </div>
              <p className="text-xs text-ink-muted">
                {t("approvalRequests.history.step", { step: d.step_order })} — {new Date(d.decided_at).toLocaleString()}
              </p>
              {d.comment && <p className="mt-1 text-sm text-ink">{d.comment}</p>}
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
