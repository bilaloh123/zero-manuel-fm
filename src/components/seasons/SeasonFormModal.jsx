import { useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import FormField, { inputClass } from "../ui/FormField";
import { supabase } from "../../lib/supabaseClient";
import { useFarmOptions } from "../../hooks/useFarmOptions";

function toFormState(season, defaultFarmId) {
  return {
    label: season?.label ?? "",
    farm_id: season ? season.farm_id ?? "" : defaultFarmId ?? "",
    start_date: season?.start_date ?? "",
    end_date: season?.end_date ?? "",
  };
}

export default function SeasonFormModal({ open, season, defaultFarmId, onClose, onSaved }) {
  const { t } = useTranslation();
  const { farms } = useFarmOptions();
  const [form, setForm] = useState(() => toFormState(season, defaultFarmId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const isEdit = !!season;

  const resetAndClose = () => {
    setForm(toFormState(null, defaultFarmId));
    setError(null);
    onClose();
  };

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        label: form.label.trim(),
        farm_id: form.farm_id || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
      };
      if (isEdit) {
        const { error: updateError } = await supabase.from("seasons").update(payload).eq("id", season.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from("seasons").insert(payload);
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
      title={isEdit ? t("seasons.edit") : t("seasons.addTitle")}
      footer={
        <>
          <Button variant="secondary" onClick={resetAndClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="season-form" disabled={saving}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      <form id="season-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label={t("seasons.fields.label")} htmlFor="label">
          <input
            id="label"
            required
            placeholder="2025-2026"
            value={form.label}
            onChange={handleChange("label")}
            className={inputClass}
          />
        </FormField>

        <FormField label={t("seasons.fields.farm")} htmlFor="farm_id">
          <select id="farm_id" value={form.farm_id} onChange={handleChange("farm_id")} className={inputClass}>
            <option value="">{t("seasons.generalFarm")}</option>
            {farms.map((farm) => (
              <option key={farm.id} value={farm.id}>
                {farm.name}
              </option>
            ))}
          </select>
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label={t("seasons.fields.startDate")} htmlFor="start_date">
            <input
              id="start_date"
              type="date"
              value={form.start_date}
              onChange={handleChange("start_date")}
              className={inputClass}
            />
          </FormField>
          <FormField label={t("seasons.fields.endDate")} htmlFor="end_date">
            <input
              id="end_date"
              type="date"
              value={form.end_date}
              onChange={handleChange("end_date")}
              className={inputClass}
            />
          </FormField>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </Modal>
  );
}
