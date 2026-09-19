import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2 } from "lucide-react";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import Pagination from "../components/ui/Pagination";
import AttendanceFormModal from "../components/attendance/AttendanceFormModal";
import { supabase } from "../lib/supabaseClient";
import { useFilters } from "../context/FiltersContext";
import { inputClass } from "../components/ui/FormField";

const PAGE_SIZE = 25;

const STATUS_BADGE = {
  present: "bg-brand-100 text-brand-700",
  absent: "bg-red-100 text-red-700",
  leave: "bg-amber-100 text-amber-700",
};

function todayStr() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatTime(isoString) {
  if (!isoString) return "—";
  const d = new Date(isoString);
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AttendancePage() {
  const { t } = useTranslation();
  const { farmId } = useFilters();
  const [date, setDate] = useState(todayStr());
  const [records, setRecords] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [error, setError] = useState(null);
  const [formState, setFormState] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadRecords = useCallback(async () => {
    setError(null);
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const dayStart = new Date(`${date}T00:00:00`).toISOString();
    const dayEnd = new Date(`${date}T23:59:59.999`).toISOString();
    let query = supabase
      .from("attendance")
      .select(
        "id, farm_id, employee_id, check_in, check_out, hours_worked, status, employees:employee_id(full_name)",
        { count: "exact" }
      )
      .gte("check_in", dayStart)
      .lte("check_in", dayEnd)
      .order("check_in", { ascending: true })
      .range(from, to);
    if (farmId !== "all") {
      query = query.eq("farm_id", farmId);
    }
    const { data, count, error: fetchError } = await query;
    if (fetchError) {
      setError(fetchError.message);
      setRecords([]);
      return;
    }
    if ((data || []).length === 0 && page > 1) {
      setPage((p) => p - 1);
      return;
    }
    setRecords(data);
    setTotal(count || 0);
  }, [farmId, date, page]);

  useEffect(() => {
    setPage(1);
  }, [farmId, date]);

  useEffect(() => {
    setRecords(null);
    loadRecords();
  }, [loadRecords]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error: deleteError } = await supabase.from("attendance").delete().eq("id", deleteTarget.id);
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
        <h1 className="text-2xl font-semibold text-ink">{t("attendance.title")}</h1>
        <Button onClick={() => setFormState({ record: null })}>
          <Plus className="h-4 w-4" />
          {t("attendance.add")}
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <label htmlFor="date-filter" className="text-sm font-medium text-ink">
          {t("attendance.dateFilter")}
        </label>
        <input
          id="date-filter"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={`${inputClass} max-w-xs`}
        />
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
                  <th className="px-3 py-2 text-start font-medium">{t("attendance.columns.employee")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("attendance.columns.checkIn")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("attendance.columns.checkOut")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("attendance.columns.hoursWorked")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("attendance.columns.status")}</th>
                  <th className="px-3 py-2 text-end font-medium">{t("attendance.columns.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-3 font-medium text-ink">{record.employees?.full_name || "—"}</td>
                    <td className="px-3 py-3 text-ink-muted">{formatTime(record.check_in)}</td>
                    <td className="px-3 py-3 text-ink-muted">{formatTime(record.check_out)}</td>
                    <td className="px-3 py-3 text-ink-muted">{record.hours_worked ?? "—"}</td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[record.status] || STATUS_BADGE.present}`}
                      >
                        {t(`attendance.status.${record.status}`, record.status)}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setFormState({ record })}
                          className="flex h-8 w-8 items-center justify-center rounded-control text-ink-muted hover:bg-cream-soft"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
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
                ))}
              </tbody>
            </table>
          </div>
        )}
        {records && records.length > 0 && (
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
        )}
      </Card>

      {formState && (
        <AttendanceFormModal
          open
          record={formState.record}
          defaultFarmId={farmId !== "all" ? farmId : undefined}
          onClose={() => setFormState(null)}
          onSaved={loadRecords}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          open
          title={t("attendance.deleteConfirmTitle")}
          message={t("attendance.deleteConfirmMessage")}
          confirming={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
