import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2 } from "lucide-react";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import SaleFormModal from "../components/sales/SaleFormModal";
import { supabase } from "../lib/supabaseClient";
import { useFilters } from "../context/FiltersContext";

const STATUS_BADGE = {
  confirmed: "bg-brand-100 text-brand-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function SalesPage() {
  const { t } = useTranslation();
  const { farmId } = useFilters();
  const [sales, setSales] = useState(null);
  const [error, setError] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadSales = useCallback(async () => {
    setError(null);
    let query = supabase
      .from("sales")
      .select(
        "id, quantity, unit_price, status, sold_at, lots:lot_id(lot_code, parcels!inner(farm_id)), customers:customer_id(name)"
      )
      .order("sold_at", { ascending: false });
    if (farmId !== "all") {
      query = query.eq("lots.parcels.farm_id", farmId);
    }
    const { data, error: fetchError } = await query;
    if (fetchError) {
      setError(fetchError.message);
      setSales([]);
      return;
    }
    setSales(data);
  }, [farmId]);

  useEffect(() => {
    setSales(null);
    loadSales();
  }, [loadSales]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error: deleteError } = await supabase.from("sales").delete().eq("id", deleteTarget.id);
      if (deleteError) throw deleteError;
      setDeleteTarget(null);
      await loadSales();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">{t("sales.title")}</h1>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" />
          {t("sales.add")}
        </Button>
      </div>

      <Card>
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {sales === null ? (
          <p className="py-8 text-center text-sm text-ink-muted">{t("common.loading")}</p>
        ) : sales.length === 0 ? (
          <EmptyState message={t("common.noData")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead>
                <tr className="border-b border-border text-ink-muted">
                  <th className="px-3 py-2 text-start font-medium">{t("sales.columns.lot")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("sales.columns.customer")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("sales.columns.quantity")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("sales.columns.unitPrice")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("sales.columns.total")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("sales.columns.status")}</th>
                  <th className="px-3 py-2 text-end font-medium">{t("sales.columns.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-3 font-mono text-xs font-medium text-ink">{sale.lots?.lot_code || "—"}</td>
                    <td className="px-3 py-3 text-ink-muted">{sale.customers?.name || "—"}</td>
                    <td className="px-3 py-3 text-ink-muted">{sale.quantity}</td>
                    <td className="px-3 py-3 text-ink-muted">{sale.unit_price}</td>
                    <td className="px-3 py-3 font-medium text-ink">{(sale.quantity * sale.unit_price).toFixed(2)}</td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[sale.status] || STATUS_BADGE.confirmed}`}
                      >
                        {t(`sales.status.${sale.status}`, sale.status)}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(sale)}
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
        <SaleFormModal
          open
          defaultFarmId={farmId !== "all" ? farmId : undefined}
          onClose={() => setFormOpen(false)}
          onSaved={loadSales}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          open
          title={t("sales.deleteConfirmTitle")}
          message={t("sales.deleteConfirmMessage")}
          confirming={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
