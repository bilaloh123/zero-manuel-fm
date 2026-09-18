import { useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import FormField, { inputClass } from "../ui/FormField";
import { supabase } from "../../lib/supabaseClient";
import { useFarmOptions } from "../../hooks/useFarmOptions";

const EMPLOYMENT_TYPE_OPTIONS = ["permanent", "seasonal", "daily"];
const STATUS_OPTIONS = ["active", "inactive"];

function toFormState(employee, defaultFarmId) {
  return {
    farm_id: employee?.farm_id ?? defaultFarmId ?? "",
    employee_no: employee?.employee_no ?? "",
    cin: employee?.cin ?? "",
    full_name: employee?.full_name ?? "",
    phone: employee?.phone ?? "",
    address: employee?.address ?? "",
    job_title: employee?.job_title ?? "",
    hire_date: employee?.hire_date ?? "",
    cnss_no: employee?.cnss_no ?? "",
    employment_type: employee?.employment_type ?? "permanent",
    status: employee?.status ?? "active",
  };
}

export default function EmployeeFormModal({ open, employee, defaultFarmId, onClose, onSaved }) {
  const { t } = useTranslation();
  const { farms } = useFarmOptions();
  const [form, setForm] = useState(() => toFormState(employee, defaultFarmId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const isEdit = !!employee;

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
      const strOrNull = (v) => (v.trim ? v.trim() || null : v || null);
      const payload = {
        farm_id: form.farm_id,
        employee_no: strOrNull(form.employee_no),
        cin: strOrNull(form.cin),
        full_name: form.full_name.trim(),
        phone: strOrNull(form.phone),
        address: strOrNull(form.address),
        job_title: strOrNull(form.job_title),
        hire_date: form.hire_date || null,
        cnss_no: strOrNull(form.cnss_no),
        employment_type: form.employment_type,
        status: form.status,
      };
      if (isEdit) {
        const { error: updateError } = await supabase.from("employees").update(payload).eq("id", employee.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from("employees").insert(payload);
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
      title={isEdit ? t("employees.edit") : t("employees.addTitle")}
      footer={
        <>
          <Button variant="secondary" onClick={resetAndClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="employee-form" disabled={saving}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      <form id="employee-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label={t("employees.fields.farm")} htmlFor="farm_id">
            <select
              id="farm_id"
              required
              value={form.farm_id}
              onChange={handleChange("farm_id")}
              className={inputClass}
            >
              <option value="" disabled>
                {t("employees.fields.farm")}
              </option>
              {farms.map((farm) => (
                <option key={farm.id} value={farm.id}>
                  {farm.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label={t("employees.fields.fullName")} htmlFor="full_name">
            <input
              id="full_name"
              required
              value={form.full_name}
              onChange={handleChange("full_name")}
              className={inputClass}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label={t("employees.fields.employeeNo")} htmlFor="employee_no">
            <input
              id="employee_no"
              value={form.employee_no}
              onChange={handleChange("employee_no")}
              className={inputClass}
            />
          </FormField>
          <FormField label={t("employees.fields.cin")} htmlFor="cin">
            <input id="cin" value={form.cin} onChange={handleChange("cin")} className={inputClass} />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label={t("employees.fields.phone")} htmlFor="phone">
            <input id="phone" value={form.phone} onChange={handleChange("phone")} className={inputClass} />
          </FormField>
          <FormField label={t("employees.fields.jobTitle")} htmlFor="job_title">
            <input
              id="job_title"
              value={form.job_title}
              onChange={handleChange("job_title")}
              className={inputClass}
            />
          </FormField>
        </div>

        <FormField label={t("employees.fields.address")} htmlFor="address">
          <input id="address" value={form.address} onChange={handleChange("address")} className={inputClass} />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label={t("employees.fields.hireDate")} htmlFor="hire_date">
            <input
              id="hire_date"
              type="date"
              value={form.hire_date}
              onChange={handleChange("hire_date")}
              className={inputClass}
            />
          </FormField>
          <FormField label={t("employees.fields.cnssNo")} htmlFor="cnss_no">
            <input
              id="cnss_no"
              value={form.cnss_no}
              onChange={handleChange("cnss_no")}
              className={inputClass}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label={t("employees.fields.employmentType")} htmlFor="employment_type">
            <select
              id="employment_type"
              required
              value={form.employment_type}
              onChange={handleChange("employment_type")}
              className={inputClass}
            >
              {EMPLOYMENT_TYPE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {t(`employees.employmentType.${opt}`)}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label={t("employees.fields.status")} htmlFor="status">
            <select id="status" value={form.status} onChange={handleChange("status")} className={inputClass}>
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {t(`employees.status.${opt}`)}
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
