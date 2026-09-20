import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, ListPlus } from "lucide-react";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";
import PackingRunFormModal from "../components/packingruns/PackingRunFormModal";
import PackingRunItemsModal from "../components/packingruns/PackingRunItemsModal";
import { supabase } from "../lib/supabaseClient";
import { useFilters } from "../context/FiltersContext";

const STATUS_BADGE = {
  in_progress: "bg-amber-100 text-amber-700",
  completed: "bg-brand-100 text-brand-700",
};

export default function PackingRunsPage() {
  const { t } = useTranslation();
  const { farmId } = useFilters();
  const [runs, setRuns] = useState(null);
  const [rendements, setRendements] = useState({});
  const [error, setError] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [itemsTarget, setItemsTarget] = useState(null);

  const loadRuns = useCallback(async () => {
    setError(null);
    let query = supabase
      .from("packing_runs")
      .select("id, farm_id, status, started_at, ended_at, warehouses:warehouse_id(name)")
      .order("started_at", { ascending: false });
    if (farmId !== "all") {
      query = query.eq("farm_id", farmId);
    }
    const { data, error: fetchError } = await query;
    if (fetchError) {
      setError(fetchError.message);
      setRuns([]);
      return;
    }
    setRuns(data);

    const results = await Promise.all(
      (data || []).map(async (run) => {
        const [{ data: inputs }, { data: outputs }] = await Promise.all([
          supabase.from("packing_run_inputs").select("quantity_kg").eq("packing_run_id", run.id),
          supabase.from("packing_run_outputs").select("quantity_kg").eq("packing_run_id", run.id),
        ]);
        const totalIn = (inputs || []).reduce((s, i) => s + Number(i.quantity_kg), 0);
        const totalOut = (outputs || []).reduce((s, o) => s + Number(o.quantity_kg), 0);
        return [run.id, totalIn > 0 ? (totalOut / totalIn) * 100 : null];
      })
    );
    setRendements(Object.fromEntries(results));
  }, [farmId]);

  useEffect(() => {
    setRuns(null);
    loadRuns();
  }, [loadRuns]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">{t("packingRuns.title")}</h1>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" />
          {t("packingRuns.add")}
        </Button>
      </div>

      <Card>
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {runs === null ? (
          <p className="py-8 text-center text-sm text-ink-muted">{t("common.loading")}</p>
        ) : runs.length === 0 ? (
          <EmptyState message={t("common.noData")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead>
                <tr className="border-b border-border text-ink-muted">
                  <th className="px-3 py-2 text-start font-medium">{t("packingRuns.columns.warehouse")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("packingRuns.columns.startedAt")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("packingRuns.columns.status")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("packingRuns.columns.rendement")}</th>
                  <th className="px-3 py-2 text-end font-medium">{t("packingRuns.columns.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => {
                  const rendement = rendements[run.id];
                  return (
                    <tr key={run.id} className="border-b border-border last:border-0">
                      <td className="px-3 py-3 font-medium text-ink">{run.warehouses?.name || "—"}</td>
                      <td className="px-3 py-3 text-ink-muted">{new Date(run.started_at).toLocaleString()}</td>
                      <td className="px-3 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[run.status]}`}>
                          {t(`packingRuns.status.${run.status}`)}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`font-medium ${rendement != null && rendement < 70 ? "text-red-600" : "text-brand-700"}`}>
                          {rendement != null ? `${rendement.toFixed(1)}%` : "—"}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setItemsTarget(run)}
                            className="inline-flex items-center gap-1.5 rounded-control border border-border px-2.5 py-1 text-xs font-medium text-ink hover:bg-cream-soft"
                          >
                            <ListPlus className="h-3.5 w-3.5" />
                            {t("packingRuns.items.manage")}
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
        <PackingRunFormModal
          open
          defaultFarmId={farmId !== "all" ? farmId : undefined}
          onClose={() => setFormOpen(false)}
          onSaved={loadRuns}
        />
      )}

      {itemsTarget && (
        <PackingRunItemsModal
          open
          run={itemsTarget}
          onClose={() => {
            setItemsTarget(null);
            loadRuns();
          }}
        />
      )}
    </div>
  );
}
