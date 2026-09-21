import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2 } from "lucide-react";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import Pagination from "../components/ui/Pagination";
import FuelLogFormModal from "../components/fuellogs/FuelLogFormModal";
import { supabase } from "../lib/supabaseClient";
import { useFilters } from "../context/FiltersContext";

const PAGE_SIZE = 25;

export default function FuelLogsPage() {
  const { t } = useTranslation();
  const { farmId } = useFilters();
  const [logs, setLogs] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [error, setError] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadLogs = useCallback(async () => {
    setError(null);
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    let query = supabase
      .from("fuel_logs")
      .select(
        "id, target_type, target_id, quantity_liters, consumption_rate, occurred_at, warehouses:tank_warehouse_id(name)",
        { count: "exact" }
      )
      .order("occurred_at", { ascending: false })
      .range(from, to);
    if (farmId !== "all") {
      query = query.eq("farm_id", farmId);
    }
    const { data, count, error: fetchError } = await query;
    if (fetchError) {
      setError(fetchError.message);
      setLogs([]);
      return;
    }
    if ((data || []).length === 0 && page > 1) {
      setPage((p) => p - 1);
      return;
    }

    const vehicleIds = data.filter((l) => l.target_type === "vehicle").map((l) => l.target_id);
    const equipmentIds = data.filter((l) => l.target_type === "equipment").map((l) => l.target_id);
    const [{ data: vehicles }, { data: equipment }] = await Promise.all([
      vehicleIds.length > 0
        ? supabase.from("vehicles").select("id, plate_no").in("id", vehicleIds)
        : Promise.resolve({ data: [] }),
      equipmentIds.length > 0
        ? supabase.from("equipment").select("id, code").in("id", equipmentIds)
        : Promise.resolve({ data: [] }),
    ]);
    const vehicleMap = Object.fromEntries((vehicles || []).map((v) => [v.id, v.plate_no]));
    const equipmentMap = Object.fromEntries((equipment || []).map((e) => [e.id, e.code]));

    setLogs(
      data.map((log) => ({
        ...log,
        targetLabel: log.target_type === "vehicle" ? vehicleMap[log.target_id] : equipmentMap[log.target_id],
      }))
    );
    setTotal(count || 0);
  }, [farmId, page]);

  useEffect(() => {
    setPage(1);
  }, [farmId]);

  useEffect(() => {
    setLogs(null);
    loadLogs();
  }, [loadLogs]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error: deleteError } = await supabase.from("fuel_logs").delete().eq("id", deleteTarget.id);
      if (deleteError) throw deleteError;
      setDeleteTarget(null);
      await loadLogs();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">{t("fuelLogs.title")}</h1>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" />
          {t("fuelLogs.add")}
        </Button>
      </div>

      <Card>
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {logs === null ? (
          <p className="py-8 text-center text-sm text-ink-muted">{t("common.loading")}</p>
        ) : logs.length === 0 ? (
          <EmptyState message={t("common.noData")} />
        ) : (
          <>
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-start text-sm">
                <thead>
                  <tr className="border-b border-border text-ink-muted">
                    <th className="px-3 py-2 text-start font-medium">{t("fuelLogs.columns.target")}</th>
                    <th className="px-3 py-2 text-start font-medium">{t("fuelLogs.columns.tank")}</th>
                    <th className="px-3 py-2 text-start font-medium">{t("fuelLogs.columns.quantity")}</th>
                    <th className="px-3 py-2 text-start font-medium">{t("fuelLogs.columns.consumptionRate")}</th>
                    <th className="px-3 py-2 text-start font-medium">{t("fuelLogs.columns.occurredAt")}</th>
                    <th className="px-3 py-2 text-end font-medium">{t("fuelLogs.columns.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-border last:border-0">
                      <td className="px-3 py-3 font-medium text-ink">{log.targetLabel || "—"}</td>
                      <td className="px-3 py-3 text-ink-muted">{log.warehouses?.name || "—"}</td>
                      <td className="px-3 py-3 text-ink-muted">{log.quantity_liters}</td>
                      <td className="px-3 py-3 text-ink-muted">
                        {log.consumption_rate != null ? log.consumption_rate.toFixed(3) : "—"}
                      </td>
                      <td className="px-3 py-3 text-ink-muted">{new Date(log.occurred_at).toLocaleString()}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(log)}
                            className="flex h-11 w-11 sm:h-8 sm:w-8 items-center justify-center rounded-control text-red-600 hover:bg-red-50"
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

            <div className="flex flex-col gap-3 sm:hidden">
              {logs.map((log) => (
                <div key={log.id} className="flex flex-col gap-2 rounded-card border border-border p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-ink">{log.targetLabel || "—"}</p>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(log)}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-sm text-ink-muted">{new Date(log.occurred_at).toLocaleString()}</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-ink-muted">{t("fuelLogs.columns.tank")}</span>
                    <span className="text-ink">{log.warehouses?.name || "—"}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-ink-muted">{t("fuelLogs.columns.quantity")}</span>
                    <span className="text-ink">{log.quantity_liters}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-ink-muted">{t("fuelLogs.columns.consumptionRate")}</span>
                    <span className="text-ink">
                      {log.consumption_rate != null ? log.consumption_rate.toFixed(3) : "—"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        {logs && logs.length > 0 && <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />}
      </Card>

      {formOpen && (
        <FuelLogFormModal
          open
          defaultFarmId={farmId !== "all" ? farmId : undefined}
          onClose={() => setFormOpen(false)}
          onSaved={loadLogs}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          open
          title={t("fuelLogs.deleteConfirmTitle")}
          message={t("fuelLogs.deleteConfirmMessage")}
          confirming={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
