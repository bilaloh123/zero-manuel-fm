import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2, Wallet } from "lucide-react";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import InvoiceFormModal from "../components/invoices/InvoiceFormModal";
import PaymentsModal from "../components/invoices/PaymentsModal";
import { supabase } from "../lib/supabaseClient";
import { useFilters } from "../context/FiltersContext";

const STATUS_BADGE = {
  unpaid: "bg-red-100 text-red-700",
  partial: "bg-amber-100 text-amber-700",
  paid: "bg-brand-100 text-brand-700",
};

export default function InvoicesPage() {
  const { t } = useTranslation();
  const { farmId } = useFilters();
  const [invoices, setInvoices] = useState(null);
  const [error, setError] = useState(null);
  const [formState, setFormState] = useState(null);
  const [paymentsTarget, setPaymentsTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadInvoices = useCallback(async () => {
    setError(null);
    let query = supabase
      .from("invoices")
      .select(
        "id, amount, due_date, status, paying_farm_id, farms:paying_farm_id(name), purchase_orders:purchase_order_id(suppliers:supplier_id(company_name))"
      )
      .order("due_date", { ascending: true });
    if (farmId !== "all") {
      query = query.eq("paying_farm_id", farmId);
    }
    const { data, error: fetchError } = await query;
    if (fetchError) {
      setError(fetchError.message);
      setInvoices([]);
      return;
    }
    setInvoices(data);
  }, [farmId]);

  useEffect(() => {
    setInvoices(null);
    loadInvoices();
  }, [loadInvoices]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error: deleteError } = await supabase.from("invoices").delete().eq("id", deleteTarget.id);
      if (deleteError) throw deleteError;
      setDeleteTarget(null);
      await loadInvoices();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">{t("invoices.title")}</h1>
        <Button onClick={() => setFormState({ invoice: null })}>
          <Plus className="h-4 w-4" />
          {t("invoices.add")}
        </Button>
      </div>

      <Card>
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {invoices === null ? (
          <p className="py-8 text-center text-sm text-ink-muted">{t("common.loading")}</p>
        ) : invoices.length === 0 ? (
          <EmptyState message={t("common.noData")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead>
                <tr className="border-b border-border text-ink-muted">
                  <th className="px-3 py-2 text-start font-medium">{t("invoices.columns.order")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("invoices.columns.farm")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("invoices.columns.amount")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("invoices.columns.dueDate")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("invoices.columns.status")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("invoices.managePayments")}</th>
                  <th className="px-3 py-2 text-end font-medium">{t("invoices.columns.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-3 font-medium text-ink">
                      {invoice.purchase_orders?.suppliers?.company_name || "—"}
                    </td>
                    <td className="px-3 py-3 text-ink-muted">{invoice.farms?.name || "—"}</td>
                    <td className="px-3 py-3 text-ink-muted">{invoice.amount}</td>
                    <td className="px-3 py-3 text-ink-muted">{invoice.due_date || "—"}</td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[invoice.status] || STATUS_BADGE.unpaid}`}
                      >
                        {t(`invoices.status.${invoice.status}`, invoice.status)}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => setPaymentsTarget(invoice)}
                        className="inline-flex items-center gap-1.5 rounded-control border border-border px-2.5 py-1 text-xs font-medium text-ink hover:bg-cream-soft"
                      >
                        <Wallet className="h-3.5 w-3.5" />
                        {t("invoices.managePayments")}
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setFormState({ invoice })}
                          className="flex h-8 w-8 items-center justify-center rounded-control text-ink-muted hover:bg-cream-soft"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(invoice)}
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
        <InvoiceFormModal
          open
          invoice={formState.invoice}
          defaultFarmId={farmId !== "all" ? farmId : undefined}
          onClose={() => setFormState(null)}
          onSaved={loadInvoices}
        />
      )}

      {paymentsTarget && (
        <PaymentsModal
          open
          invoice={paymentsTarget}
          onClose={() => {
            setPaymentsTarget(null);
            loadInvoices();
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          open
          title={t("invoices.deleteConfirmTitle")}
          message={t("invoices.deleteConfirmMessage")}
          confirming={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
