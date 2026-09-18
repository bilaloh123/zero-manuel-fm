import { useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import FormField, { inputClass } from "../ui/FormField";
import { supabase } from "../../lib/supabaseClient";
import { useFarmOptions } from "../../hooks/useFarmOptions";

const STATUS_OPTIONS = ["available", "on_mission", "maintenance", "out_of_service"];

function toFormState(vehicle, defaultFarmId) {
  return {
    farm_id: vehicle?.farm_id ?? defaultFarmId ?? "",
    plate_no: vehicle?.plate_no ?? "",
    brand: vehicle?.brand ?? "",
    model: vehicle?.model ?? "",
    type: vehicle?.type ?? "",
    capacity: vehicle?.capacity ?? "",
    odometer_km: vehicle?.odometer_km ?? "",
    insurance_expiry: vehicle?.insurance_expiry ?? "",
    inspection_expiry: vehicle?.inspection_expiry ?? "",
    status: vehicle?.status ?? "available",
  };
}

export default function VehicleFormModal({ open, vehicle, defaultFarmId, onClose, onSaved }) {
  const { t } = useTranslation();
  const { farms } = useFarmOptions();
  const [form, setForm] = useState(() => toFormState(vehicle, defaultFarmId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const isEdit = !!vehicle;

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
      const numOrNull = (v) => (v === "" ? null : Number(v));
      const strOrNull = (v) => v.trim() || null;
      const payload = {
        farm_id: form.farm_id,
        plate_no: strOrNull(form.plate_no),
        brand: strOrNull(form.brand),
        model: strOrNull(form.model),
        type: strOrNull(form.type),
        capacity: numOrNull(form.capacity),
        odometer_km: numOrNull(form.odometer_km),
        insurance_expiry: form.insurance_expiry || null,
        inspection_expiry: form.inspection_expiry || null,
        status: form.status,
      };
      if (isEdit) {
        const { error: updateError } = await supabase.from("vehicles").update(payload).eq("id", vehicle.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from("vehicles").insert(payload);
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
      title={isEdit ? t("vehicles.edit") : t("vehicles.addTitle")}
      footer={
        <>
          <Button variant="secondary" onClick={resetAndClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="vehicle-form" disabled={saving}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      <form id="vehicle-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label={t("vehicles.fields.farm")} htmlFor="farm_id">
            <select id="farm_id" required value={form.farm_id} onChange={handleChange("farm_id")} className={inputClass}>
              <option value="" disabled>
                {t("vehicles.fields.farm")}
              </option>
              {farms.map((farm) => (
                <option key={farm.id} value={farm.id}>
                  {farm.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label={t("vehicles.fields.plateNo")} htmlFor="plate_no">
            <input
              id="plate_no"
              required
              value={form.plate_no}
              onChange={handleChange("plate_no")}
              className={inputClass}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <FormField label={t("vehicles.fields.brand")} htmlFor="brand">
            <input id="brand" value={form.brand} onChange={handleChange("brand")} className={inputClass} />
          </FormField>
          <FormField label={t("vehicles.fields.model")} htmlFor="model">
            <input id="model" value={form.model} onChange={handleChange("model")} className={inputClass} />
          </FormField>
          <FormField label={t("vehicles.fields.type")} htmlFor="type">
            <input id="type" value={form.type} onChange={handleChange("type")} className={inputClass} />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label={t("vehicles.fields.capacity")} htmlFor="capacity">
            <input
              id="capacity"
              type="number"
              step="0.01"
              min="0"
              value={form.capacity}
              onChange={handleChange("capacity")}
              className={inputClass}
            />
          </FormField>
          <FormField label={t("vehicles.fields.odometerKm")} htmlFor="odometer_km">
            <input
              id="odometer_km"
              type="number"
              step="0.01"
              min="0"
              value={form.odometer_km}
              onChange={handleChange("odometer_km")}
              className={inputClass}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label={t("vehicles.fields.insuranceExpiry")} htmlFor="insurance_expiry">
            <input
              id="insurance_expiry"
              type="date"
              value={form.insurance_expiry}
              onChange={handleChange("insurance_expiry")}
              className={inputClass}
            />
          </FormField>
          <FormField label={t("vehicles.fields.inspectionExpiry")} htmlFor="inspection_expiry">
            <input
              id="inspection_expiry"
              type="date"
              value={form.inspection_expiry}
              onChange={handleChange("inspection_expiry")}
              className={inputClass}
            />
          </FormField>
        </div>

        <FormField label={t("vehicles.fields.status")} htmlFor="status">
          <select id="status" value={form.status} onChange={handleChange("status")} className={inputClass}>
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {t(`vehicles.status.${opt}`)}
              </option>
            ))}
          </select>
        </FormField>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </Modal>
  );
}
