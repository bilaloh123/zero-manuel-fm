import { useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import FormField, { inputClass } from "../ui/FormField";
import { supabase } from "../../lib/supabaseClient";
import { useFarmOptions } from "../../hooks/useFarmOptions";

const STATUS_OPTIONS = ["open", "closed"];

function toFormState(period, defaultFarmId) {
  return {
    farm_id: period?.farm_id ?? defaultFarmId ?? "",
    period_start: period?.period_start ?? "",
    period_end: period?.period_end ?? "",
    status: period?.status ?? "open",
  };
}

export default function PayrollPeriodFormModal({ open, period, defaultFarmId, onClose, onSaved }) {
  const { t } = useTranslation();
  const { farms } = useFarmOptions();
  const [form, setForm] = useState(() => toFormState(period, defaultFarmId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const isEdit = !!period;

  const resetAndClose = () => {
    setForm(toFormState(null, defaultFarmId));
    setError(null);
    onClose();
  };

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (form.period_start && form.period_end && form.period_end < form.period_start) {
      setError(t("payroll.errors.endBeforeStart"));
      return;
    }
    setSaving(true);
    try {
      const payload = {
        farm_id: form.farm_id,
        period_start: form.period_start || null,
        period_end: form.period_end || null,
        status: form.status,
      };
      if (isEdit) {
        const { error: updateError } = await supabase
          .from("payroll_periods")
          .update(payload)
          .eq("id", period.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from("payroll_periods").insert(payload);
        if (insertError) throw insertError;
      }
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
      title={isEdit ? t("payroll.edit") : t("payroll.addTitle")}
      footer={
        <>
          <Button variant="secondary" onClick={resetAndClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="payroll-period-form" disabled={saving}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      <form id="payroll-period-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label={t("payroll.fields.farm")} htmlFor="farm_id">
          <select id="farm_id" required value={form.farm_id} onChange={handleChange("farm_id")} className={inputClass}>
            <option value="" disabled>
              {t("payroll.fields.farm")}
            </option>
            {farms.map((farm) => (
              <option key={farm.id} value={farm.id}>
                {farm.name}
              </option>
            ))}
          </select>
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label={t("payroll.fields.periodStart")} htmlFor="period_start">
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
          <FormField label={t("payroll.fields.periodEnd")} htmlFor="period_end">
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

        <FormField label={t("payroll.fields.status")} htmlFor="status">
          <select id="status" value={form.status} onChange={handleChange("status")} className={inputClass}>
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {t(`payroll.status.${opt}`)}
              </option>
            ))}
          </select>
        </FormField>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </Modal>
  );
}
