import { useState } from "react";
import { useTranslation } from "react-i18next";
import { WifiOff } from "lucide-react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import FormField, { inputClass } from "../ui/FormField";
import { supabase } from "../../lib/supabaseClient";
import { enqueueMutation, createId } from "../../offline/queue";
import { useFarmOptions } from "../../hooks/useFarmOptions";
import { useEmployeeOptions } from "../../hooks/useEmployeeOptions";

const STATUS_OPTIONS = ["present", "absent", "leave"];

function toLocalInput(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(localString) {
  if (!localString) return null;
  return new Date(localString).toISOString();
}

function computeHours(checkIn, checkOut) {
  if (!checkIn || !checkOut) return "";
  const diffMs = new Date(checkOut) - new Date(checkIn);
  if (diffMs <= 0) return "";
  return (diffMs / 1000 / 60 / 60).toFixed(2);
}

function toFormState(record, defaultFarmId) {
  return {
    farm_id: record?.farm_id ?? defaultFarmId ?? "",
    employee_id: record?.employee_id ?? "",
    check_in: toLocalInput(record?.check_in),
    check_out: toLocalInput(record?.check_out),
    hours_worked: record?.hours_worked ?? "",
    status: record?.status ?? "present",
  };
}

export default function AttendanceFormModal({ open, record, defaultFarmId, onClose, onSaved }) {
  const { t } = useTranslation();
  const { farms } = useFarmOptions();
  const [form, setForm] = useState(() => toFormState(record, defaultFarmId));
  const { employees } = useEmployeeOptions(form.farm_id);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [savedOffline, setSavedOffline] = useState(false);

  const isEdit = !!record;

  const resetAndClose = () => {
    setForm(toFormState(null, defaultFarmId));
    setError(null);
    setSavedOffline(false);
    onClose();
  };

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleFarmChange = (e) => {
    const farm_id = e.target.value;
    setForm((f) => ({ ...f, farm_id, employee_id: "" }));
  };

  const handleTimeChange = (field) => (e) => {
    const value = e.target.value;
    setForm((f) => {
      const next = { ...f, [field]: value };
      const autoHours = computeHours(
        field === "check_in" ? value : f.check_in,
        field === "check_out" ? value : f.check_out
      );
      if (autoHours !== "") next.hours_worked = autoHours;
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        farm_id: form.farm_id,
        employee_id: form.employee_id,
        check_in: fromLocalInput(form.check_in),
        check_out: fromLocalInput(form.check_out),
        hours_worked: form.hours_worked === "" ? null : Number(form.hours_worked),
        status: form.status,
      };
      if (isEdit) {
        // Editing an existing record is online-only for now — it implies
        // the row already exists (created and presumably already synced),
        // a much rarer field scenario than a fresh check-in. Only new
        // check-ins go through the offline queue.
        const { error: updateError } = await supabase.from("attendance").update(payload).eq("id", record.id);
        if (updateError) throw updateError;
        onSaved();
        resetAndClose();
      } else {
        const wasOffline = !navigator.onLine;
        await enqueueMutation({ table: "attendance", payload: { id: createId(), ...payload } });
        onSaved();
        if (wasOffline) {
          setSaving(false);
          setSavedOffline(true);
          setTimeout(resetAndClose, 1500);
        } else {
          resetAndClose();
        }
      }
      return;
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
      title={isEdit ? t("attendance.edit") : t("attendance.addTitle")}
      footer={
        <>
          <Button variant="secondary" onClick={resetAndClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="attendance-form" disabled={saving}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      <form id="attendance-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        {savedOffline && (
          <div className="flex items-center gap-2 rounded-control bg-amber-100 px-3 py-2 text-sm font-medium text-amber-800">
            <WifiOff className="h-4 w-4 shrink-0" />
            {t("common.offlineSaved")}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label={t("attendance.fields.farm")} htmlFor="farm_id">
            <select id="farm_id" required value={form.farm_id} onChange={handleFarmChange} className={inputClass}>
              <option value="" disabled>
                {t("attendance.fields.farm")}
              </option>
              {farms.map((farm) => (
                <option key={farm.id} value={farm.id}>
                  {farm.name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label={t("attendance.fields.employee")} htmlFor="employee_id">
            <select
              id="employee_id"
              required
              disabled={!form.farm_id}
              value={form.employee_id}
              onChange={handleChange("employee_id")}
              className={inputClass}
            >
              <option value="" disabled>
                {t("attendance.fields.employee")}
              </option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.full_name}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label={t("attendance.fields.checkIn")} htmlFor="check_in">
            <input
              id="check_in"
              type="datetime-local"
              value={form.check_in}
              onChange={handleTimeChange("check_in")}
              className={inputClass}
            />
          </FormField>
          <FormField label={t("attendance.fields.checkOut")} htmlFor="check_out">
            <input
              id="check_out"
              type="datetime-local"
              value={form.check_out}
              onChange={handleTimeChange("check_out")}
              className={inputClass}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label={t("attendance.fields.hoursWorked")} htmlFor="hours_worked">
            <input
              id="hours_worked"
              type="number"
              step="0.01"
              min="0"
              value={form.hours_worked}
              onChange={handleChange("hours_worked")}
              className={inputClass}
            />
          </FormField>
          <FormField label={t("attendance.fields.status")} htmlFor="status">
            <select id="status" value={form.status} onChange={handleChange("status")} className={inputClass}>
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {t(`attendance.status.${opt}`)}
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
