import { useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import FormField, { inputClass } from "../ui/FormField";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { useFarmOptions } from "../../hooks/useFarmOptions";
import { useEquipmentOptions } from "../../hooks/useEquipmentOptions";
import { useVehicleOptions } from "../../hooks/useVehicleOptions";

function emptyForm(defaultFarmId) {
  return {
    farm_id: defaultFarmId ?? "",
    target_type: "equipment",
    target_id: "",
    issue: "",
    technician_name: "",
    parts_used: "",
    labor_cost: "",
    parts_cost: "",
    downtime_hours: "",
    next_due_date: "",
  };
}

export default function MaintenanceRecordFormModal({ open, defaultFarmId, onClose, onSaved }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { farms } = useFarmOptions();
  const [form, setForm] = useState(() => emptyForm(defaultFarmId));
  const { equipment } = useEquipmentOptions(form.farm_id);
  const { vehicles } = useVehicleOptions(form.farm_id);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const targetOptions = form.target_type === "equipment" ? equipment : vehicles;
  const targetLabel = (t2) => (form.target_type === "equipment" ? t2.code : t2.plate_no);

  const resetAndClose = () => {
    setForm(emptyForm(defaultFarmId));
    setError(null);
    onClose();
  };

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleFarmChange = (e) => {
    setForm((f) => ({ ...f, farm_id: e.target.value, target_id: "" }));
  };

  const handleTargetTypeChange = (e) => {
    setForm((f) => ({ ...f, target_type: e.target.value, target_id: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        equipment_id: form.target_type === "equipment" ? form.target_id : null,
        vehicle_id: form.target_type === "vehicle" ? form.target_id : null,
        issue: form.issue.trim() || null,
        reported_by: user.id,
        technician_name: form.technician_name.trim() || null,
        parts_used: form.parts_used.trim() || null,
        labor_cost: form.labor_cost === "" ? null : Number(form.labor_cost),
        parts_cost: form.parts_cost === "" ? null : Number(form.parts_cost),
        downtime_hours: form.downtime_hours === "" ? null : Number(form.downtime_hours),
        next_due_date: form.next_due_date || null,
      };
      const { error: insertError } = await supabase.from("maintenance_records").insert(payload);
      if (insertError) throw insertError;

      // vehicles has no next_maintenance_date equivalent (it tracks
      // insurance_expiry/inspection_expiry instead) — only equipment
      // has a field this maintenance date can sync into.
      if (payload.next_due_date && form.target_type === "equipment") {
        const { error: syncError } = await supabase
          .from("equipment")
          .update({ next_maintenance_date: payload.next_due_date })
          .eq("id", form.target_id);
        if (syncError) throw syncError;
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
      title={t("maintenanceRecords.addTitle")}
      footer={
        <>
          <Button variant="secondary" onClick={resetAndClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="maintenance-form" disabled={saving}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      <form id="maintenance-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label={t("maintenanceRecords.fields.farm")} htmlFor="farm_id">
            <select id="farm_id" required value={form.farm_id} onChange={handleFarmChange} className={inputClass}>
              <option value="" disabled>
                {t("maintenanceRecords.fields.farm")}
              </option>
              {farms.map((farm) => (
                <option key={farm.id} value={farm.id}>
                  {farm.name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label={t("maintenanceRecords.targetType")} htmlFor="target_type">
            <select
              id="target_type"
              value={form.target_type}
              onChange={handleTargetTypeChange}
              className={inputClass}
            >
              <option value="equipment">{t("maintenanceRecords.targetTypes.equipment")}</option>
              <option value="vehicle">{t("maintenanceRecords.targetTypes.vehicle")}</option>
            </select>
          </FormField>
        </div>

        <FormField label={t("maintenanceRecords.fields.target")} htmlFor="target_id">
          <select
            id="target_id"
            required
            disabled={!form.farm_id}
            value={form.target_id}
            onChange={handleChange("target_id")}
            className={inputClass}
          >
            <option value="" disabled>
              {t("maintenanceRecords.fields.target")}
            </option>
            {targetOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {targetLabel(item)}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label={t("maintenanceRecords.fields.issue")} htmlFor="issue">
          <input id="issue" required value={form.issue} onChange={handleChange("issue")} className={inputClass} />
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label={t("maintenanceRecords.fields.technicianName")} htmlFor="technician_name">
            <input
              id="technician_name"
              value={form.technician_name}
              onChange={handleChange("technician_name")}
              className={inputClass}
            />
          </FormField>
          <FormField label={t("maintenanceRecords.fields.partsUsed")} htmlFor="parts_used">
            <input
              id="parts_used"
              value={form.parts_used}
              onChange={handleChange("parts_used")}
              className={inputClass}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField label={t("maintenanceRecords.fields.laborCost")} htmlFor="labor_cost">
            <input
              id="labor_cost"
              type="number"
              step="0.01"
              min="0"
              value={form.labor_cost}
              onChange={handleChange("labor_cost")}
              className={inputClass}
            />
          </FormField>
          <FormField label={t("maintenanceRecords.fields.partsCost")} htmlFor="parts_cost">
            <input
              id="parts_cost"
              type="number"
              step="0.01"
              min="0"
              value={form.parts_cost}
              onChange={handleChange("parts_cost")}
              className={inputClass}
            />
          </FormField>
          <FormField label={t("maintenanceRecords.fields.downtimeHours")} htmlFor="downtime_hours">
            <input
              id="downtime_hours"
              type="number"
              step="0.01"
              min="0"
              value={form.downtime_hours}
              onChange={handleChange("downtime_hours")}
              className={inputClass}
            />
          </FormField>
        </div>

        <FormField label={t("maintenanceRecords.fields.nextDueDate")} htmlFor="next_due_date">
          <input
            id="next_due_date"
            type="date"
            value={form.next_due_date}
            onChange={handleChange("next_due_date")}
            className={inputClass}
          />
        </FormField>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </Modal>
  );
}
