import { useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import FormField, { inputClass } from "../ui/FormField";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { useFarmOptions } from "../../hooks/useFarmOptions";

const OPERATION_TYPE_OPTIONS = ["purchase_order"];

function emptyForm() {
  return {
    operation_type: OPERATION_TYPE_OPTIONS[0],
    farm_id: "",
    min_amount: "0",
    max_amount: "",
    active: true,
  };
}

export default function ApprovalRuleFormModal({ open, onClose, onSaved }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { farms } = useFarmOptions();
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const resetAndClose = () => {
    setForm(emptyForm());
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
        operation_type: form.operation_type,
        farm_id: form.farm_id || null,
        min_amount: Number(form.min_amount) || 0,
        max_amount: form.max_amount === "" ? null : Number(form.max_amount),
        active: form.active,
        created_by: user.id,
      };
      const { error: insertError } = await supabase.from("approval_rules").insert(payload);
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
      title={t("approvalRules.addTitle")}
      footer={
        <>
          <Button variant="secondary" onClick={resetAndClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="approval-rule-form" disabled={saving}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      <form id="approval-rule-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label={t("approvalRules.fields.operationType")} htmlFor="operation_type">
            <select id="operation_type" value={form.operation_type} onChange={handleChange("operation_type")} className={inputClass}>
              {OPERATION_TYPE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {t(`approvalRules.operationTypes.${opt}`)}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label={t("approvalRules.fields.farm")} htmlFor="farm_id">
            <select id="farm_id" value={form.farm_id} onChange={handleChange("farm_id")} className={inputClass}>
              <option value="">{t("approvalRules.globalRule")}</option>
              {farms.map((farm) => (
                <option key={farm.id} value={farm.id}>
                  {farm.name}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label={t("approvalRules.fields.minAmount")} htmlFor="min_amount">
            <input
              id="min_amount"
              type="number"
              required
              step="0.01"
              min="0"
              value={form.min_amount}
              onChange={handleChange("min_amount")}
              className={inputClass}
            />
          </FormField>
          <FormField label={t("approvalRules.fields.maxAmount")} htmlFor="max_amount">
            <input
              id="max_amount"
              type="number"
              step="0.01"
              min="0"
              placeholder={t("approvalRules.noLimit")}
              value={form.max_amount}
              onChange={handleChange("max_amount")}
              className={inputClass}
            />
          </FormField>
        </div>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
            className="h-4 w-4 rounded border-border"
          />
          <span className="text-sm text-ink">{t("approvalRules.fields.active")}</span>
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </Modal>
  );
}
