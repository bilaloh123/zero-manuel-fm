import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2, Paperclip } from "lucide-react";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import DocumentsModal from "../components/ui/DocumentsModal";
import StockMovementFormModal from "../components/stockmovements/StockMovementFormModal";
import { supabase } from "../lib/supabaseClient";
import { useFilters } from "../context/FiltersContext";

const IN_TYPES = new Set(["PURCHASE_RECEIPT", "TRANSFER_IN", "HARVEST_ENTRY", "RETURN"]);
const OUT_TYPES = new Set(["TRANSFER_OUT", "CONSUMPTION", "LOSS", "DAMAGE", "SALE", "SHIPMENT"]);

const TYPE_BADGE = (type) => {
  if (IN_TYPES.has(type)) return "bg-brand-100 text-brand-700";
  if (OUT_TYPES.has(type)) return "bg-red-100 text-red-700";
  return "bg-amber-100 text-amber-700";
};

export default function StockMovementsPage() {
  const { t, i18n } = useTranslation();
  const { farmId } = useFilters();
  const [movements, setMovements] = useState(null);
  const [error, setError] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [documentsTarget, setDocumentsTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadMovements = useCallback(async () => {
    setError(null);
    let query = supabase
      .from("stock_movements")
      .select(
        "id, occurred_at, movement_type, quantity, reason, product_id, photo_url, products:product_id(name_ar, name_fr), source_warehouse:source_warehouse_id(name), destination_warehouse:destination_warehouse_id(name)"
      )
      .order("occurred_at", { ascending: false });
    if (farmId !== "all") {
      query = query.eq("farm_id", farmId);
    }
    const { data, error: fetchError } = await query;
    if (fetchError) {
      setError(fetchError.message);
      setMovements([]);
      return;
    }
    setMovements(data);
  }, [farmId]);

  useEffect(() => {
    setMovements(null);
    loadMovements();
  }, [loadMovements]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error: deleteError } = await supabase.from("stock_movements").delete().eq("id", deleteTarget.id);
      if (deleteError) throw deleteError;
      setDeleteTarget(null);
      await loadMovements();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const productLabel = (p) => (!p ? "—" : i18n.language === "ar" ? p.name_ar || p.name_fr : p.name_fr || p.name_ar);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">{t("stockMovements.title")}</h1>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" />
          {t("stockMovements.add")}
        </Button>
      </div>

      <Card>
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {movements === null ? (
          <p className="py-8 text-center text-sm text-ink-muted">{t("common.loading")}</p>
        ) : movements.length === 0 ? (
          <EmptyState message={t("common.noData")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead>
                <tr className="border-b border-border text-ink-muted">
                  <th className="px-3 py-2 text-start font-medium">{t("stockMovements.columns.date")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("stockMovements.columns.product")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("stockMovements.columns.type")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("stockMovements.columns.quantity")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("stockMovements.columns.source")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("stockMovements.columns.destination")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("stockMovements.columns.reason")}</th>
                  <th className="px-3 py-2 text-end font-medium">{t("stockMovements.columns.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((mv) => (
                  <tr key={mv.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-3 text-ink-muted">{new Date(mv.occurred_at).toLocaleString()}</td>
                    <td className="px-3 py-3 font-medium text-ink">{productLabel(mv.products)}</td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${TYPE_BADGE(mv.movement_type)}`}>
                        {t(`stockMovements.types.${mv.movement_type}`)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-ink-muted">{mv.quantity}</td>
                    <td className="px-3 py-3 text-ink-muted">{mv.source_warehouse?.name || "—"}</td>
                    <td className="px-3 py-3 text-ink-muted">{mv.destination_warehouse?.name || "—"}</td>
                    <td className="px-3 py-3 text-ink-muted">{mv.reason || "—"}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setDocumentsTarget(mv)}
                          className="flex h-8 w-8 items-center justify-center rounded-control text-ink-muted hover:bg-cream-soft"
                          title={t("documents.title")}
                        >
                          <Paperclip className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(mv)}
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

      {formOpen && (
        <StockMovementFormModal
          open
          defaultFarmId={farmId !== "all" ? farmId : undefined}
          onClose={() => setFormOpen(false)}
          onSaved={loadMovements}
        />
      )}

      {documentsTarget && (
        <DocumentsModal
          open
          table="stock_movements"
          record={documentsTarget}
          column="photo_url"
          mode="single"
          accept="image/jpeg,image/png,image/webp"
          title={t("documents.title")}
          onClose={() => {
            setDocumentsTarget(null);
            loadMovements();
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          open
          title={t("stockMovements.deleteConfirmTitle")}
          message={t("stockMovements.deleteConfirmMessage")}
          confirming={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
