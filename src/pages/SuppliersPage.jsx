import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2 } from "lucide-react";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import SupplierFormModal from "../components/suppliers/SupplierFormModal";
import { supabase } from "../lib/supabaseClient";

export default function SuppliersPage() {
  const { t } = useTranslation();
  const [suppliers, setSuppliers] = useState(null);
  const [error, setError] = useState(null);
  const [formState, setFormState] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadSuppliers = useCallback(async () => {
    setError(null);
    const { data, error: fetchError } = await supabase
      .from("suppliers")
      .select("id, company_name, contact_name, phone, lead_time_days")
      .order("company_name", { ascending: true });
    if (fetchError) {
      setError(fetchError.message);
      setSuppliers([]);
      return;
    }
    setSuppliers(data);
  }, []);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error: deleteError } = await supabase.from("suppliers").delete().eq("id", deleteTarget.id);
      if (deleteError) throw deleteError;
      setDeleteTarget(null);
      await loadSuppliers();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">{t("suppliers.title")}</h1>
        <Button onClick={() => setFormState({ supplier: null })}>
          <Plus className="h-4 w-4" />
          {t("suppliers.add")}
        </Button>
      </div>

      <Card>
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {suppliers === null ? (
          <p className="py-8 text-center text-sm text-ink-muted">{t("common.loading")}</p>
        ) : suppliers.length === 0 ? (
          <EmptyState message={t("common.noData")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead>
                <tr className="border-b border-border text-ink-muted">
                  <th className="px-3 py-2 text-start font-medium">{t("suppliers.columns.companyName")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("suppliers.columns.contactName")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("suppliers.columns.phone")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("suppliers.columns.leadTime")}</th>
                  <th className="px-3 py-2 text-end font-medium">{t("suppliers.columns.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((supplier) => (
                  <tr key={supplier.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-3 font-medium text-ink">{supplier.company_name}</td>
                    <td className="px-3 py-3 text-ink-muted">{supplier.contact_name || "—"}</td>
                    <td className="px-3 py-3 text-ink-muted">{supplier.phone || "—"}</td>
                    <td className="px-3 py-3 text-ink-muted">{supplier.lead_time_days ?? "—"}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setFormState({ supplier })}
                          className="flex h-8 w-8 items-center justify-center rounded-control text-ink-muted hover:bg-cream-soft"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(supplier)}
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

      {formState && (
        <SupplierFormModal
          open
          supplier={formState.supplier}
          onClose={() => setFormState(null)}
          onSaved={loadSuppliers}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          open
          title={t("suppliers.deleteConfirmTitle")}
          message={t("suppliers.deleteConfirmMessage", { name: deleteTarget.company_name })}
          confirming={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
