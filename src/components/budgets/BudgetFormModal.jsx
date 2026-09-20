import { useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import FormField, { inputClass } from "../ui/FormField";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { useFarmOptions } from "../../hooks/useFarmOptions";
import { useSiteOptions } from "../../hooks/useSiteOptions";
import { useParcelOptions } from "../../hooks/useParcelOptions";
import { useCropCycleOptions } from "../../hooks/useCropCycleOptions";
import { useSeasonOptions } from "../../hooks/useSeasonOptions";

const LEVEL_OPTIONS = ["farm", "site", "parcel", "crop_cycle", "season"];
const CATEGORY_OPTIONS = [
  "labor",
  "fertilizer",
  "treatment",
  "irrigation",
  "fuel",
  "transport",
  "maintenance",
  "packaging",
  "equipment",
  "other",
];

function emptyForm(defaultFarmId) {
  return {
    farm_id: defaultFarmId ?? "",
    level: "farm",
    scope_id: "",
    category: CATEGORY_OPTIONS[0],
    period_start: "",
    period_end: "",
    amount: "",
    notes: "",
  };
}

export default function BudgetFormModal({ open, defaultFarmId, onClose, onSaved }) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { farms } = useFarmOptions();
  const [form, setForm] = useState(() => emptyForm(defaultFarmId));
  const { sites } = useSiteOptions(form.farm_id);
  const { parcels } = useParcelOptions(form.farm_id);
  const { cropCycles } = useCropCycleOptions(form.farm_id);
  const { seasons } = useSeasonOptions(form.farm_id);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const resetAndClose = () => {
    setForm(emptyForm(defaultFarmId));
    setError(null);
    onClose();
  };

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleFarmChange = (e) => {
    setForm((f) => ({ ...f, farm_id: e.target.value, scope_id: "" }));
  };

  const handleLevelChange = (e) => {
    setForm((f) => ({ ...f, level: e.target.value, scope_id: "" }));
  };

  const cropCycleLabel = (cc) => {
    const crop = cc.crops ? (i18n.language === "ar" ? cc.crops.name_ar || cc.crops.name_fr : cc.crops.name_fr || cc.crops.name_ar) : "";
    return `${cc.parcels?.name || ""} — ${crop}${cc.seasons?.label ? ` (${cc.seasons.label})` : ""}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        farm_id: form.farm_id,
        level: form.level,
        site_id: form.level === "site" ? form.scope_id : null,
        parcel_id: form.level === "parcel" ? form.scope_id : null,
        crop_cycle_id: form.level === "crop_cycle" ? form.scope_id : null,
        season_id: form.level === "season" ? form.scope_id : null,
        category: form.category,
        period_start: form.period_start,
        period_end: form.period_end,
        amount: Number(form.amount),
        notes: form.notes.trim() || null,
        created_by: user.id,
      };
      const { error: insertError } = await supabase.from("budgets").insert(payload);
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
      title={t("budgets.addTitle")}
      footer={
        <>
          <Button variant="secondary" onClick={resetAndClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="budget-form" disabled={saving}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      <form id="budget-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label={t("budgets.fields.farm")} htmlFor="farm_id">
            <select id="farm_id" required value={form.farm_id} onChange={handleFarmChange} className={inputClass}>
              <option value="" disabled>
                {t("budgets.fields.farm")}
              </option>
              {farms.map((farm) => (
                <option key={farm.id} value={farm.id}>
                  {farm.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label={t("budgets.fields.level")} htmlFor="level">
            <select id="level" required value={form.level} onChange={handleLevelChange} className={inputClass}>
              {LEVEL_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {t(`budgets.levels.${opt}`)}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        {form.level === "site" && (
          <FormField label={t("budgets.fields.scope")} htmlFor="scope_id">
            <select
              id="scope_id"
              required
              disabled={!form.farm_id}
              value={form.scope_id}
              onChange={handleChange("scope_id")}
              className={inputClass}
            >
              <option value="" disabled>
                {t("budgets.fields.scope")}
              </option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </FormField>
        )}

        {form.level === "parcel" && (
          <FormField label={t("budgets.fields.scope")} htmlFor="scope_id">
            <select
              id="scope_id"
              required
              disabled={!form.farm_id}
              value={form.scope_id}
              onChange={handleChange("scope_id")}
              className={inputClass}
            >
              <option value="" disabled>
                {t("budgets.fields.scope")}
              </option>
              {parcels.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </FormField>
        )}

        {form.level === "crop_cycle" && (
          <FormField label={t("budgets.fields.scope")} htmlFor="scope_id">
            <select
              id="scope_id"
              required
              disabled={!form.farm_id}
              value={form.scope_id}
              onChange={handleChange("scope_id")}
              className={inputClass}
            >
              <option value="" disabled>
                {t("budgets.fields.scope")}
              </option>
              {cropCycles.map((cc) => (
                <option key={cc.id} value={cc.id}>
                  {cropCycleLabel(cc)}
                </option>
              ))}
            </select>
          </FormField>
        )}

        {form.level === "season" && (
          <FormField label={t("budgets.fields.scope")} htmlFor="scope_id">
            <select
              id="scope_id"
              required
              disabled={!form.farm_id}
              value={form.scope_id}
              onChange={handleChange("scope_id")}
              className={inputClass}
            >
              <option value="" disabled>
                {t("budgets.fields.scope")}
              </option>
              {seasons.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </FormField>
        )}

        <div className="grid grid-cols-3 gap-4">
          <FormField label={t("budgets.fields.category")} htmlFor="category">
            <select id="category" value={form.category} onChange={handleChange("category")} className={inputClass}>
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {t(`expenses.categories.${opt}`)}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label={t("budgets.fields.periodStart")} htmlFor="period_start">
            <input
              id="period_start"
              type="date"
              required
              value={form.period_start}
              onChange={handleChange("period_start")}
              className={inputClass}
            />
          </FormField>
          <FormField label={t("budgets.fields.periodEnd")} htmlFor="period_end">
            <input
              id="period_end"
              type="date"
              required
              value={form.period_end}
              onChange={handleChange("period_end")}
              className={inputClass}
            />
          </FormField>
        </div>

        <FormField label={t("budgets.fields.amount")} htmlFor="amount">
          <input
            id="amount"
            type="number"
            required
            step="0.01"
            min="0.01"
            value={form.amount}
            onChange={handleChange("amount")}
            className={inputClass}
          />
        </FormField>

        <FormField label={t("budgets.fields.notes")} htmlFor="notes">
          <textarea id="notes" rows={2} value={form.notes} onChange={handleChange("notes")} className={inputClass} />
        </FormField>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </Modal>
  );
}
