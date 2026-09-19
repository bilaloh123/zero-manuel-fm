import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2, ShoppingCart } from "lucide-react";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import QuoteFormModal from "../components/quotes/QuoteFormModal";
import QuoteItemsModal from "../components/quotes/QuoteItemsModal";
import { supabase } from "../lib/supabaseClient";
import { useFilters } from "../context/FiltersContext";

const STATUS_BADGE = {
  draft: "bg-gray-100 text-gray-600",
  sent: "bg-amber-100 text-amber-700",
  accepted: "bg-brand-100 text-brand-700",
  rejected: "bg-red-100 text-red-700",
  expired: "bg-red-100 text-red-700",
  converted: "bg-brand-100 text-brand-700",
};

export default function QuotesPage() {
  const { t } = useTranslation();
  const { farmId } = useFilters();
  const [quotes, setQuotes] = useState(null);
  const [error, setError] = useState(null);
  const [formState, setFormState] = useState(null);
  const [itemsTarget, setItemsTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadQuotes = useCallback(async () => {
    setError(null);
    let query = supabase
      .from("quotes")
      .select("id, quote_no, status, valid_until, discount_pct, customers:customer_id(name)")
      .order("created_at", { ascending: false });
    if (farmId !== "all") {
      query = query.eq("farm_id", farmId);
    }
    const { data, error: fetchError } = await query;
    if (fetchError) {
      setError(fetchError.message);
      setQuotes([]);
      return;
    }
    setQuotes(data);
  }, [farmId]);

  useEffect(() => {
    setQuotes(null);
    loadQuotes();
  }, [loadQuotes]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error: deleteError } = await supabase.from("quotes").delete().eq("id", deleteTarget.id);
      if (deleteError) throw deleteError;
      setDeleteTarget(null);
      await loadQuotes();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">{t("quotes.title")}</h1>
        <Button onClick={() => setFormState({ quote: null })}>
          <Plus className="h-4 w-4" />
          {t("quotes.add")}
        </Button>
      </div>

      <Card>
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {quotes === null ? (
          <p className="py-8 text-center text-sm text-ink-muted">{t("common.loading")}</p>
        ) : quotes.length === 0 ? (
          <EmptyState message={t("common.noData")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead>
                <tr className="border-b border-border text-ink-muted">
                  <th className="px-3 py-2 text-start font-medium">{t("quotes.columns.quoteNo")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("quotes.columns.customer")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("quotes.columns.validUntil")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("quotes.columns.status")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("quotes.manageItems")}</th>
                  <th className="px-3 py-2 text-end font-medium">{t("quotes.columns.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {quotes.map((quote) => (
                  <tr key={quote.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-3 font-mono text-xs font-medium text-ink">{quote.quote_no}</td>
                    <td className="px-3 py-3 text-ink-muted">{quote.customers?.name || "—"}</td>
                    <td className="px-3 py-3 text-ink-muted">{quote.valid_until || "—"}</td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[quote.status] || STATUS_BADGE.draft}`}
                      >
                        {t(`quotes.status.${quote.status}`)}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => setItemsTarget(quote)}
                        className="inline-flex items-center gap-1.5 rounded-control border border-border px-2.5 py-1 text-xs font-medium text-ink hover:bg-cream-soft"
                      >
                        <ShoppingCart className="h-3.5 w-3.5" />
                        {t("quotes.manageItems")}
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setFormState({ quote })}
                          className="flex h-8 w-8 items-center justify-center rounded-control text-ink-muted hover:bg-cream-soft"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(quote)}
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
        <QuoteFormModal
          open
          quote={formState.quote}
          defaultFarmId={farmId !== "all" ? farmId : undefined}
          onClose={() => setFormState(null)}
          onSaved={loadQuotes}
        />
      )}

      {itemsTarget && <QuoteItemsModal open quote={itemsTarget} onClose={() => setItemsTarget(null)} />}

      {deleteTarget && (
        <ConfirmDialog
          open
          title={t("quotes.deleteConfirmTitle")}
          message={t("quotes.deleteConfirmMessage")}
          confirming={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
