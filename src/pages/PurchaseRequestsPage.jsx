import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2 } from "lucide-react";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import PurchaseRequestFormModal from "../components/purchaserequests/PurchaseRequestFormModal";
import { supabase } from "../lib/supabaseClient";
import { useFilters } from "../context/FiltersContext";

const STATUS_BADGE = {
  open: "bg-amber-100 text-amber-700",
  fulfilled: "bg-brand-100 text-brand-700",
  cancelled: "bg-gray-200 text-gray-700",
};

export default function PurchaseRequestsPage() {
  const { t, i18n } = useTranslation();
  const { farmId } = useFilters();
  const [requests, setRequests] = useState(null);
  const [error, setError] = useState(null);
  const [formState, setFormState] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadRequests = useCallback(async () => {
    setError(null);
    let query = supabase
      .from("purchase_requests")
      .select(
        "id, quantity, needed_by, status, requesting_farm_id, farms:requesting_farm_id(name), products:product_id(name_ar, name_fr, unit)"
      )
      .order("created_at", { ascending: false });
    if (farmId !== "all") {
      query = query.eq("requesting_farm_id", farmId);
    }
    const { data, error: fetchError } = await query;
    if (fetchError) {
      setError(fetchError.message);
      setRequests([]);
      return;
    }
    setRequests(data);
  }, [farmId]);

  useEffect(() => {
    setRequests(null);
    loadRequests();
  }, [loadRequests]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error: deleteError } = await supabase.from("purchase_requests").delete().eq("id", deleteTarget.id);
      if (deleteError) throw deleteError;
      setDeleteTarget(null);
      await loadRequests();
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
        <h1 className="text-2xl font-semibold text-ink">{t("purchaseRequests.title")}</h1>
        <Button onClick={() => setFormState({ request: null })}>
          <Plus className="h-4 w-4" />
          {t("purchaseRequests.add")}
        </Button>
      </div>

      <Card>
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {requests === null ? (
          <p className="py-8 text-center text-sm text-ink-muted">{t("common.loading")}</p>
        ) : requests.length === 0 ? (
          <EmptyState message={t("common.noData")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead>
                <tr className="border-b border-border text-ink-muted">
                  <th className="px-3 py-2 text-start font-medium">{t("purchaseRequests.columns.farm")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("purchaseRequests.columns.product")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("purchaseRequests.columns.quantity")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("purchaseRequests.columns.neededBy")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("purchaseRequests.columns.status")}</th>
                  <th className="px-3 py-2 text-end font-medium">{t("purchaseRequests.columns.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-3 text-ink-muted">{request.farms?.name || "—"}</td>
                    <td className="px-3 py-3 font-medium text-ink">{productLabel(request.products)}</td>
                    <td className="px-3 py-3 text-ink-muted">
                      {request.quantity} {request.products?.unit || ""}
                    </td>
                    <td className="px-3 py-3 text-ink-muted">{request.needed_by || "—"}</td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[request.status] || STATUS_BADGE.open}`}
                      >
                        {t(`purchaseRequests.status.${request.status}`, request.status)}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setFormState({ request })}
                          className="flex h-8 w-8 items-center justify-center rounded-control text-ink-muted hover:bg-cream-soft"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(request)}
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
        <PurchaseRequestFormModal
          open
          request={formState.request}
          defaultFarmId={farmId !== "all" ? farmId : undefined}
          onClose={() => setFormState(null)}
          onSaved={loadRequests}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          open
          title={t("purchaseRequests.deleteConfirmTitle")}
          message={t("purchaseRequests.deleteConfirmMessage")}
          confirming={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
