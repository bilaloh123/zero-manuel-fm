import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import FormField, { inputClass } from "../ui/FormField";
import { supabase } from "../../lib/supabaseClient";

export default function MoveToColdStorageModal({ open, pallet, onClose, onMoved }) {
  const { t } = useTranslation();
  const [units, setUnits] = useState([]);
  const [unitId, setUnitId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    supabase
      .from("cold_storage_units")
      .select("id, name, active")
      .eq("farm_id", pallet.farm_id)
      .eq("active", true)
      .then(({ data }) => setUnits(data || []));
  }, [pallet.farm_id]);

  const handleConfirm = async () => {
    setSaving(true);
    setError(null);
    try {
      const { error: rpcError } = await supabase.rpc("move_pallet_to_cold_storage", {
        p_pallet_id: pallet.id,
        p_cold_storage_unit_id: unitId,
      });
      if (rpcError) throw rpcError;
      onMoved();
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
      title={t("pallets.moveDialog.title")}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleConfirm} disabled={saving || !unitId}>
            {t("pallets.moveDialog.confirm")}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <FormField label={t("pallets.moveDialog.unit")} htmlFor="unit_id">
          <select id="unit_id" value={unitId} onChange={(e) => setUnitId(e.target.value)} className={inputClass}>
            <option value="" disabled>
              {t("pallets.moveDialog.selectUnit")}
            </option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </FormField>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </Modal>
  );
}
