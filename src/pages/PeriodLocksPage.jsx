import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Lock } from "lucide-react";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";
import PeriodLockFormModal from "../components/periodlocks/PeriodLockFormModal";
import { supabase } from "../lib/supabaseClient";
import { useFilters } from "../context/FiltersContext";

export default function PeriodLocksPage() {
  const { t } = useTranslation();
  const { farmId } = useFilters();
  const [locks, setLocks] = useState(null);
  const [error, setError] = useState(null);
  const [formOpen, setFormOpen] = useState(false);

  const loadLocks = useCallback(async () => {
    setError(null);
    let query = supabase
      .from("period_locks")
      .select("id, period_start, period_end, reason, locked_at, farms:farm_id(name), app_users:locked_by(full_name)")
      .order("period_start", { ascending: false });
    if (farmId !== "all") {
      query = query.eq("farm_id", farmId);
    }
    const { data, error: fetchError } = await query;
    if (fetchError) {
      setError(fetchError.message);
      setLocks([]);
      return;
    }
    setLocks(data);
  }, [farmId]);

  useEffect(() => {
    setLocks(null);
    loadLocks();
  }, [loadLocks]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">{t("periodLocks.title")}</h1>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" />
          {t("periodLocks.add")}
        </Button>
      </div>

      <p className="rounded-control bg-cream-soft px-3 py-2 text-xs text-ink-muted">{t("periodLocks.noUnlockNotice")}</p>

      <Card>
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {locks === null ? (
          <p className="py-8 text-center text-sm text-ink-muted">{t("common.loading")}</p>
        ) : locks.length === 0 ? (
          <EmptyState message={t("common.noData")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead>
                <tr className="border-b border-border text-ink-muted">
                  <th className="px-3 py-2 text-start font-medium">{t("periodLocks.columns.farm")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("periodLocks.columns.period")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("periodLocks.columns.reason")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("periodLocks.columns.lockedBy")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("periodLocks.columns.lockedAt")}</th>
                </tr>
              </thead>
              <tbody>
                {locks.map((lock) => (
                  <tr key={lock.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-3 font-medium text-ink">{lock.farms?.name || "—"}</td>
                    <td className="px-3 py-3 text-ink-muted">
                      <span className="inline-flex items-center gap-1.5">
                        <Lock className="h-3.5 w-3.5 text-red-600" />
                        {lock.period_start} → {lock.period_end}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-ink-muted">{lock.reason || "—"}</td>
                    <td className="px-3 py-3 text-ink-muted">{lock.app_users?.full_name || "—"}</td>
                    <td className="px-3 py-3 text-ink-muted">{new Date(lock.locked_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {formOpen && (
        <PeriodLockFormModal
          open
          defaultFarmId={farmId !== "all" ? farmId : undefined}
          onClose={() => setFormOpen(false)}
          onSaved={loadLocks}
        />
      )}
    </div>
  );
}
