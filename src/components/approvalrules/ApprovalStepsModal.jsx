import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2 } from "lucide-react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import FormField, { inputClass } from "../ui/FormField";
import { supabase } from "../../lib/supabaseClient";

export default function ApprovalStepsModal({ open, rule, onClose }) {
  const { t, i18n } = useTranslation();
  const [steps, setSteps] = useState(null);
  const [roles, setRoles] = useState([]);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const loadSteps = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from("approval_steps")
      .select("id, step_order, approver_role_id, label, roles:approver_role_id(label_ar, label_fr)")
      .eq("approval_rule_id", rule.id)
      .order("step_order", { ascending: true });
    if (fetchError) {
      setError(fetchError.message);
      setSteps([]);
      return;
    }
    setSteps(data);
  }, [rule.id]);

  useEffect(() => {
    loadSteps();
    supabase
      .from("roles")
      .select("id, label_ar, label_fr")
      .then(({ data }) => setRoles(data || []));
  }, [loadSteps]);

  const roleLabel = (r) => (i18n.language === "ar" ? r?.label_ar || r?.label_fr : r?.label_fr || r?.label_ar);

  const startAdd = () => {
    const nextOrder = steps && steps.length > 0 ? Math.max(...steps.map((s) => s.step_order)) + 1 : 1;
    setForm({ step_order: String(nextOrder), approver_role_id: "", label: "" });
  };

  const handleSaveStep = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const { error: insertError } = await supabase.from("approval_steps").insert({
        approval_rule_id: rule.id,
        step_order: Number(form.step_order),
        approver_role_id: form.approver_role_id,
        label: form.label.trim() || null,
      });
      if (insertError) throw insertError;
      setForm(null);
      await loadSteps();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStep = async (stepId) => {
    setSaving(true);
    setError(null);
    try {
      const { error: deleteError } = await supabase.from("approval_steps").delete().eq("id", stepId);
      if (deleteError) throw deleteError;
      await loadSteps();
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
      title={t("approvalRules.steps.title")}
      footer={
        <Button variant="secondary" onClick={onClose}>
          {t("common.cancel")}
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="rounded-control bg-cream-soft px-3 py-2 text-xs text-ink-muted">
          {t("approvalRules.steps.zeroStepsHint")}
        </p>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {!form && (
          <Button onClick={startAdd} className="self-start">
            <Plus className="h-4 w-4" />
            {t("approvalRules.steps.addStep")}
          </Button>
        )}

        {form && (
          <form onSubmit={handleSaveStep} className="flex flex-col gap-3 rounded-control border border-border p-3">
            <div className="grid grid-cols-2 gap-3">
              <FormField label={t("approvalRules.steps.stepOrder")} htmlFor="step_order">
                <input
                  id="step_order"
                  type="number"
                  required
                  min="1"
                  value={form.step_order}
                  onChange={(e) => setForm((f) => ({ ...f, step_order: e.target.value }))}
                  className={inputClass}
                />
              </FormField>
              <FormField label={t("approvalRules.steps.approverRole")} htmlFor="approver_role_id">
                <select
                  id="approver_role_id"
                  required
                  value={form.approver_role_id}
                  onChange={(e) => setForm((f) => ({ ...f, approver_role_id: e.target.value }))}
                  className={inputClass}
                >
                  <option value="" disabled>
                    {t("approvalRules.steps.selectRole")}
                  </option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {roleLabel(r)}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>
            <FormField label={t("approvalRules.steps.label")} htmlFor="label">
              <input
                id="label"
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                className={inputClass}
              />
            </FormField>
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

        {steps === null ? (
          <p className="py-4 text-center text-sm text-ink-muted">{t("common.loading")}</p>
        ) : steps.length === 0 ? (
          <p className="py-4 text-center text-sm text-ink-muted">{t("approvalRules.steps.noSteps")}</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {steps.map((step) => (
              <li
                key={step.id}
                className="flex items-center justify-between rounded-control border border-border px-3 py-2"
              >
                <div>
                  <span className="me-2 font-mono text-xs text-ink-muted">#{step.step_order}</span>
                  <span className="text-sm font-medium text-ink">{step.label || roleLabel(step.roles)}</span>
                  {step.label && <span className="ms-2 text-xs text-ink-muted">({roleLabel(step.roles)})</span>}
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteStep(step.id)}
                  disabled={saving}
                  className="flex h-7 w-7 items-center justify-center rounded-control text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
