import { useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import FormField, { inputClass } from "../ui/FormField";
import { supabase } from "../../lib/supabaseClient";
import { useCropOptions } from "../../hooks/useCropOptions";

function toFormState(variety) {
  return {
    name: variety?.name ?? "",
    crop_id: variety?.crop_id ?? "",
  };
}

export default function VarietyFormModal({ open, variety, onClose, onSaved }) {
  const { t, i18n } = useTranslation();
  const { crops } = useCropOptions();
  const [form, setForm] = useState(() => toFormState(variety));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const isEdit = !!variety;

  const resetAndClose = () => {
    setForm(toFormState(null));
    setError(null);
    onClose();
  };

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const cropLabel = (crop) => (i18n.language === "ar" ? crop.name_ar || crop.name_fr : crop.name_fr || crop.name_ar);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = { name: form.name.trim(), crop_id: form.crop_id };
      if (isEdit) {
        const { error: updateError } = await supabase.from("varieties").update(payload).eq("id", variety.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from("varieties").insert(payload);
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
      title={isEdit ? t("varieties.edit") : t("varieties.addTitle")}
      footer={
        <>
          <Button variant="secondary" onClick={resetAndClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="variety-form" disabled={saving}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      <form id="variety-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label={t("varieties.fields.crop")} htmlFor="crop_id">
          <select
            id="crop_id"
            required
            value={form.crop_id}
            onChange={handleChange("crop_id")}
            className={inputClass}
          >
            <option value="" disabled>
              {t("varieties.fields.crop")}
            </option>
            {crops.map((crop) => (
              <option key={crop.id} value={crop.id}>
                {cropLabel(crop)}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label={t("varieties.fields.name")} htmlFor="name">
          <input
            id="name"
            required
            value={form.name}
            onChange={handleChange("name")}
            className={inputClass}
          />
        </FormField>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </Modal>
  );
}
