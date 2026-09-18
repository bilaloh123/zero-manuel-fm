import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2 } from "lucide-react";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import CustomerFormModal from "../components/customers/CustomerFormModal";
import { supabase } from "../lib/supabaseClient";

export default function CustomersPage() {
  const { t } = useTranslation();
  const [customers, setCustomers] = useState(null);
  const [error, setError] = useState(null);
  const [formState, setFormState] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadCustomers = useCallback(async () => {
    setError(null);
    const { data, error: fetchError } = await supabase
      .from("customers")
      .select("id, name, contact_info")
      .order("name", { ascending: true });
    if (fetchError) {
      setError(fetchError.message);
      setCustomers([]);
      return;
    }
    setCustomers(data);
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error: deleteError } = await supabase.from("customers").delete().eq("id", deleteTarget.id);
      if (deleteError) throw deleteError;
      setDeleteTarget(null);
      await loadCustomers();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">{t("customers.title")}</h1>
        <Button onClick={() => setFormState({ customer: null })}>
          <Plus className="h-4 w-4" />
          {t("customers.add")}
        </Button>
      </div>

      <Card>
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {customers === null ? (
          <p className="py-8 text-center text-sm text-ink-muted">{t("common.loading")}</p>
        ) : customers.length === 0 ? (
          <EmptyState message={t("common.noData")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead>
                <tr className="border-b border-border text-ink-muted">
                  <th className="px-3 py-2 text-start font-medium">{t("customers.columns.name")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("customers.columns.phone")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("customers.columns.email")}</th>
                  <th className="px-3 py-2 text-end font-medium">{t("customers.columns.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-3 font-medium text-ink">{customer.name}</td>
                    <td className="px-3 py-3 text-ink-muted">{customer.contact_info?.phone || "—"}</td>
                    <td className="px-3 py-3 text-ink-muted">{customer.contact_info?.email || "—"}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setFormState({ customer })}
                          className="flex h-8 w-8 items-center justify-center rounded-control text-ink-muted hover:bg-cream-soft"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(customer)}
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
        <CustomerFormModal
          open
          customer={formState.customer}
          onClose={() => setFormState(null)}
          onSaved={loadCustomers}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          open
          title={t("customers.deleteConfirmTitle")}
          message={t("customers.deleteConfirmMessage", { name: deleteTarget.name })}
          confirming={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
