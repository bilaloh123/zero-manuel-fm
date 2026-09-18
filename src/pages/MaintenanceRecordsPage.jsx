import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2 } from "lucide-react";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import MaintenanceRecordFormModal from "../components/maintenance/MaintenanceRecordFormModal";
import { supabase } from "../lib/supabaseClient";
import { useFilters } from "../context/FiltersContext";

export default function MaintenanceRecordsPage() {
  const { t } = useTranslation();
  const { farmId } = useFilters();
  const [records, setRecords] = useState(null);
  const [error, setError] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadRecords = useCallback(async () => {
    setError(null);

    let query = supabase
      .from("maintenance_records")
      .select(
        "id, issue, technician_name, labor_cost, parts_cost, next_due_date, equipment:equipment_id(code), vehicles:vehicle_id(plate_no)"
      )
      .order("created_at", { ascending: false });

    if (farmId !== "all") {
      const [{ data: eq }, { data: veh }] = await Promise.all([
        supabase.from("equipment").select("id").eq("farm_id", farmId),
        supabase.from("vehicles").select("id").eq("farm_id", farmId),
      ]);
      const equipmentIds = (eq || []).map((e) => e.id);
      const vehicleIds = (veh || []).map((v) => v.id);
      if (equipmentIds.length === 0 && vehicleIds.length === 0) {
        setRecords([]);
        return;
      }
      const orParts = [];
      if (equipmentIds.length > 0) orParts.push(`equipment_id.in.(${equipmentIds.join(",")})`);
      if (vehicleIds.length > 0) orParts.push(`vehicle_id.in.(${vehicleIds.join(",")})`);
      query = query.or(orParts.join(","));
    }

    const { data, error: fetchError } = await query;
    if (fetchError) {
      setError(fetchError.message);
      setRecords([]);
      return;
    }
    setRecords(data);
  }, [farmId]);

  useEffect(() => {
    setRecords(null);
    loadRecords();
  }, [loadRecords]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error: deleteError } = await supabase.from("maintenance_records").delete().eq("id", deleteTarget.id);
      if (deleteError) throw deleteError;
      setDeleteTarget(null);
      await loadRecords();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">{t("maintenanceRecords.title")}</h1>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" />
          {t("maintenanceRecords.add")}
        </Button>
      </div>

      <Card>
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {records === null ? (
          <p className="py-8 text-center text-sm text-ink-muted">{t("common.loading")}</p>
        ) : records.length === 0 ? (
          <EmptyState message={t("common.noData")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead>
                <tr className="border-b border-border text-ink-muted">
                  <th className="px-3 py-2 text-start font-medium">{t("maintenanceRecords.columns.target")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("maintenanceRecords.columns.issue")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("maintenanceRecords.columns.technician")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("maintenanceRecords.columns.cost")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("maintenanceRecords.columns.nextDue")}</th>
                  <th className="px-3 py-2 text-end font-medium">{t("maintenanceRecords.columns.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => {
                  const totalCost = (record.labor_cost || 0) + (record.parts_cost || 0);
                  return (
                    <tr key={record.id} className="border-b border-border last:border-0">
                      <td className="px-3 py-3 font-medium text-ink">
                        {record.equipment?.code || record.vehicles?.plate_no || "—"}
                      </td>
                      <td className="px-3 py-3 text-ink-muted">{record.issue || "—"}</td>
                      <td className="px-3 py-3 text-ink-muted">{record.technician_name || "—"}</td>
                      <td className="px-3 py-3 text-ink-muted">{totalCost || "—"}</td>
                      <td className="px-3 py-3 text-ink-muted">{record.next_due_date || "—"}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(record)}
                            className="flex h-8 w-8 items-center justify-center rounded-control text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {formOpen && (
        <MaintenanceRecordFormModal
          open
          defaultFarmId={farmId !== "all" ? farmId : undefined}
          onClose={() => setFormOpen(false)}
          onSaved={loadRecords}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          open
          title={t("maintenanceRecords.deleteConfirmTitle")}
          message={t("maintenanceRecords.deleteConfirmMessage")}
          confirming={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
