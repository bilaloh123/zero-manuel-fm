import { useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import FormField, { inputClass } from "../ui/FormField";
import { supabase } from "../../lib/supabaseClient";
import { useFarmOptions } from "../../hooks/useFarmOptions";
import { useParcelOptions } from "../../hooks/useParcelOptions";
import { useCropCycleOptions } from "../../hooks/useCropCycleOptions";
import { useLotOptions } from "../../hooks/useLotOptions";

const CATEGORY_OPTIONS = [
  "labor",
  "fertilizer",
  "treatment",
  "irrigation",
  "transport",
  "fuel",
  "maintenance",
  "packaging",
  "equipment",
  "other",
];

function todayStr() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function emptyForm(defaultFarmId) {
  return {
    farm_id: defaultFarmId ?? "",
    parcel_id: "",
    crop_cycle_id: "",
    lot_id: "",
    category: CATEGORY_OPTIONS[0],
    amount: "",
    expense_date: todayStr(),
  };
}

export default function ExpenseFormModal({ open, defaultFarmId, onClose, onSaved }) {
  const { t } = useTranslation();
  const { farms } = useFarmOptions();
  const [form, setForm] = useState(() => emptyForm(defaultFarmId));
  const { parcels } = useParcelOptions(form.farm_id);
  const { cropCycles } = useCropCycleOptions(form.farm_id);
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
    setForm((f) => ({ ...f, farm_id: e.target.value, parcel_id: "", crop_cycle_id: "", lot_id: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        farm_id: form.farm_id,
        parcel_id: form.parcel_id || null,
        crop_cycle_id: form.crop_cycle_id || null,
        lot_id: form.lot_id || null,
        category: form.category,
        amount: Number(form.amount),
        expense_date: form.expense_date || null,
      };
      const { error: insertError } = await supabase.from("expenses").insert(payload);
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
      title={t("expenses.addTitle")}
      footer={
        <>
          <Button variant="secondary" onClick={resetAndClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="expense-form" disabled={saving}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      <form id="expense-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label={t("expenses.fields.farm")} htmlFor="farm_id">
            <select id="farm_id" required value={form.farm_id} onChange={handleFarmChange} className={inputClass}>
              <option value="" disabled>
                {t("expenses.fields.farm")}
              </option>
              {farms.map((farm) => (
                <option key={farm.id} value={farm.id}>
                  {farm.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label={t("expenses.fields.category")} htmlFor="category">
            <select id="category" value={form.category} onChange={handleChange("category")} className={inputClass}>
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {t(`expenses.categories.${opt}`)}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label={t("expenses.fields.amount")} htmlFor="amount">
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
          <FormField label={t("expenses.fields.expenseDate")} htmlFor="expense_date">
            <input
              id="expense_date"
              type="date"
              required
              value={form.expense_date}
              onChange={handleChange("expense_date")}
              className={inputClass}
            />
          </FormField>
        </div>

        <FormField label={t("expenses.fields.parcel")} htmlFor="parcel_id">
          <select
            id="parcel_id"
            disabled={!form.farm_id}
            value={form.parcel_id}
            onChange={handleChange("parcel_id")}
            className={inputClass}
          >
            <option value="">{t("common.optional")}</option>
            {parcels.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name || p.code}
              </option>
            ))}
          </select>
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label={t("expenses.fields.cropCycle")} htmlFor="crop_cycle_id">
            <select
              id="crop_cycle_id"
              disabled={!form.farm_id}
              value={form.crop_cycle_id}
              onChange={handleChange("crop_cycle_id")}
              className={inputClass}
            >
              <option value="">{t("common.optional")}</option>
              {cropCycles.map((cc) => (
                <option key={cc.id} value={cc.id}>
                  {cc.parcels?.name || cc.parcels?.code}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label={t("expenses.fields.lot")} htmlFor="lot_id">
            <select
              id="lot_id"
              disabled={!form.farm_id}
              value={form.lot_id}
              onChange={handleChange("lot_id")}
              className={inputClass}
            >
              <option value="">{t("common.optional")}</option>
              {lots.map((lot) => (
                <option key={lot.id} value={lot.id}>
                  {lot.lot_code}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </Modal>
  );
}
