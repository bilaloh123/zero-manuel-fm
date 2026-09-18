import { useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import FormField, { inputClass } from "../ui/FormField";
import { supabase } from "../../lib/supabaseClient";
import { useFarmOptions } from "../../hooks/useFarmOptions";
import { useParcelOptions } from "../../hooks/useParcelOptions";
import { useCropOptions } from "../../hooks/useCropOptions";
import { useVarietyOptions } from "../../hooks/useVarietyOptions";
import { useSeasonOptions } from "../../hooks/useSeasonOptions";

const STATUS_OPTIONS = ["planned", "growing", "harvesting", "closed"];

function toFormState(cycle, defaultFarmId) {
  return {
    farm_id: cycle?.parcels?.farm_id ?? defaultFarmId ?? "",
    parcel_id: cycle?.parcel_id ?? "",
    crop_id: cycle?.crop_id ?? "",
    variety_id: cycle?.variety_id ?? "",
    season_id: cycle?.season_id ?? "",
    planting_date: cycle?.planting_date ?? "",
    expected_harvest_date: cycle?.expected_harvest_date ?? "",
    actual_harvest_date: cycle?.actual_harvest_date ?? "",
    expected_yield_kg: cycle?.expected_yield_kg ?? "",
    actual_yield_kg: cycle?.actual_yield_kg ?? "",
    status: cycle?.status ?? "planned",
  };
}

export default function CropCycleFormModal({ open, cycle, defaultFarmId, onClose, onSaved }) {
  const { t, i18n } = useTranslation();
  const [form, setForm] = useState(() => toFormState(cycle, defaultFarmId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const { farms } = useFarmOptions();
  const { parcels } = useParcelOptions(form.farm_id);
  const { crops } = useCropOptions();
  const { varieties } = useVarietyOptions(form.crop_id);
  const { seasons } = useSeasonOptions(form.farm_id);

  const isEdit = !!cycle;

  const resetAndClose = () => {
    setForm(toFormState(null, defaultFarmId));
    setError(null);
    onClose();
  };

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleFarmChange = (e) => {
    const farm_id = e.target.value;
    setForm((f) => ({ ...f, farm_id, parcel_id: "", season_id: "" }));
  };

  const handleCropChange = (e) => {
    const crop_id = e.target.value;
    setForm((f) => ({ ...f, crop_id, variety_id: "" }));
  };

  const cropLabel = (crop) => (i18n.language === "ar" ? crop.name_ar || crop.name_fr : crop.name_fr || crop.name_ar);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const numOrNull = (v) => (v === "" || v === null || v === undefined ? null : Number(v));
      const payload = {
        parcel_id: form.parcel_id,
        crop_id: form.crop_id,
        variety_id: form.variety_id || null,
        season_id: form.season_id || null,
        planting_date: form.planting_date || null,
        expected_harvest_date: form.expected_harvest_date || null,
        actual_harvest_date: form.actual_harvest_date || null,
        expected_yield_kg: numOrNull(form.expected_yield_kg),
        actual_yield_kg: numOrNull(form.actual_yield_kg),
        status: form.status,
      };
      if (isEdit) {
        const { error: updateError } = await supabase.from("crop_cycles").update(payload).eq("id", cycle.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from("crop_cycles").insert(payload);
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
      title={isEdit ? t("cropCycles.edit") : t("cropCycles.addTitle")}
      footer={
        <>
          <Button variant="secondary" onClick={resetAndClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="crop-cycle-form" disabled={saving}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      <form id="crop-cycle-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label={t("cropCycles.fields.farm")} htmlFor="farm_id">
            <select id="farm_id" required value={form.farm_id} onChange={handleFarmChange} className={inputClass}>
              <option value="" disabled>
                {t("cropCycles.fields.farm")}
              </option>
              {farms.map((farm) => (
                <option key={farm.id} value={farm.id}>
                  {farm.name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label={t("cropCycles.fields.parcel")} htmlFor="parcel_id">
            <select
              id="parcel_id"
              required
              disabled={!form.farm_id}
              value={form.parcel_id}
              onChange={handleChange("parcel_id")}
              className={inputClass}
            >
              <option value="" disabled>
                {form.farm_id ? t("cropCycles.fields.parcel") : t("cropCycles.selectFarmFirst")}
              </option>
              {parcels.map((parcel) => (
                <option key={parcel.id} value={parcel.id}>
                  {parcel.name || parcel.code}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label={t("cropCycles.fields.crop")} htmlFor="crop_id">
            <select id="crop_id" required value={form.crop_id} onChange={handleCropChange} className={inputClass}>
              <option value="" disabled>
                {t("cropCycles.fields.crop")}
              </option>
              {crops.map((crop) => (
                <option key={crop.id} value={crop.id}>
                  {cropLabel(crop)}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label={t("cropCycles.fields.variety")} htmlFor="variety_id">
            <select
              id="variety_id"
              disabled={!form.crop_id}
              value={form.variety_id}
              onChange={handleChange("variety_id")}
              className={inputClass}
            >
              <option value="">
                {form.crop_id ? `${t("common.optional")}` : t("cropCycles.selectCropFirst")}
              </option>
              {varieties.map((variety) => (
                <option key={variety.id} value={variety.id}>
                  {variety.name}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label={t("cropCycles.fields.season")} htmlFor="season_id">
            <select
              id="season_id"
              disabled={!form.farm_id}
              value={form.season_id}
              onChange={handleChange("season_id")}
              className={inputClass}
            >
              <option value="">
                {form.farm_id ? t("common.optional") : t("cropCycles.selectFarmFirst")}
              </option>
              {seasons.map((season) => (
                <option key={season.id} value={season.id}>
                  {season.label}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label={t("cropCycles.fields.status")} htmlFor="status">
            <select id="status" value={form.status} onChange={handleChange("status")} className={inputClass}>
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {t(`cropCycles.status.${opt}`)}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label={t("cropCycles.fields.plantingDate")} htmlFor="planting_date">
            <input
              id="planting_date"
              type="date"
              value={form.planting_date}
              onChange={handleChange("planting_date")}
              className={inputClass}
            />
          </FormField>
          <FormField label={t("cropCycles.fields.expectedHarvestDate")} htmlFor="expected_harvest_date">
            <input
              id="expected_harvest_date"
              type="date"
              value={form.expected_harvest_date}
              onChange={handleChange("expected_harvest_date")}
              className={inputClass}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label={t("cropCycles.fields.actualHarvestDate")} htmlFor="actual_harvest_date">
            <input
              id="actual_harvest_date"
              type="date"
              value={form.actual_harvest_date}
              onChange={handleChange("actual_harvest_date")}
              className={inputClass}
            />
          </FormField>
          <div />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label={t("cropCycles.fields.expectedYield")} htmlFor="expected_yield_kg">
            <input
              id="expected_yield_kg"
              type="number"
              step="0.01"
              min="0"
              value={form.expected_yield_kg}
              onChange={handleChange("expected_yield_kg")}
              className={inputClass}
            />
          </FormField>
          <FormField label={t("cropCycles.fields.actualYield")} htmlFor="actual_yield_kg">
            <input
              id="actual_yield_kg"
              type="number"
              step="0.01"
              min="0"
              value={form.actual_yield_kg}
              onChange={handleChange("actual_yield_kg")}
              className={inputClass}
            />
          </FormField>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </Modal>
  );
}
