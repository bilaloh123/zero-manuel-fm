import { useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import FormField, { inputClass } from "../ui/FormField";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { useFarmOptions } from "../../hooks/useFarmOptions";

function emptyForm(defaultFarmId) {
  return {
    farm_id: defaultFarmId ?? "",
    period_start: "",
    period_end: "",
    reason: "",
  };
}

export default function PeriodLockFormModal({ open, defaultFarmId, onClose, onSaved }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { farms } = useFarmOptions();
  const [form, setForm] = useState(() => emptyForm(defaultFarmId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const resetAndClose = () => {
    setForm(emptyForm(defaultFarmId));
    setError(null);
    onClose();
  };

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (form.period_start > form.period_end) {
      setError(t("periodLocks.errors.endBeforeStart"));
      return;
    }
    setSaving(true);
    try {
      const { error: insertError } = await supabase.from("period_locks").insert({
        farm_id: form.farm_id,
        period_start: form.period_start,
        period_end: form.period_end,
        reason: form.reason.trim() || null,
        locked_by: user.id,
      });
      if (insertError) throw insertError;
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
      title={t("periodLocks.addTitle")}
      footer={
        <>
          <Button variant="secondary" onClick={resetAndClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="period-lock-form" disabled={saving}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      <p className="mb-3 rounded-control bg-cream-soft px-3 py-2 text-xs text-ink-muted">
        {t("periodLocks.warning")}
      </p>

      <form id="period-lock-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label={t("periodLocks.fields.farm")} htmlFor="farm_id">
          <select id="farm_id" required value={form.farm_id} onChange={handleChange("farm_id")} className={inputClass}>
            <option value="" disabled>
              {t("periodLocks.fields.farm")}
            </option>
            {farms.map((farm) => (
              <option key={farm.id} value={farm.id}>
                {farm.name}
              </option>
            ))}
          </select>
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label={t("periodLocks.fields.periodStart")} htmlFor="period_start">
            <input
              id="period_start"
              type="date"
              required
              max={form.period_end || undefined}
              value={form.period_start}
              onChange={handleChange("period_start")}
              className={inputClass}
            />
          </FormField>
          <FormField label={t("periodLocks.fields.periodEnd")} htmlFor="period_end">
            <input
              id="period_end"
              type="date"
              required
              min={form.period_start || undefined}
              value={form.period_end}
              onChange={handleChange("period_end")}
              className={inputClass}
            />
          </FormField>
        </div>

        <FormField label={`${t("periodLocks.fields.reason")} (${t("common.optional")})`} htmlFor="reason">
          <input id="reason" value={form.reason} onChange={handleChange("reason")} className={inputClass} />
        </FormField>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </Modal>
  );
}
