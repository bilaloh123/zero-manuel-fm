import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Eye } from "lucide-react";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Modal from "../components/ui/Modal";
import Button from "../components/ui/Button";
import Pagination from "../components/ui/Pagination";
import { inputClass } from "../components/ui/FormField";
import { supabase } from "../lib/supabaseClient";
import { useFilters } from "../context/FiltersContext";

const PAGE_SIZE = 25;

const AUDITED_TABLES = [
  "farms",
  "employees",
  "app_users",
  "user_farm_access",
  "roles",
  "role_permissions",
  "stock_movements",
  "transfers",
  "purchase_orders",
  "expenses",
  "sales",
  "invoices",
];

const ACTION_BADGE = {
  INSERT: "bg-brand-100 text-brand-700",
  UPDATE: "bg-blue-100 text-blue-700",
  DELETE: "bg-red-100 text-red-700",
};

function AuditDetailModal({ entry, onClose, t }) {
  return (
    <Modal
      open
      onClose={onClose}
      title={t("auditLog.detailModal.title")}
      footer={<Button onClick={onClose}>{t("common.confirm")}</Button>}
    >
      <div className="flex flex-col gap-4">
        {entry.old_value && (
          <div>
            <p className="mb-1 text-xs font-medium text-ink-muted">{t("auditLog.detailModal.oldValue")}</p>
            <pre className="max-h-64 overflow-auto rounded-control bg-cream-soft p-3 text-xs" dir="ltr">
              {JSON.stringify(entry.old_value, null, 2)}
            </pre>
          </div>
        )}
        {entry.new_value && (
          <div>
            <p className="mb-1 text-xs font-medium text-ink-muted">{t("auditLog.detailModal.newValue")}</p>
            <pre className="max-h-64 overflow-auto rounded-control bg-cream-soft p-3 text-xs" dir="ltr">
              {JSON.stringify(entry.new_value, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default function AuditLogPage() {
  const { t } = useTranslation();
  const { farmId } = useFilters();
  const [tableFilter, setTableFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [entries, setEntries] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [error, setError] = useState(null);
  const [detailEntry, setDetailEntry] = useState(null);

  const loadEntries = useCallback(async () => {
    setError(null);
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    let query = supabase
      .from("audit_log")
      .select("id, action, table_name, record_id, old_value, new_value, occurred_at, users:user_id(full_name)", {
        count: "exact",
      })
      .order("occurred_at", { ascending: false })
      .range(from, to);
    if (farmId !== "all") query = query.eq("farm_id", farmId);
    if (tableFilter !== "all") query = query.eq("table_name", tableFilter);
    if (startDate) query = query.gte("occurred_at", new Date(startDate).toISOString());
    if (endDate) query = query.lte("occurred_at", new Date(`${endDate}T23:59:59`).toISOString());

    const { data, count, error: fetchError } = await query;
    if (fetchError) {
      setError(fetchError.message);
      setEntries([]);
      return;
    }
    if ((data || []).length === 0 && page > 1) {
      setPage((p) => p - 1);
      return;
    }
    setEntries(data);
    setTotal(count || 0);
  }, [farmId, tableFilter, startDate, endDate, page]);

  useEffect(() => {
    setPage(1);
  }, [farmId, tableFilter, startDate, endDate]);

  useEffect(() => {
    setEntries(null);
    loadEntries();
  }, [loadEntries]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-ink">{t("auditLog.title")}</h1>

      <div className="flex flex-wrap items-end gap-3">
        <select value={tableFilter} onChange={(e) => setTableFilter(e.target.value)} className={`${inputClass} max-w-xs`}>
          <option value="all">{t("auditLog.filters.allTables")}</option>
          {AUDITED_TABLES.map((table) => (
            <option key={table} value={table}>
              {table}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className={`${inputClass} max-w-xs`}
          placeholder={t("auditLog.filters.startDate")}
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className={`${inputClass} max-w-xs`}
          placeholder={t("auditLog.filters.endDate")}
        />
      </div>

      <Card>
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {entries === null ? (
          <p className="py-8 text-center text-sm text-ink-muted">{t("common.loading")}</p>
        ) : entries.length === 0 ? (
          <EmptyState message={t("common.noData")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead>
                <tr className="border-b border-border text-ink-muted">
                  <th className="px-3 py-2 text-start font-medium">{t("auditLog.columns.occurredAt")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("auditLog.columns.user")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("auditLog.columns.action")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("auditLog.columns.table")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("auditLog.columns.record")}</th>
                  <th className="px-3 py-2 text-end font-medium">{t("auditLog.columns.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-3 text-ink-muted">{new Date(entry.occurred_at).toLocaleString()}</td>
                    <td className="px-3 py-3 text-ink-muted">{entry.users?.full_name || "—"}</td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ACTION_BADGE[entry.action]}`}>
                        {t(`auditLog.actions.${entry.action}`)}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-ink">{entry.table_name}</td>
                    <td className="px-3 py-3 font-mono text-xs text-ink-muted">
                      {entry.record_id ? entry.record_id.slice(0, 8) : "—"}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => setDetailEntry(entry)}
                          className="flex h-8 w-8 items-center justify-center rounded-control text-ink-muted hover:bg-cream-soft"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {entries && entries.length > 0 && (
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
        )}
      </Card>

      {detailEntry && <AuditDetailModal entry={detailEntry} onClose={() => setDetailEntry(null)} t={t} />}
    </div>
  );
}
