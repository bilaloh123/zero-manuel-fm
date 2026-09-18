import { useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import FormField, { inputClass } from "../ui/FormField";
import { supabase } from "../../lib/supabaseClient";
import { useFarmOptions } from "../../hooks/useFarmOptions";

const TYPE_OPTIONS = ["main", "cold_storage", "fuel_tank"];

function toFormState(warehouse, defaultFarmId) {
  return {
    farm_id: warehouse?.farm_id ?? defaultFarmId ?? "",
    name: warehouse?.name ?? "",
    type: warehouse?.type ?? TYPE_OPTIONS[0],
  };
}

export default function WarehouseFormModal({ open, warehouse, defaultFarmId, onClose, onSaved }) {
  const { t } = useTranslation();
  const { farms } = useFarmOptions();
  const [form, setForm] = useState(() => toFormState(warehouse, defaultFarmId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const isEdit = !!warehouse;

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
      const payload = { farm_id: form.farm_id, name: form.name.trim(), type: form.type };
      if (isEdit) {
        const { error: updateError } = await supabase.from("warehouses").update(payload).eq("id", warehouse.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from("warehouses").insert(payload);
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
      title={isEdit ? t("warehouses.edit") : t("warehouses.addTitle")}
      footer={
        <>
          <Button variant="secondary" onClick={resetAndClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="warehouse-form" disabled={saving}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      <form id="warehouse-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label={t("warehouses.fields.farm")} htmlFor="farm_id">
          <select id="farm_id" required value={form.farm_id} onChange={handleChange("farm_id")} className={inputClass}>
            <option value="" disabled>
              {t("warehouses.fields.farm")}
            </option>
            {farms.map((farm) => (
              <option key={farm.id} value={farm.id}>
                {farm.name}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label={t("warehouses.fields.name")} htmlFor="name">
          <input id="name" required value={form.name} onChange={handleChange("name")} className={inputClass} />
        </FormField>

        <FormField label={t("warehouses.fields.type")} htmlFor="type">
          <select id="type" value={form.type} onChange={handleChange("type")} className={inputClass}>
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {t(`warehouses.types.${opt}`)}
              </option>
            ))}
          </select>
        </FormField>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </Modal>
  );
}
