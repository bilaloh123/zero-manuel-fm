import { useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import FormField, { inputClass } from "../ui/FormField";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { useFarmOptions } from "../../hooks/useFarmOptions";
import { useWarehouseOptions } from "../../hooks/useWarehouseOptions";

function emptyForm(defaultFarmId) {
  return {
    farm_id: defaultFarmId ?? "",
    warehouse_id: "",
    code: "",
    name: "",
    capacity_pallets: "",
    target_temperature_c: "",
    target_humidity_pct: "",
  };
}

export default function ColdStorageUnitFormModal({ open, defaultFarmId, onClose, onSaved }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { farms } = useFarmOptions();
  const [form, setForm] = useState(() => emptyForm(defaultFarmId));
  const { warehouses } = useWarehouseOptions(form.farm_id);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const resetAndClose = () => {
    setForm(emptyForm(defaultFarmId));
    setError(null);
    onClose();
  };

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const handleFarmChange = (e) => setForm((f) => ({ ...f, farm_id: e.target.value, warehouse_id: "" }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        farm_id: form.farm_id,
        warehouse_id: form.warehouse_id,
        code: form.code.trim() || null,
        name: form.name.trim(),
        capacity_pallets: form.capacity_pallets === "" ? null : Number(form.capacity_pallets),
        target_temperature_c: form.target_temperature_c === "" ? null : Number(form.target_temperature_c),
        target_humidity_pct: form.target_humidity_pct === "" ? null : Number(form.target_humidity_pct),
        created_by: user.id,
      };
      const { error: insertError } = await supabase.from("cold_storage_units").insert(payload);
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
      title={t("coldStorageUnits.addTitle")}
      footer={
        <>
          <Button variant="secondary" onClick={resetAndClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="cold-storage-unit-form" disabled={saving}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      <form id="cold-storage-unit-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label={t("coldStorageUnits.fields.farm")} htmlFor="farm_id">
            <select id="farm_id" required value={form.farm_id} onChange={handleFarmChange} className={inputClass}>
              <option value="" disabled>
                {t("coldStorageUnits.fields.farm")}
              </option>
              {farms.map((farm) => (
                <option key={farm.id} value={farm.id}>
                  {farm.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label={t("coldStorageUnits.fields.warehouse")} htmlFor="warehouse_id">
            <select
              id="warehouse_id"
              required
              disabled={!form.farm_id}
              value={form.warehouse_id}
              onChange={handleChange("warehouse_id")}
              className={inputClass}
            >
              <option value="" disabled>
                {t("coldStorageUnits.fields.warehouse")}
              </option>
              {warehouses.map((wh) => (
                <option key={wh.id} value={wh.id}>
                  {wh.name}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label={t("coldStorageUnits.fields.code")} htmlFor="code">
            <input id="code" value={form.code} onChange={handleChange("code")} className={inputClass} />
          </FormField>
          <FormField label={t("coldStorageUnits.fields.name")} htmlFor="name">
            <input id="name" required value={form.name} onChange={handleChange("name")} className={inputClass} />
          </FormField>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <FormField label={t("coldStorageUnits.fields.capacity")} htmlFor="capacity_pallets">
            <input
              id="capacity_pallets"
              type="number"
              min="1"
              value={form.capacity_pallets}
              onChange={handleChange("capacity_pallets")}
              className={inputClass}
            />
          </FormField>
          <FormField label={t("coldStorageUnits.fields.temperature")} htmlFor="target_temperature_c">
            <input
              id="target_temperature_c"
              type="number"
              step="0.1"
              value={form.target_temperature_c}
              onChange={handleChange("target_temperature_c")}
              className={inputClass}
            />
          </FormField>
          <FormField label={t("coldStorageUnits.fields.humidity")} htmlFor="target_humidity_pct">
            <input
              id="target_humidity_pct"
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={form.target_humidity_pct}
              onChange={handleChange("target_humidity_pct")}
              className={inputClass}
            />
          </FormField>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </Modal>
  );
}
