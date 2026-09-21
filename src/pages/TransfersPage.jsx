import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, ArrowRight, XCircle, Paperclip } from "lucide-react";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";
import DocumentsModal from "../components/ui/DocumentsModal";
import TransferFormModal from "../components/transfers/TransferFormModal";
import TransferActionModal from "../components/transfers/TransferActionModal";
import { supabase } from "../lib/supabaseClient";
import { useFilters } from "../context/FiltersContext";

const NEXT_STATUS = {
  requested: "approved",
  approved: "reserved",
  reserved: "preparing",
  preparing: "out_for_delivery",
  out_for_delivery: "in_transit",
  in_transit: "received",
  received: "closed",
};

const CANCELABLE = ["requested", "approved", "reserved", "preparing", "out_for_delivery", "in_transit"];

const STATUS_BADGE = {
  requested: "bg-amber-100 text-amber-700",
  approved: "bg-blue-100 text-blue-700",
  reserved: "bg-blue-100 text-blue-700",
  preparing: "bg-blue-100 text-blue-700",
  out_for_delivery: "bg-purple-100 text-purple-700",
  in_transit: "bg-purple-100 text-purple-700",
  received: "bg-brand-100 text-brand-700",
  closed: "bg-gray-200 text-gray-700",
  cancelled: "bg-red-100 text-red-700",
};

function RowActions({ tr, t, onDocuments, onEdit, onAction }) {
  const next = NEXT_STATUS[tr.status];
  const cancelable = CANCELABLE.includes(tr.status);
  return (
    <div className="flex items-center justify-end gap-2 sm:gap-1">
      <button
        type="button"
        onClick={() => onDocuments(tr)}
        className="flex h-11 w-11 sm:h-8 sm:w-8 items-center justify-center rounded-control text-ink-muted hover:bg-cream-soft"
        title={t("documents.title")}
      >
        <Paperclip className="h-4 w-4" />
      </button>
      {tr.status === "requested" && (
        <button
          type="button"
          onClick={() => onEdit(tr)}
          className="flex h-11 w-11 sm:h-8 sm:w-8 items-center justify-center rounded-control text-ink-muted hover:bg-cream-soft"
        >
          <Pencil className="h-4 w-4" />
        </button>
      )}
      {next && (
        <button
          type="button"
          onClick={() => onAction(tr, next)}
          className="flex h-11 w-11 sm:h-8 sm:w-8 items-center justify-center rounded-control text-brand-600 hover:bg-brand-50"
          title={t(`transfers.actions.${next}`)}
        >
          <ArrowRight className="h-4 w-4" />
        </button>
      )}
      {cancelable && (
        <button
          type="button"
          onClick={() => onAction(tr, "cancelled")}
          className="flex h-11 w-11 sm:h-8 sm:w-8 items-center justify-center rounded-control text-red-600 hover:bg-red-50"
          title={t("transfers.actions.cancelled")}
        >
          <XCircle className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export default function TransfersPage() {
  const { t, i18n } = useTranslation();
  const { farmId } = useFilters();
  const [transfers, setTransfers] = useState(null);
  const [error, setError] = useState(null);
  const [formState, setFormState] = useState(null);
  const [actionState, setActionState] = useState(null);
  const [documentsTarget, setDocumentsTarget] = useState(null);

  const loadTransfers = useCallback(async () => {
    setError(null);
    let query = supabase
      .from("transfers")
      .select(
        "id, product_id, quantity, sent_quantity, received_quantity, variance, status, source_farm_id, destination_farm_id, photos, products:product_id(name_ar, name_fr, unit), source:source_farm_id(name), destination:destination_farm_id(name)"
      )
      .order("created_at", { ascending: false });
    if (farmId !== "all") {
      query = query.or(`source_farm_id.eq.${farmId},destination_farm_id.eq.${farmId}`);
    }
    const { data, error: fetchError } = await query;
    if (fetchError) {
      setError(fetchError.message);
      setTransfers([]);
      return;
    }
    setTransfers(data);
  }, [farmId]);

  useEffect(() => {
    setTransfers(null);
    loadTransfers();
  }, [loadTransfers]);

  const productLabel = (p) => (!p ? "—" : i18n.language === "ar" ? p.name_ar || p.name_fr : p.name_fr || p.name_ar);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">{t("transfers.title")}</h1>
        <Button onClick={() => setFormState({ transfer: null })}>
          <Plus className="h-4 w-4" />
          {t("transfers.add")}
        </Button>
      </div>

      <Card>
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {transfers === null ? (
          <p className="py-8 text-center text-sm text-ink-muted">{t("common.loading")}</p>
        ) : transfers.length === 0 ? (
          <EmptyState message={t("common.noData")} />
        ) : (
          <>
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-start text-sm">
                <thead>
                  <tr className="border-b border-border text-ink-muted">
                    <th className="px-3 py-2 text-start font-medium">{t("transfers.columns.product")}</th>
                    <th className="px-3 py-2 text-start font-medium">{t("transfers.columns.quantity")}</th>
                    <th className="px-3 py-2 text-start font-medium">{t("transfers.columns.route")}</th>
                    <th className="px-3 py-2 text-start font-medium">{t("transfers.columns.status")}</th>
                    <th className="px-3 py-2 text-start font-medium">{t("transfers.columns.variance")}</th>
                    <th className="px-3 py-2 text-end font-medium">{t("transfers.columns.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {transfers.map((tr) => (
                    <tr key={tr.id} className="border-b border-border last:border-0">
                      <td className="px-3 py-3 font-medium text-ink">
                        {productLabel(tr.products)} {tr.products?.unit ? `(${tr.products.unit})` : ""}
                      </td>
                      <td className="px-3 py-3 text-ink-muted">{tr.quantity}</td>
                      <td className="px-3 py-3 text-ink-muted">
                        {tr.source?.name || "—"} → {tr.destination?.name || "—"}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[tr.status]}`}>
                          {t(`transfers.status.${tr.status}`)}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-ink-muted">
                        {tr.variance != null ? (
                          <span className={Number(tr.variance) === 0 ? "" : "font-medium text-red-600"}>
                            {tr.sent_quantity} → {tr.received_quantity} ({tr.variance > 0 ? "+" : ""}
                            {tr.variance})
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <RowActions
                          tr={tr}
                          t={t}
                          onDocuments={setDocumentsTarget}
                          onEdit={(transfer) => setFormState({ transfer })}
                          onAction={(transfer, nextStatus) => setActionState({ transfer, nextStatus })}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 sm:hidden">
              {transfers.map((tr) => (
                <div key={tr.id} className="flex flex-col gap-2 rounded-card border border-border p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-ink">
                      {productLabel(tr.products)} {tr.products?.unit ? `(${tr.products.unit})` : ""}
                    </p>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[tr.status]}`}
                    >
                      {t(`transfers.status.${tr.status}`)}
                    </span>
                  </div>
                  <p className="text-sm text-ink-muted">
                    {tr.source?.name || "—"} → {tr.destination?.name || "—"}
                  </p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-ink-muted">{t("transfers.columns.quantity")}</span>
                    <span className="text-ink">{tr.quantity}</span>
                  </div>
                  {tr.variance != null && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-ink-muted">{t("transfers.columns.variance")}</span>
                      <span className={Number(tr.variance) === 0 ? "text-ink" : "font-medium text-red-600"}>
                        {tr.sent_quantity} → {tr.received_quantity} ({tr.variance > 0 ? "+" : ""}
                        {tr.variance})
                      </span>
                    </div>
                  )}
                  <div className="border-t border-border pt-2">
                    <RowActions
                      tr={tr}
                      t={t}
                      onDocuments={setDocumentsTarget}
                      onEdit={(transfer) => setFormState({ transfer })}
                      onAction={(transfer, nextStatus) => setActionState({ transfer, nextStatus })}
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      {formState && (
        <TransferFormModal
          open
          transfer={formState.transfer}
          onClose={() => setFormState(null)}
          onSaved={loadTransfers}
        />
      )}

      {actionState && (
        <TransferActionModal
          open
          transfer={actionState.transfer}
          nextStatus={actionState.nextStatus}
          onClose={() => setActionState(null)}
          onSaved={loadTransfers}
        />
      )}

      {documentsTarget && (
        <DocumentsModal
          open
          table="transfers"
          record={documentsTarget}
          column="photos"
          mode="gallery"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          title={t("documents.title")}
          onClose={() => {
            setDocumentsTarget(null);
            loadTransfers();
          }}
        />
      )}
    </div>
  );
}
