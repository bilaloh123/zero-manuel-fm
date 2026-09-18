import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { QrCode, GitCommitVertical, Package, Truck } from "lucide-react";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import LotDetailModal from "../components/lots/LotDetailModal";
import TraceabilityTimelineModal from "../components/lots/TraceabilityTimelineModal";
import PackagingModal from "../components/lots/PackagingModal";
import ShipmentModal from "../components/lots/ShipmentModal";
import { supabase } from "../lib/supabaseClient";
import { useFilters } from "../context/FiltersContext";

export default function LotsPage() {
  const { t, i18n } = useTranslation();
  const { farmId } = useFilters();
  const [lots, setLots] = useState(null);
  const [error, setError] = useState(null);
  const [viewLot, setViewLot] = useState(null);
  const [timelineLot, setTimelineLot] = useState(null);
  const [packagingLot, setPackagingLot] = useState(null);
  const [shipmentLot, setShipmentLot] = useState(null);

  const loadLots = useCallback(async () => {
    setError(null);
    let query = supabase
      .from("lots")
      .select(
        "id, lot_code, quantity_kg, boxes_count, current_status, harvested_at, parcel_id, crop_id, variety_id, season_id, current_location_warehouse_id, parcels!inner(id, name, code, farm_id), crops:crop_id(name_ar, name_fr), varieties:variety_id(name), seasons:season_id(label)"
      )
      .order("harvested_at", { ascending: false });
    if (farmId !== "all") {
      query = query.eq("parcels.farm_id", farmId);
    }
    const { data, error: fetchError } = await query;
    if (fetchError) {
      setError(fetchError.message);
      setLots([]);
      return;
    }
    setLots(data);
  }, [farmId]);

  useEffect(() => {
    setLots(null);
    loadLots();
  }, [loadLots]);

  const cropLabel = (crops) =>
    !crops ? "—" : i18n.language === "ar" ? crops.name_ar || crops.name_fr : crops.name_fr || crops.name_ar;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-ink">{t("lots.title")}</h1>

      <Card>
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {lots === null ? (
          <p className="py-8 text-center text-sm text-ink-muted">{t("common.loading")}</p>
        ) : lots.length === 0 ? (
          <EmptyState message={t("common.noData")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead>
                <tr className="border-b border-border text-ink-muted">
                  <th className="px-3 py-2 text-start font-medium">{t("lots.columns.lotCode")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("lots.columns.parcel")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("lots.columns.crop")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("lots.columns.quantity")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("lots.columns.boxes")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("lots.columns.status")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("lots.columns.harvestedAt")}</th>
                  <th className="px-3 py-2 text-end font-medium">{t("lots.columns.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {lots.map((lot) => (
                  <tr key={lot.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-3 font-mono text-xs font-medium text-ink">{lot.lot_code}</td>
                    <td className="px-3 py-3 text-ink-muted">{lot.parcels?.name || lot.parcels?.code || "—"}</td>
                    <td className="px-3 py-3 text-ink-muted">{cropLabel(lot.crops)}</td>
                    <td className="px-3 py-3 text-ink-muted">{lot.quantity_kg ?? "—"}</td>
                    <td className="px-3 py-3 text-ink-muted">{lot.boxes_count ?? "—"}</td>
                    <td className="px-3 py-3 text-ink-muted">{lot.current_status || "—"}</td>
                    <td className="px-3 py-3 text-ink-muted">
                      {lot.harvested_at ? new Date(lot.harvested_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setTimelineLot(lot)}
                          title={t("traceability.viewTimeline")}
                          className="flex h-8 w-8 items-center justify-center rounded-control text-ink-muted hover:bg-cream-soft"
                        >
                          <GitCommitVertical className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setViewLot(lot)}
                          className="flex h-8 w-8 items-center justify-center rounded-control text-ink-muted hover:bg-cream-soft"
                        >
                          <QrCode className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPackagingLot(lot)}
                          title={t("lots.packaging.action")}
                          className="flex h-8 w-8 items-center justify-center rounded-control text-ink-muted hover:bg-cream-soft"
                        >
                          <Package className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setShipmentLot(lot)}
                          title={t("lots.shipment.action")}
                          className="flex h-8 w-8 items-center justify-center rounded-control text-ink-muted hover:bg-cream-soft"
                        >
                          <Truck className="h-4 w-4" />
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

      {viewLot && <LotDetailModal open lot={viewLot} onClose={() => setViewLot(null)} />}
      {timelineLot && (
        <TraceabilityTimelineModal open lot={timelineLot} onClose={() => setTimelineLot(null)} />
      )}
      {packagingLot && (
        <PackagingModal
          open
          lot={packagingLot}
          onClose={() => setPackagingLot(null)}
          onSaved={loadLots}
        />
      )}
      {shipmentLot && (
        <ShipmentModal open lot={shipmentLot} onClose={() => setShipmentLot(null)} onSaved={loadLots} />
      )}
    </div>
  );
}
