import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import { supabase } from "../lib/supabaseClient";

const QUOTE_STATUS_BADGE = {
  draft: "bg-gray-100 text-gray-600",
  sent: "bg-amber-100 text-amber-700",
  accepted: "bg-brand-100 text-brand-700",
  rejected: "bg-red-100 text-red-700",
  expired: "bg-red-100 text-red-700",
  converted: "bg-brand-100 text-brand-700",
};
const ORDER_STATUS_BADGE = {
  draft: "bg-gray-100 text-gray-600",
  confirmed: "bg-brand-100 text-brand-700",
  in_preparation: "bg-amber-100 text-amber-700",
  partially_delivered: "bg-amber-100 text-amber-700",
  delivered: "bg-brand-100 text-brand-700",
  invoiced: "bg-brand-100 text-brand-700",
  paid: "bg-brand-100 text-brand-700",
  closed: "bg-cream-soft text-ink-muted",
  cancelled: "bg-red-100 text-red-700",
};
const DELIVERY_STATUS_BADGE = {
  draft: "bg-gray-100 text-gray-600",
  confirmed: "bg-brand-100 text-brand-700",
  reversed: "bg-red-100 text-red-700",
};
const INVOICE_STATUS_BADGE = {
  unpaid: "bg-red-100 text-red-700",
  partial: "bg-amber-100 text-amber-700",
  paid: "bg-brand-100 text-brand-700",
};

function Badge({ map, value, label }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${map[value] || "bg-gray-100 text-gray-600"}`}>
      {label}
    </span>
  );
}

export default function CustomerHistoryPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { customerId } = useParams();
  const [customer, setCustomer] = useState(null);
  const [quotes, setQuotes] = useState(null);
  const [orders, setOrders] = useState(null);
  const [deliveries, setDeliveries] = useState(null);
  const [invoices, setInvoices] = useState(null);
  const [ledger, setLedger] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    const [
      { data: customerData, error: customerError },
      { data: quotesData },
      { data: ordersData },
      { data: deliveriesData },
      { data: invoicesData },
    ] = await Promise.all([
      supabase.from("customers").select("id, name, code, status, credit_limit, payment_delay_days, currency").eq("id", customerId).single(),
      supabase.from("quotes").select("id, quote_no, status, valid_until, created_at").eq("customer_id", customerId).order("created_at", { ascending: false }),
      supabase.from("sales_orders").select("id, order_no, status, created_at").eq("customer_id", customerId).order("created_at", { ascending: false }),
      supabase.from("deliveries").select("id, delivery_no, status, delivered_at, sales_orders:sales_order_id(order_no)").eq("customer_id", customerId).order("delivered_at", { ascending: false }),
      supabase.from("customer_invoices").select("id, invoice_no, status, invoice_date, due_date, total_amount").eq("customer_id", customerId).order("invoice_date", { ascending: false }),
    ]);

    if (customerError) {
      setError(customerError.message);
      return;
    }
    setCustomer(customerData);
    setQuotes(quotesData || []);
    setOrders(ordersData || []);
    setDeliveries(deliveriesData || []);
    setInvoices(invoicesData || []);

    const invoiceIds = (invoicesData || []).map((i) => i.id);
    if (invoiceIds.length === 0) {
      setLedger([]);
      return;
    }
    const [{ data: paymentsData }, { data: creditNotesData }] = await Promise.all([
      supabase.from("customer_payments").select("id, customer_invoice_id, amount, paid_at").in("customer_invoice_id", invoiceIds),
      supabase.from("credit_notes").select("id, customer_invoice_id, credit_no, amount, reason, credit_date").in("customer_invoice_id", invoiceIds),
    ]);
    const invoiceNoById = Object.fromEntries((invoicesData || []).map((i) => [i.id, i.invoice_no]));
    const combined = [
      ...(paymentsData || []).map((p) => ({
        id: `pay-${p.id}`,
        type: "payment",
        date: p.paid_at,
        amount: Number(p.amount),
        invoiceNo: invoiceNoById[p.customer_invoice_id],
        label: null,
      })),
      ...(creditNotesData || []).map((c) => ({
        id: `credit-${c.id}`,
        type: "credit",
        date: c.credit_date,
        amount: Number(c.amount),
        invoiceNo: invoiceNoById[c.customer_invoice_id],
        label: `${c.credit_no} — ${c.reason}`,
      })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date));
    setLedger(combined);
  }, [customerId]);

  useEffect(() => {
    setCustomer(null);
    load();
  }, [load]);

  const totals = useMemo(() => {
    if (!invoices || !ledger) return null;
    const totalInvoiced = invoices.reduce((s, i) => s + Number(i.total_amount), 0);
    const totalPaid = ledger.filter((l) => l.type === "payment").reduce((s, l) => s + l.amount, 0);
    const totalCredited = ledger.filter((l) => l.type === "credit").reduce((s, l) => s + l.amount, 0);
    return { totalInvoiced, totalPaid, totalCredited, balanceDue: totalInvoiced - totalPaid - totalCredited };
  }, [invoices, ledger]);

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate("/customers")}
          className="flex h-9 w-9 items-center justify-center rounded-control text-ink-muted hover:bg-cream-soft"
        >
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
        </button>
        <h1 className="text-2xl font-semibold text-ink">
          {t("customerHistory.title")} {customer ? `— ${customer.name}` : ""}
        </h1>
      </div>

      {customer === null ? (
        <p className="py-8 text-center text-sm text-ink-muted">{t("common.loading")}</p>
      ) : (
        <>
          {totals && (
            <Card title={t("customerHistory.summary")}>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <p className="text-xs text-ink-muted">{t("customerHistory.totalInvoiced")}</p>
                  <p className="text-lg font-semibold text-ink">{totals.totalInvoiced.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-ink-muted">{t("customerHistory.totalPaid")}</p>
                  <p className="text-lg font-semibold text-ink">{totals.totalPaid.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-ink-muted">{t("customerHistory.totalCredited")}</p>
                  <p className="text-lg font-semibold text-ink">{totals.totalCredited.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-ink-muted">{t("customerHistory.balanceDue")}</p>
                  <p className={`text-lg font-semibold ${totals.balanceDue > 0 ? "text-red-600" : "text-brand-700"}`}>
                    {totals.balanceDue.toFixed(2)}
                  </p>
                </div>
              </div>
            </Card>
          )}

          <Card title={t("customerHistory.quotes")}>
            {quotes.length === 0 ? (
              <EmptyState message={t("common.noData")} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-start text-sm">
                  <tbody>
                    {quotes.map((q) => (
                      <tr key={q.id} className="border-b border-border last:border-0">
                        <td className="px-2 py-2 font-mono text-xs">{q.quote_no}</td>
                        <td className="px-2 py-2 text-ink-muted">{q.valid_until || "—"}</td>
                        <td className="px-2 py-2">
                          <Badge map={QUOTE_STATUS_BADGE} value={q.status} label={t(`quotes.status.${q.status}`)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card title={t("customerHistory.orders")}>
            {orders.length === 0 ? (
              <EmptyState message={t("common.noData")} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-start text-sm">
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.id} className="border-b border-border last:border-0">
                        <td className="px-2 py-2 font-mono text-xs">{o.order_no}</td>
                        <td className="px-2 py-2">
                          <Badge map={ORDER_STATUS_BADGE} value={o.status} label={t(`salesOrders.status.${o.status}`)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card title={t("customerHistory.deliveries")}>
            {deliveries.length === 0 ? (
              <EmptyState message={t("common.noData")} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-start text-sm">
                  <tbody>
                    {deliveries.map((d) => (
                      <tr key={d.id} className="border-b border-border last:border-0">
                        <td className="px-2 py-2 font-mono text-xs">{d.delivery_no}</td>
                        <td className="px-2 py-2 text-ink-muted">{d.sales_orders?.order_no || "—"}</td>
                        <td className="px-2 py-2 text-ink-muted">{new Date(d.delivered_at).toLocaleDateString()}</td>
                        <td className="px-2 py-2">
                          <Badge map={DELIVERY_STATUS_BADGE} value={d.status} label={t(`deliveries.status.${d.status}`)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card title={t("customerHistory.invoices")}>
            {invoices.length === 0 ? (
              <EmptyState message={t("common.noData")} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-start text-sm">
                  <tbody>
                    {invoices.map((i) => (
                      <tr key={i.id} className="border-b border-border last:border-0">
                        <td className="px-2 py-2 font-mono text-xs">{i.invoice_no}</td>
                        <td className="px-2 py-2 text-ink-muted">{i.invoice_date}</td>
                        <td className="px-2 py-2 font-medium text-ink">{Number(i.total_amount).toFixed(2)}</td>
                        <td className="px-2 py-2">
                          <Badge map={INVOICE_STATUS_BADGE} value={i.status} label={t(`customerInvoices.status.${i.status}`)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card title={t("customerHistory.ledger")}>
            {ledger.length === 0 ? (
              <EmptyState message={t("common.noData")} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-start text-sm">
                  <tbody>
                    {ledger.map((l) => (
                      <tr key={l.id} className="border-b border-border last:border-0">
                        <td className="px-2 py-2 text-ink-muted">{l.date}</td>
                        <td className="px-2 py-2 font-mono text-xs">{l.invoiceNo || "—"}</td>
                        <td className="px-2 py-2 text-ink-muted">
                          {l.type === "payment" ? t("customerHistory.payment") : l.label}
                        </td>
                        <td className={`px-2 py-2 font-medium ${l.type === "credit" ? "text-amber-700" : "text-brand-700"}`}>
                          {l.type === "credit" ? "-" : ""}
                          {l.amount.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
