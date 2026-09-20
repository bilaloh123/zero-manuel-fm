import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, ListPlus, Snowflake, Lock, Unlock, QrCode } from "lucide-react";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";
import PalletFormModal from "../components/pallets/PalletFormModal";
import PalletItemsModal from "../components/pallets/PalletItemsModal";
import PalletDetailModal from "../components/pallets/PalletDetailModal";
import MoveToColdStorageModal from "../components/pallets/MoveToColdStorageModal";
import BlockPalletModal from "../components/pallets/BlockPalletModal";
import { supabase } from "../lib/supabaseClient";
import { useFilters } from "../context/FiltersContext";

const STATUS_BADGE = {
  created: "bg-gray-100 text-gray-600",
  in_cold_storage: "bg-blue-100 text-blue-700",
  reserved: "bg-amber-100 text-amber-700",
  loading: "bg-amber-100 text-amber-700",
  shipped: "bg-brand-100 text-brand-700",
  delivered: "bg-brand-100 text-brand-700",
};

export default function PalletsPage() {
  const { t, i18n } = useTranslation();
  const { farmId } = useFilters();
  const [pallets, setPallets] = useState(null);
  const [error, setError] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [itemsTarget, setItemsTarget] = useState(null);
  const [detailTarget, setDetailTarget] = useState(null);
  const [moveTarget, setMoveTarget] = useState(null);
  const [blockTarget, setBlockTarget] = useState(null);
  const [actionError, setActionError] = useState(null);

  const loadPallets = useCallback(async () => {
    setError(null);
    let query = supabase
      .from("pallets")
      .select("id, farm_id, pallet_code, product_id, caliber, quality_grade, boxes_count, status, blocked, blocked_reason, products:product_id(name_ar, name_fr), cold_storage_units:cold_storage_unit_id(name)")
      .order("created_at", { ascending: false });
    if (farmId !== "all") {
      query = query.eq("farm_id", farmId);
    }
    const { data, error: fetchError } = await query;
    if (fetchError) {
      setError(fetchError.message);
      setPallets([]);
      return;
    }
    setPallets(data);
  }, [farmId]);

  useEffect(() => {
    setPallets(null);
    loadPallets();
  }, [loadPallets]);

  const productLabel = (p) => (!p ? "—" : i18n.language === "ar" ? p.name_ar || p.name_fr : p.name_fr || p.name_ar);

  const handleReserve = async (pallet) => {
    setActionError(null);
    const { error: rpcError } = await supabase.rpc("reserve_pallet", { p_pallet_id: pallet.id });
    if (rpcError) setActionError(rpcError.message);
    await loadPallets();
  };

  const handleRelease = async (pallet) => {
    setActionError(null);
    const { error: rpcError } = await supabase.rpc("release_pallet", { p_pallet_id: pallet.id });
    if (rpcError) setActionError(rpcError.message);
    await loadPallets();
  };

  const handleUnblock = async (pallet) => {
    setActionError(null);
    const { error: rpcError } = await supabase.rpc("unblock_pallet", { p_pallet_id: pallet.id });
    if (rpcError) setActionError(rpcError.message);
    await loadPallets();
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">{t("pallets.title")}</h1>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" />
          {t("pallets.add")}
        </Button>
      </div>

      {actionError && <p className="text-sm text-red-600">{actionError}</p>}

      <Card>
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {pallets === null ? (
          <p className="py-8 text-center text-sm text-ink-muted">{t("common.loading")}</p>
        ) : pallets.length === 0 ? (
          <EmptyState message={t("common.noData")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead>
                <tr className="border-b border-border text-ink-muted">
                  <th className="px-3 py-2 text-start font-medium">{t("pallets.columns.code")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("pallets.columns.product")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("pallets.columns.caliberGrade")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("pallets.columns.location")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("pallets.columns.status")}</th>
                  <th className="px-3 py-2 text-end font-medium">{t("pallets.columns.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {pallets.map((pallet) => (
                  <tr key={pallet.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-3 font-mono text-xs font-medium text-ink">{pallet.pallet_code}</td>
                    <td className="px-3 py-3 text-ink-muted">{productLabel(pallet.products)}</td>
                    <td className="px-3 py-3 text-ink-muted">
                      {pallet.caliber || "—"} / {pallet.quality_grade || "—"}
                    </td>
                    <td className="px-3 py-3 text-ink-muted">{pallet.cold_storage_units?.name || "—"}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col gap-1">
                        <span className={`w-fit rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[pallet.status]}`}>
                          {t(`pallets.status.${pallet.status}`)}
                        </span>
                        {pallet.blocked && (
                          <span className="w-fit rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                            {t("pallets.status.blocked")}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setItemsTarget(pallet)}
                          className="flex h-8 w-8 items-center justify-center rounded-control text-ink-muted hover:bg-cream-soft"
                          title={t("pallets.items.manage")}
                        >
                          <ListPlus className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDetailTarget(pallet)}
                          className="flex h-8 w-8 items-center justify-center rounded-control text-ink-muted hover:bg-cream-soft"
                          title={t("pallets.detail.title")}
                        >
                          <QrCode className="h-4 w-4" />
                        </button>
                        {!pallet.blocked && ["created", "in_cold_storage"].includes(pallet.status) && (
                          <button
                            type="button"
                            onClick={() => setMoveTarget(pallet)}
                            className="flex h-8 w-8 items-center justify-center rounded-control text-blue-700 hover:bg-blue-100"
                            title={t("pallets.moveAction")}
                          >
                            <Snowflake className="h-4 w-4" />
                          </button>
                        )}
                        {!pallet.blocked && pallet.status === "in_cold_storage" && (
                          <button
                            type="button"
                            onClick={() => handleReserve(pallet)}
                            className="rounded-control border border-border px-2 py-1 text-xs font-medium text-ink hover:bg-cream-soft"
                          >
                            {t("pallets.reserveAction")}
                          </button>
                        )}
                        {pallet.status === "reserved" && (
                          <button
                            type="button"
                            onClick={() => handleRelease(pallet)}
                            className="rounded-control border border-border px-2 py-1 text-xs font-medium text-ink hover:bg-cream-soft"
                          >
                            {t("pallets.releaseAction")}
                          </button>
                        )}
                        {pallet.blocked ? (
                          <button
                            type="button"
                            onClick={() => handleUnblock(pallet)}
                            className="flex h-8 w-8 items-center justify-center rounded-control text-brand-700 hover:bg-brand-100"
                            title={t("pallets.unblockAction")}
                          >
                            <Unlock className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setBlockTarget(pallet)}
                            className="flex h-8 w-8 items-center justify-center rounded-control text-red-600 hover:bg-red-50"
                            title={t("pallets.blockAction")}
                          >
                            <Lock className="h-4 w-4" />
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

      {formOpen && (
        <PalletFormModal open defaultFarmId={farmId !== "all" ? farmId : undefined} onClose={() => setFormOpen(false)} onSaved={loadPallets} />
      )}

      {itemsTarget && (
        <PalletItemsModal
          open
          pallet={itemsTarget}
          onClose={() => {
            setItemsTarget(null);
            loadPallets();
          }}
        />
      )}

      {detailTarget && <PalletDetailModal open pallet={detailTarget} onClose={() => setDetailTarget(null)} />}

      {moveTarget && (
        <MoveToColdStorageModal open pallet={moveTarget} onClose={() => setMoveTarget(null)} onMoved={loadPallets} />
      )}

      {blockTarget && (
        <BlockPalletModal open pallet={blockTarget} onClose={() => setBlockTarget(null)} onBlocked={loadPallets} />
      )}
    </div>
  );
}
