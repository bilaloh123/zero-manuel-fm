import { useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import FormField, { inputClass } from "../ui/FormField";
import { supabase } from "../../lib/supabaseClient";
import { useFarmOptions } from "../../hooks/useFarmOptions";
import { useCropCycleOptions } from "../../hooks/useCropCycleOptions";
import { useTeamOptions } from "../../hooks/useTeamOptions";

function toFormState(plan, defaultFarmId) {
  return {
    farm_id: plan?.parcels?.farm_id ?? defaultFarmId ?? "",
    crop_cycle_id: plan?.crop_cycle_id ?? "",
    planned_date: plan?.planned_date ?? "",
    expected_quantity: plan?.expected_quantity ?? "",
    team_id: plan?.team_id ?? "",
  };
}

export default function HarvestPlanFormModal({ open, plan, defaultFarmId, onClose, onSaved }) {
  const { t, i18n } = useTranslation();
  const { farms } = useFarmOptions();
  const [form, setForm] = useState(() => toFormState(plan, defaultFarmId));
  const { cropCycles } = useCropCycleOptions(form.farm_id);
  const { teams } = useTeamOptions(form.farm_id);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const isEdit = !!plan;

  const resetAndClose = () => {
    setForm(toFormState(null, defaultFarmId));
    setError(null);
    onClose();
  };

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleFarmChange = (e) => {
    const farm_id = e.target.value;
    setForm((f) => ({ ...f, farm_id, crop_cycle_id: "", team_id: "" }));
  };

  const cropCycleLabel = (cc) => {
    const crop = cc.crops;
    const cropName = crop ? (i18n.language === "ar" ? crop.name_ar || crop.name_fr : crop.name_fr || crop.name_ar) : "";
    const parcelName = cc.parcels?.name || cc.parcels?.code || "";
    return `${parcelName} — ${cropName}${cc.seasons ? ` (${cc.seasons.label})` : ""}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        crop_cycle_id: form.crop_cycle_id,
        planned_date: form.planned_date || null,
        expected_quantity: form.expected_quantity === "" ? null : Number(form.expected_quantity),
        team_id: form.team_id || null,
      };
      if (isEdit) {
        const { error: updateError } = await supabase.from("harvest_plans").update(payload).eq("id", plan.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from("harvest_plans").insert(payload);
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
      title={isEdit ? t("harvestPlans.edit") : t("harvestPlans.addTitle")}
      footer={
        <>
          <Button variant="secondary" onClick={resetAndClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="harvest-plan-form" disabled={saving}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      <form id="harvest-plan-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label={t("harvestPlans.fields.farm")} htmlFor="farm_id">
          <select id="farm_id" required value={form.farm_id} onChange={handleFarmChange} className={inputClass}>
            <option value="" disabled>
              {t("harvestPlans.fields.farm")}
            </option>
            {farms.map((farm) => (
              <option key={farm.id} value={farm.id}>
                {farm.name}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label={t("harvestPlans.fields.cropCycle")} htmlFor="crop_cycle_id">
          <select
            id="crop_cycle_id"
            required
            disabled={!form.farm_id}
            value={form.crop_cycle_id}
            onChange={handleChange("crop_cycle_id")}
            className={inputClass}
          >
            <option value="" disabled>
              {form.farm_id ? t("harvestPlans.fields.cropCycle") : t("harvestPlans.selectFarmFirst")}
            </option>
            {cropCycles.map((cc) => (
              <option key={cc.id} value={cc.id}>
                {cropCycleLabel(cc)}
              </option>
            ))}
          </select>
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label={t("harvestPlans.fields.plannedDate")} htmlFor="planned_date">
            <input
              id="planned_date"
              type="date"
              required
              value={form.planned_date}
              onChange={handleChange("planned_date")}
              className={inputClass}
            />
          </FormField>
          <FormField label={t("harvestPlans.fields.expectedQuantity")} htmlFor="expected_quantity">
            <input
              id="expected_quantity"
              type="number"
              step="0.01"
              min="0"
              value={form.expected_quantity}
              onChange={handleChange("expected_quantity")}
              className={inputClass}
            />
          </FormField>
        </div>

        <FormField label={t("harvestPlans.fields.team")} htmlFor="team_id">
          <select
            id="team_id"
            disabled={!form.farm_id}
            value={form.team_id}
            onChange={handleChange("team_id")}
            className={inputClass}
          >
            <option value="">{t("common.optional")}</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </FormField>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </Modal>
  );
}
