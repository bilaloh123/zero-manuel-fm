import { useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import FormField, { inputClass } from "../ui/FormField";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { useFarmOptions } from "../../hooks/useFarmOptions";
import { useProductOptions } from "../../hooks/useProductOptions";

function emptyForm(defaultFarmId) {
  return {
    farm_id: defaultFarmId ?? "",
    product_id: "",
    caliber: "",
    quality_grade: "",
    boxes_count: "",
    net_weight_kg: "",
    gross_weight_kg: "",
  };
}

export default function PalletFormModal({ open, defaultFarmId, onClose, onSaved }) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { farms } = useFarmOptions();
  const { products } = useProductOptions();
  const [form, setForm] = useState(() => emptyForm(defaultFarmId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const productLabel = (p) => (i18n.language === "ar" ? p.name_ar || p.name_fr : p.name_fr || p.name_ar);

  const resetAndClose = () => {
    setForm(emptyForm(defaultFarmId));
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
        farm_id: form.farm_id,
        product_id: form.product_id,
        caliber: form.caliber.trim() || null,
        quality_grade: form.quality_grade.trim() || null,
        boxes_count: form.boxes_count === "" ? null : Number(form.boxes_count),
        net_weight_kg: form.net_weight_kg === "" ? null : Number(form.net_weight_kg),
        gross_weight_kg: form.gross_weight_kg === "" ? null : Number(form.gross_weight_kg),
        created_by: user.id,
      };
      const { error: insertError } = await supabase.from("pallets").insert(payload);
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
      title={t("pallets.addTitle")}
      footer={
        <>
          <Button variant="secondary" onClick={resetAndClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="pallet-form" disabled={saving}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      <form id="pallet-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label={t("pallets.fields.farm")} htmlFor="farm_id">
            <select id="farm_id" required value={form.farm_id} onChange={handleChange("farm_id")} className={inputClass}>
              <option value="" disabled>
                {t("pallets.fields.farm")}
              </option>
              {farms.map((farm) => (
                <option key={farm.id} value={farm.id}>
                  {farm.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label={t("pallets.fields.product")} htmlFor="product_id">
            <select id="product_id" required value={form.product_id} onChange={handleChange("product_id")} className={inputClass}>
              <option value="" disabled>
                {t("pallets.fields.product")}
              </option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {productLabel(p)}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label={t("pallets.fields.caliber")} htmlFor="caliber">
            <input id="caliber" value={form.caliber} onChange={handleChange("caliber")} className={inputClass} />
          </FormField>
          <FormField label={t("pallets.fields.qualityGrade")} htmlFor="quality_grade">
            <input id="quality_grade" value={form.quality_grade} onChange={handleChange("quality_grade")} className={inputClass} />
          </FormField>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <FormField label={t("pallets.fields.boxesCount")} htmlFor="boxes_count">
            <input
              id="boxes_count"
              type="number"
              min="1"
              value={form.boxes_count}
              onChange={handleChange("boxes_count")}
              className={inputClass}
            />
          </FormField>
          <FormField label={t("pallets.fields.netWeight")} htmlFor="net_weight_kg">
            <input
              id="net_weight_kg"
              type="number"
              step="0.01"
              min="0"
              value={form.net_weight_kg}
              onChange={handleChange("net_weight_kg")}
              className={inputClass}
            />
          </FormField>
          <FormField label={t("pallets.fields.grossWeight")} htmlFor="gross_weight_kg">
            <input
              id="gross_weight_kg"
              type="number"
              step="0.01"
              min="0"
              value={form.gross_weight_kg}
              onChange={handleChange("gross_weight_kg")}
              className={inputClass}
            />
          </FormField>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </Modal>
  );
}
