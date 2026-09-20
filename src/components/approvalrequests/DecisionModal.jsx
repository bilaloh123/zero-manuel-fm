import { useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import FormField, { inputClass } from "../ui/FormField";
import { supabase } from "../../lib/supabaseClient";

const DECISION_LABELS = {
  approved: "approveAction",
  rejected: "rejectAction",
  returned_for_correction: "returnAction",
};

export default function DecisionModal({ open, request, decision, onClose, onDecided }) {
  const { t } = useTranslation();
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleConfirm = async () => {
    setSaving(true);
    setError(null);
    try {
      const { error: rpcError } = await supabase.rpc("decide_approval_step", {
        p_request_id: request.id,
        p_decision: decision,
        p_comment: comment.trim() || null,
      });
      if (rpcError) throw rpcError;
      onDecided();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t(`approvalRequests.${DECISION_LABELS[decision]}`)}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button variant={decision === "rejected" ? "danger" : "primary"} onClick={handleConfirm} disabled={saving}>
            {t(`approvalRequests.${DECISION_LABELS[decision]}`)}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <FormField label={t("approvalRequests.comment")} htmlFor="comment">
          <textarea id="comment" rows={2} value={comment} onChange={(e) => setComment(e.target.value)} className={inputClass} />
        </FormField>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </Modal>
  );
}
