import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Eye, Check } from "lucide-react";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Modal from "../components/ui/Modal";
import Button from "../components/ui/Button";
import Pagination from "../components/ui/Pagination";
import { inputClass } from "../components/ui/FormField";
import { supabase } from "../lib/supabaseClient";

const PAGE_SIZE = 25;

const OP_BADGE = {
  insert: "bg-brand-100 text-brand-700",
  update: "bg-blue-100 text-blue-700",
};

function FailureDetailModal({ entry, t, onClose }) {
  return (
    <Modal
      open
      onClose={onClose}
      title={t("offlineFailures.detailModal.title")}
      footer={<Button onClick={onClose}>{t("common.confirm")}</Button>}
    >
      <div className="flex flex-col gap-4 text-sm">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="mb-1 text-xs font-medium text-ink-muted">{t("offlineFailures.detailModal.queueId")}</p>
            <p className="font-mono text-xs text-ink">{entry.queue_id}</p>
          </div>
          {entry.match_id && (
            <div>
              <p className="mb-1 text-xs font-medium text-ink-muted">{t("offlineFailures.detailModal.matchId")}</p>
              <p className="font-mono text-xs text-ink">{entry.match_id}</p>
            </div>
          )}
        </div>

        <div>
          <p className="mb-1 text-xs font-medium text-ink-muted">{t("offlineFailures.columns.error")}</p>
          <p className="rounded-control bg-red-50 p-3 text-xs text-red-700" dir="ltr">
            {entry.error_message}
          </p>
        </div>

        <div>
          <p className="mb-1 text-xs font-medium text-ink-muted">{t("offlineFailures.detailModal.payload")}</p>
          <pre className="max-h-64 overflow-auto rounded-control bg-cream-soft p-3 text-xs" dir="ltr">
            {JSON.stringify(entry.payload, null, 2)}
          </pre>
        </div>

        {entry.depends_on?.length > 0 && (
          <div>
            <p className="mb-1 text-xs font-medium text-ink-muted">{t("offlineFailures.detailModal.dependsOn")}</p>
            <pre className="max-h-32 overflow-auto rounded-control bg-cream-soft p-3 text-xs" dir="ltr">
              {JSON.stringify(entry.depends_on, null, 2)}
            </pre>
          </div>
        )}

        {entry.resolved && (
          <div className="grid grid-cols-2 gap-3 border-t border-border pt-3">
            <div>
              <p className="mb-1 text-xs font-medium text-ink-muted">{t("offlineFailures.detailModal.resolvedBy")}</p>
              <p className="text-ink">{entry.resolver?.full_name || "—"}</p>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-ink-muted">{t("offlineFailures.detailModal.resolvedAt")}</p>
              <p className="text-ink">{entry.resolved_at ? new Date(entry.resolved_at).toLocaleString() : "—"}</p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default function OfflineFailuresPage() {
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] = useState("unresolved");
  const [entries, setEntries] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [error, setError] = useState(null);
  const [detailEntry, setDetailEntry] = useState(null);
  const [resolvingId, setResolvingId] = useState(null);

  const loadEntries = useCallback(async () => {
    setError(null);
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    let query = supabase
      .from("offline_sync_failures")
      .select(
        "id, queue_id, table_name, op, payload, match_id, depends_on, error_message, failed_at, resolved, resolved_at, reporter:user_id(full_name), resolver:resolved_by(full_name)",
        { count: "exact" }
      )
      .order("failed_at", { ascending: false })
      .range(from, to);
    if (statusFilter === "unresolved") query = query.eq("resolved", false);
    if (statusFilter === "resolved") query = query.eq("resolved", true);

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
  }, [statusFilter, page]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  useEffect(() => {
    setEntries(null);
    loadEntries();
  }, [loadEntries]);

  const handleMarkResolved = async (entry) => {
    setResolvingId(entry.id);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error: updateError } = await supabase
        .from("offline_sync_failures")
        .update({ resolved: true, resolved_at: new Date().toISOString(), resolved_by: user.id })
        .eq("id", entry.id);
      if (updateError) throw updateError;
      await loadEntries();
    } catch (err) {
      setError(err.message);
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-ink">{t("offlineFailures.title")}</h1>

      <div className="flex flex-wrap items-end gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={`${inputClass} max-w-xs`}
        >
          <option value="unresolved">{t("offlineFailures.filters.unresolved")}</option>
          <option value="resolved">{t("offlineFailures.filters.resolved")}</option>
          <option value="all">{t("offlineFailures.filters.all")}</option>
        </select>
      </div>

      <Card>
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {entries === null ? (
          <p className="py-8 text-center text-sm text-ink-muted">{t("common.loading")}</p>
        ) : entries.length === 0 ? (
          <EmptyState message={t("offlineFailures.empty")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead>
                <tr className="border-b border-border text-ink-muted">
                  <th className="px-3 py-2 text-start font-medium">{t("offlineFailures.columns.failedAt")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("offlineFailures.columns.user")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("offlineFailures.columns.table")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("offlineFailures.columns.op")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("offlineFailures.columns.error")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("offlineFailures.columns.status")}</th>
                  <th className="px-3 py-2 text-end font-medium">{t("offlineFailures.columns.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-3 text-ink-muted">{new Date(entry.failed_at).toLocaleString()}</td>
                    <td className="px-3 py-3 text-ink-muted">{entry.reporter?.full_name || "—"}</td>
                    <td className="px-3 py-3 font-mono text-xs text-ink">{entry.table_name}</td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${OP_BADGE[entry.op] || OP_BADGE.insert}`}>
                        {t(`offlineFailures.op.${entry.op}`)}
                      </span>
                    </td>
                    <td className="max-w-xs truncate px-3 py-3 text-ink-muted" title={entry.error_message}>
                      {entry.error_message}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          entry.resolved ? "bg-brand-100 text-brand-700" : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {t(`offlineFailures.status.${entry.resolved ? "resolved" : "unresolved"}`)}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setDetailEntry(entry)}
                          className="flex h-8 w-8 items-center justify-center rounded-control text-ink-muted hover:bg-cream-soft"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {!entry.resolved && (
                          <button
                            type="button"
                            onClick={() => handleMarkResolved(entry)}
                            disabled={resolvingId === entry.id}
                            title={t("offlineFailures.markResolved")}
                            className="flex h-8 w-8 items-center justify-center rounded-control text-brand-600 hover:bg-brand-50 disabled:opacity-50"
                          >
                            <Check className="h-4 w-4" />
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
        {entries && entries.length > 0 && (
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
        )}
      </Card>

      {detailEntry && <FailureDetailModal entry={detailEntry} t={t} onClose={() => setDetailEntry(null)} />}
    </div>
  );
}
