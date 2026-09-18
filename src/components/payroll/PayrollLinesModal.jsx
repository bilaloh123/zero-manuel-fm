import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2 } from "lucide-react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import FormField, { inputClass } from "../ui/FormField";
import { supabase } from "../../lib/supabaseClient";
import { useEmployeeOptions } from "../../hooks/useEmployeeOptions";

const NUMERIC_FIELDS = [
  "base_pay",
  "days_worked",
  "hours",
  "overtime_pay",
  "bonuses",
  "advances",
  "deductions",
  "cnss",
  "net_pay",
];

function emptyLineForm() {
  return {
    employee_id: "",
    base_pay: "0",
    days_worked: "0",
    hours: "0",
    overtime_pay: "0",
    bonuses: "0",
    advances: "0",
    deductions: "0",
    cnss: "0",
    net_pay: "0",
  };
}

export default function PayrollLinesModal({ open, period, onClose }) {
  const { t } = useTranslation();
  const { employees } = useEmployeeOptions(period.farm_id);
  const [lines, setLines] = useState(null);
  const [error, setError] = useState(null);
  const [editingLine, setEditingLine] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadLines = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from("payroll_lines")
      .select(
        "id, employee_id, base_pay, days_worked, hours, overtime_pay, bonuses, advances, deductions, cnss, net_pay, employees:employee_id(full_name)"
      )
      .eq("payroll_period_id", period.id)
      .order("id", { ascending: true });
    if (fetchError) {
      setError(fetchError.message);
      setLines([]);
      return;
    }
    setLines(data);
  }, [period.id]);

  useEffect(() => {
    loadLines();
  }, [loadLines]);

  const startAdd = () => {
    setEditingLine(null);
    setForm(emptyLineForm());
  };

  const startEdit = (line) => {
    setEditingLine(line);
    setForm({
      employee_id: line.employee_id,
      base_pay: String(line.base_pay ?? 0),
      days_worked: String(line.days_worked ?? 0),
      hours: String(line.hours ?? 0),
      overtime_pay: String(line.overtime_pay ?? 0),
      bonuses: String(line.bonuses ?? 0),
      advances: String(line.advances ?? 0),
      deductions: String(line.deductions ?? 0),
      cnss: String(line.cnss ?? 0),
      net_pay: String(line.net_pay ?? 0),
    });
  };

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSaveLine = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = { payroll_period_id: period.id, employee_id: form.employee_id };
      NUMERIC_FIELDS.forEach((field) => {
        payload[field] = Number(form[field] || 0);
      });
      if (editingLine) {
        const { error: updateError } = await supabase
          .from("payroll_lines")
          .update(payload)
          .eq("id", editingLine.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from("payroll_lines").insert(payload);
        if (insertError) throw insertError;
      }
      setForm(null);
      setEditingLine(null);
      await loadLines();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLine = async (lineId) => {
    setSaving(true);
    setError(null);
    try {
      const { error: deleteError } = await supabase.from("payroll_lines").delete().eq("id", lineId);
      if (deleteError) throw deleteError;
      await loadLines();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${t("payroll.lines.title")} — ${period.period_start} → ${period.period_end}`}
      footer={
        <Button variant="secondary" onClick={onClose}>
          {t("common.cancel")}
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        {error && <p className="text-sm text-red-600">{error}</p>}

        {!form && (
          <Button onClick={startAdd} className="self-start">
            <Plus className="h-4 w-4" />
            {t("payroll.lines.addLine")}
          </Button>
        )}

        {form && (
          <form onSubmit={handleSaveLine} className="flex flex-col gap-3 rounded-control border border-border p-3">
            <FormField label={t("payroll.lines.employee")} htmlFor="employee_id">
              <select
                id="employee_id"
                required
                value={form.employee_id}
                onChange={handleChange("employee_id")}
                className={inputClass}
              >
                <option value="" disabled>
                  {t("payroll.lines.selectEmployee")}
                </option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.full_name}
                  </option>
                ))}
              </select>
            </FormField>

            <div className="grid grid-cols-3 gap-3">
              {NUMERIC_FIELDS.map((field) => (
                <FormField key={field} label={t(`payroll.lines.${toCamel(field)}`)} htmlFor={field}>
                  <input
                    id={field}
                    type="number"
                    step="0.01"
                    value={form[field]}
                    onChange={handleChange(field)}
                    className={inputClass}
                  />
                </FormField>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setForm(null)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={saving}>
                {t("common.save")}
              </Button>
            </div>
          </form>
        )}

        {lines === null ? (
          <p className="py-4 text-center text-sm text-ink-muted">{t("common.loading")}</p>
        ) : lines.length === 0 ? (
          <p className="py-4 text-center text-sm text-ink-muted">{t("payroll.lines.noLines")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead>
                <tr className="border-b border-border text-ink-muted">
                  <th className="px-2 py-1.5 text-start font-medium">{t("payroll.lines.employee")}</th>
                  <th className="px-2 py-1.5 text-start font-medium">{t("payroll.lines.basePay")}</th>
                  <th className="px-2 py-1.5 text-start font-medium">{t("payroll.lines.netPay")}</th>
                  <th className="px-2 py-1.5 text-end font-medium" />
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr key={line.id} className="border-b border-border last:border-0">
                    <td className="px-2 py-2 text-ink">{line.employees?.full_name || "—"}</td>
                    <td className="px-2 py-2 text-ink-muted">{line.base_pay}</td>
                    <td className="px-2 py-2 font-medium text-ink">{line.net_pay}</td>
                    <td className="px-2 py-2">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => startEdit(line)}
                          className="flex h-7 w-7 items-center justify-center rounded-control text-ink-muted hover:bg-cream-soft"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteLine(line.id)}
                          className="flex h-7 w-7 items-center justify-center rounded-control text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Modal>
  );
}

function toCamel(field) {
  return field.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}
