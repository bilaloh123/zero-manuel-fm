import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2, ListOrdered } from "lucide-react";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import ApprovalRuleFormModal from "../components/approvalrules/ApprovalRuleFormModal";
import ApprovalStepsModal from "../components/approvalrules/ApprovalStepsModal";
import { supabase } from "../lib/supabaseClient";

export default function ApprovalRulesPage() {
  const { t } = useTranslation();
  const [rules, setRules] = useState(null);
  const [error, setError] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [stepsTarget, setStepsTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadRules = useCallback(async () => {
    setError(null);
    const { data, error: fetchError } = await supabase
      .from("approval_rules")
      .select("id, operation_type, farm_id, min_amount, max_amount, active, farms:farm_id(name)")
      .order("operation_type", { ascending: true })
      .order("min_amount", { ascending: true });
    if (fetchError) {
      setError(fetchError.message);
      setRules([]);
      return;
    }
    setRules(data);
  }, []);

  useEffect(() => {
    setRules(null);
    loadRules();
  }, [loadRules]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error: deleteError } = await supabase.from("approval_rules").delete().eq("id", deleteTarget.id);
      if (deleteError) throw deleteError;
      setDeleteTarget(null);
      await loadRules();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">{t("approvalRules.title")}</h1>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" />
          {t("approvalRules.add")}
        </Button>
      </div>

      <Card>
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {rules === null ? (
          <p className="py-8 text-center text-sm text-ink-muted">{t("common.loading")}</p>
        ) : rules.length === 0 ? (
          <EmptyState message={t("common.noData")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead>
                <tr className="border-b border-border text-ink-muted">
                  <th className="px-3 py-2 text-start font-medium">{t("approvalRules.columns.operationType")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("approvalRules.columns.farm")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("approvalRules.columns.range")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("approvalRules.columns.active")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("approvalRules.steps.title")}</th>
                  <th className="px-3 py-2 text-end font-medium">{t("approvalRules.columns.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((rule) => (
                  <tr key={rule.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-3 font-medium text-ink">{t(`approvalRules.operationTypes.${rule.operation_type}`)}</td>
                    <td className="px-3 py-3 text-ink-muted">{rule.farms?.name || t("approvalRules.globalRule")}</td>
                    <td className="px-3 py-3 text-ink-muted">
                      {rule.min_amount} → {rule.max_amount ?? "∞"}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          rule.active ? "bg-brand-100 text-brand-700" : "bg-cream-soft text-ink-muted"
                        }`}
                      >
                        {rule.active ? t("common.yes") : t("common.no")}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => setStepsTarget(rule)}
                        className="inline-flex items-center gap-1.5 rounded-control border border-border px-2.5 py-1 text-xs font-medium text-ink hover:bg-cream-soft"
                      >
                        <ListOrdered className="h-3.5 w-3.5" />
                        {t("approvalRules.steps.manage")}
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(rule)}
                          className="flex h-8 w-8 items-center justify-center rounded-control text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {formOpen && <ApprovalRuleFormModal open onClose={() => setFormOpen(false)} onSaved={loadRules} />}

      {stepsTarget && <ApprovalStepsModal open rule={stepsTarget} onClose={() => setStepsTarget(null)} />}

      {deleteTarget && (
        <ConfirmDialog
          open
          title={t("approvalRules.deleteConfirmTitle")}
          message={t("approvalRules.deleteConfirmMessage")}
          confirming={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
