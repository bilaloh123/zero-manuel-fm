import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2, Wallet } from "lucide-react";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import GenerateInvoiceModal from "../components/customerinvoices/GenerateInvoiceModal";
import CustomerPaymentsModal from "../components/customerinvoices/CustomerPaymentsModal";
import { supabase } from "../lib/supabaseClient";
import { useFilters } from "../context/FiltersContext";

const STATUS_BADGE = {
  unpaid: "bg-red-100 text-red-700",
  partial: "bg-amber-100 text-amber-700",
  paid: "bg-brand-100 text-brand-700",
};

export default function CustomerInvoicesPage() {
  const { t } = useTranslation();
  const { farmId } = useFilters();
  const [invoices, setInvoices] = useState(null);
  const [error, setError] = useState(null);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [paymentsTarget, setPaymentsTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadInvoices = useCallback(async () => {
    setError(null);
    let query = supabase
      .from("customer_invoices")
      .select(
        "id, invoice_no, invoice_date, due_date, total_amount, status, sales_orders:sales_order_id(order_no), customers:customer_id(name)"
      )
      .order("invoice_date", { ascending: false });
    if (farmId !== "all") {
      query = query.eq("farm_id", farmId);
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
      const { error: unlinkError } = await supabase
        .from("delivery_items")
        .update({ customer_invoice_id: null })
        .eq("customer_invoice_id", deleteTarget.id);
      if (unlinkError) throw unlinkError;
      const { error: deleteError } = await supabase.from("customer_invoices").delete().eq("id", deleteTarget.id);
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
        <h1 className="text-2xl font-semibold text-ink">{t("customerInvoices.title")}</h1>
        <Button onClick={() => setGenerateOpen(true)}>
          <Plus className="h-4 w-4" />
          {t("customerInvoices.generateAction")}
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
                  <th className="px-3 py-2 text-start font-medium">{t("customerInvoices.columns.invoiceNo")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("customerInvoices.columns.order")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("customerInvoices.columns.customer")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("customerInvoices.columns.invoiceDate")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("customerInvoices.columns.dueDate")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("customerInvoices.columns.totalAmount")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("customerInvoices.columns.status")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("customerInvoices.managePayments")}</th>
                  <th className="px-3 py-2 text-end font-medium">{t("customerInvoices.columns.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-3 font-mono text-xs font-medium text-ink">{invoice.invoice_no}</td>
                    <td className="px-3 py-3 text-ink-muted">{invoice.sales_orders?.order_no || "—"}</td>
                    <td className="px-3 py-3 text-ink-muted">{invoice.customers?.name || "—"}</td>
                    <td className="px-3 py-3 text-ink-muted">{invoice.invoice_date}</td>
                    <td className="px-3 py-3 text-ink-muted">{invoice.due_date || "—"}</td>
                    <td className="px-3 py-3 font-medium text-ink">{Number(invoice.total_amount).toFixed(2)}</td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[invoice.status] || STATUS_BADGE.unpaid}`}
                      >
                        {t(`customerInvoices.status.${invoice.status}`)}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => setPaymentsTarget(invoice)}
                        className="inline-flex items-center gap-1.5 rounded-control border border-border px-2.5 py-1 text-xs font-medium text-ink hover:bg-cream-soft"
                      >
                        <Wallet className="h-3.5 w-3.5" />
                        {t("customerInvoices.managePayments")}
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {invoice.status === "unpaid" && (
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(invoice)}
                            className="flex h-8 w-8 items-center justify-center rounded-control text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {generateOpen && (
        <GenerateInvoiceModal open onClose={() => setGenerateOpen(false)} onGenerated={loadInvoices} />
      )}

      {paymentsTarget && (
        <CustomerPaymentsModal
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
          title={t("customerInvoices.deleteConfirmTitle")}
          message={t("customerInvoices.deleteConfirmMessage")}
          confirming={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
