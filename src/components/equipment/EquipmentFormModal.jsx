import { useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import FormField, { inputClass } from "../ui/FormField";
import { supabase } from "../../lib/supabaseClient";
import { useFarmOptions } from "../../hooks/useFarmOptions";
import { useEmployeeOptions } from "../../hooks/useEmployeeOptions";

const TYPE_OPTIONS = ["tractor", "pump", "irrigation", "machine", "generator", "tool", "other"];
const STATUS_OPTIONS = ["available", "in_use", "maintenance", "out_of_service"];

function toFormState(item, defaultFarmId) {
  return {
    farm_id: item?.farm_id ?? defaultFarmId ?? "",
    code: item?.code ?? "",
    type: item?.type ?? TYPE_OPTIONS[0],
    operator_id: item?.operator_id ?? "",
    working_hours: item?.working_hours ?? "",
    odometer_km: item?.odometer_km ?? "",
    next_maintenance_date: item?.next_maintenance_date ?? "",
    status: item?.status ?? "available",
  };
}

export default function EquipmentFormModal({ open, item, defaultFarmId, onClose, onSaved }) {
  const { t } = useTranslation();
  const { farms } = useFarmOptions();
  const [form, setForm] = useState(() => toFormState(item, defaultFarmId));
  const { employees } = useEmployeeOptions(form.farm_id);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const isEdit = !!item;

  const resetAndClose = () => {
    setForm(toFormState(null, defaultFarmId));
    setError(null);
    onClose();
  };

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleFarmChange = (e) => {
    setForm((f) => ({ ...f, farm_id: e.target.value, operator_id: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const numOrNull = (v) => (v === "" ? null : Number(v));
      const payload = {
        farm_id: form.farm_id,
        code: form.code.trim() || null,
        type: form.type,
        operator_id: form.operator_id || null,
        working_hours: numOrNull(form.working_hours),
        odometer_km: numOrNull(form.odometer_km),
        next_maintenance_date: form.next_maintenance_date || null,
        status: form.status,
      };
      if (isEdit) {
        const { error: updateError } = await supabase.from("equipment").update(payload).eq("id", item.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from("equipment").insert(payload);
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
      title={isEdit ? t("equipment.edit") : t("equipment.addTitle")}
      footer={
        <>
          <Button variant="secondary" onClick={resetAndClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="equipment-form" disabled={saving}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      <form id="equipment-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label={t("equipment.fields.farm")} htmlFor="farm_id">
            <select id="farm_id" required value={form.farm_id} onChange={handleFarmChange} className={inputClass}>
              <option value="" disabled>
                {t("equipment.fields.farm")}
              </option>
              {farms.map((farm) => (
                <option key={farm.id} value={farm.id}>
                  {farm.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label={t("equipment.fields.code")} htmlFor="code">
            <input id="code" required value={form.code} onChange={handleChange("code")} className={inputClass} />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label={t("equipment.fields.type")} htmlFor="type">
            <select id="type" value={form.type} onChange={handleChange("type")} className={inputClass}>
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {t(`equipment.types.${opt}`)}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label={t("equipment.fields.operator")} htmlFor="operator_id">
            <select
              id="operator_id"
              disabled={!form.farm_id}
              value={form.operator_id}
              onChange={handleChange("operator_id")}
              className={inputClass}
            >
              <option value="">{t("equipment.noOperator")}</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.full_name}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label={t("equipment.fields.workingHours")} htmlFor="working_hours">
            <input
              id="working_hours"
              type="number"
              step="0.01"
              min="0"
              value={form.working_hours}
              onChange={handleChange("working_hours")}
              className={inputClass}
            />
          </FormField>
          <FormField label={t("equipment.fields.odometerKm")} htmlFor="odometer_km">
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
          <FormField label={t("equipment.fields.nextMaintenanceDate")} htmlFor="next_maintenance_date">
            <input
              id="next_maintenance_date"
              type="date"
              value={form.next_maintenance_date}
              onChange={handleChange("next_maintenance_date")}
              className={inputClass}
            />
          </FormField>
          <FormField label={t("equipment.fields.status")} htmlFor="status">
            <select id="status" value={form.status} onChange={handleChange("status")} className={inputClass}>
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {t(`equipment.status.${opt}`)}
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
