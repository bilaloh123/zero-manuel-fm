import { useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import FormField, { inputClass } from "../ui/FormField";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { useFarmOptions } from "../../hooks/useFarmOptions";
import { useLotOptions } from "../../hooks/useLotOptions";

function emptyForm(defaultFarmId) {
  return {
    farm_id: defaultFarmId ?? "",
    lot_id: "",
    stage: "",
    notes: "",
    result: "pass",
    reject_reason: "",
  };
}

export default function QualityCheckFormModal({ open, defaultFarmId, onClose, onSaved }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { farms } = useFarmOptions();
  const [form, setForm] = useState(() => emptyForm(defaultFarmId));
  const { lots } = useLotOptions(form.farm_id);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const resetAndClose = () => {
    setForm(emptyForm(defaultFarmId));
    setError(null);
    onClose();
  };

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleFarmChange = (e) => {
    setForm((f) => ({ ...f, farm_id: e.target.value, lot_id: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const { error: insertError } = await supabase.from("quality_checks").insert({
        lot_id: form.lot_id,
        stage: form.stage.trim() || null,
        inspector_id: user.id,
        criteria: form.notes.trim() ? { notes: form.notes.trim() } : null,
        result: form.result,
        reject_reason: form.result === "fail" ? form.reject_reason.trim() || null : null,
      });
      if (insertError) throw insertError;

      const { error: eventError } = await supabase.from("traceability_events").insert({
        lot_id: form.lot_id,
        event_type: "quality_check",
        occurred_at: new Date().toISOString(),
        actor_id: user.id,
        farm_id: form.farm_id,
      });
      if (eventError) throw eventError;

      onSaved();
      resetAndClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={resetAndClose}
      title={t("qualityChecks.addTitle")}
      footer={
        <>
          <Button variant="secondary" onClick={resetAndClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="quality-check-form" disabled={saving}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      <form id="quality-check-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label={t("qualityChecks.fields.farm")} htmlFor="farm_id">
            <select id="farm_id" required value={form.farm_id} onChange={handleFarmChange} className={inputClass}>
              <option value="" disabled>
                {t("qualityChecks.fields.farm")}
              </option>
              {farms.map((farm) => (
                <option key={farm.id} value={farm.id}>
                  {farm.name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label={t("qualityChecks.fields.lot")} htmlFor="lot_id">
            <select
              id="lot_id"
              required
              disabled={!form.farm_id}
              value={form.lot_id}
              onChange={handleChange("lot_id")}
              className={inputClass}
            >
              <option value="" disabled>
                {t("qualityChecks.fields.lot")}
              </option>
              {lots.map((lot) => (
                <option key={lot.id} value={lot.id}>
                  {lot.lot_code}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <FormField label={t("qualityChecks.fields.stage")} htmlFor="stage">
          <input id="stage" required value={form.stage} onChange={handleChange("stage")} className={inputClass} />
        </FormField>

        <FormField label={t("qualityChecks.fields.notes")} htmlFor="notes">
          <textarea
            id="notes"
            rows={2}
            value={form.notes}
            onChange={handleChange("notes")}
            className={`${inputClass} resize-none`}
          />
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label={t("qualityChecks.fields.result")} htmlFor="result">
            <select id="result" value={form.result} onChange={handleChange("result")} className={inputClass}>
              <option value="pass">{t("qualityChecks.result.pass")}</option>
              <option value="fail">{t("qualityChecks.result.fail")}</option>
            </select>
          </FormField>
          {form.result === "fail" && (
            <FormField label={t("qualityChecks.fields.rejectReason")} htmlFor="reject_reason">
              <input
                id="reject_reason"
                value={form.reject_reason}
                onChange={handleChange("reject_reason")}
                className={inputClass}
              />
            </FormField>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </Modal>
  );
}
