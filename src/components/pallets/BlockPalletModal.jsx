import { useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import FormField, { inputClass } from "../ui/FormField";
import { supabase } from "../../lib/supabaseClient";

export default function BlockPalletModal({ open, pallet, onClose, onBlocked }) {
  const { t } = useTranslation();
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleConfirm = async () => {
    setSaving(true);
    setError(null);
    try {
      const { error: rpcError } = await supabase.rpc("block_pallet", { p_pallet_id: pallet.id, p_reason: reason.trim() });
      if (rpcError) throw rpcError;
      onBlocked();
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
      title={t("pallets.blockDialog.title")}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button variant="danger" onClick={handleConfirm} disabled={saving || !reason.trim()}>
            {t("pallets.blockAction")}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <FormField label={t("pallets.blockDialog.reason")} htmlFor="reason">
          <textarea id="reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} className={inputClass} />
        </FormField>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </Modal>
  );
}
