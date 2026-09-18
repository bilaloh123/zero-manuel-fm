import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import { supabase } from "../lib/supabaseClient";
import { useFilters } from "../context/FiltersContext";
import { useProductOptions } from "../hooks/useProductOptions";
import { useWarehouseOptions } from "../hooks/useWarehouseOptions";

const STATUS_BADGE = {
  normal: "bg-brand-100 text-brand-700",
  low: "bg-amber-100 text-amber-700",
  out: "bg-red-100 text-red-700",
};

function computeStatus(balance, threshold) {
  if (balance <= 0) return "out";
  if (threshold != null && balance <= threshold) return "low";
  return "normal";
}

export default function StockBalancesPage() {
  const { t, i18n } = useTranslation();
  const { farmId } = useFilters();
  const { products } = useProductOptions();
  const { warehouses } = useWarehouseOptions(farmId);
  const [balances, setBalances] = useState(null);
  const [thresholds, setThresholds] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError(null);
      let query = supabase.from("stock_balances").select("product_id, warehouse_id, farm_id, balance");
      if (farmId !== "all") {
        query = query.eq("farm_id", farmId);
      }
      const { data, error: fetchError } = await query;
      if (cancelled) return;
      if (fetchError) {
        setError(fetchError.message);
        setBalances([]);
        return;
      }
      setBalances(data);

      const warehouseIds = [...new Set((data || []).map((row) => row.warehouse_id).filter(Boolean))];
      if (warehouseIds.length > 0) {
        const { data: thresholdRows } = await supabase
          .from("product_thresholds")
          .select("product_id, warehouse_id, min_threshold")
          .in("warehouse_id", warehouseIds);
        if (!cancelled) {
          const map = {};
          (thresholdRows || []).forEach((row) => {
            map[`${row.product_id}_${row.warehouse_id}`] = row.min_threshold;
          });
          setThresholds(map);
        }
      } else {
        setThresholds({});
      }
    }

    setBalances(null);
    load();
    return () => {
      cancelled = true;
    };
  }, [farmId]);

  const productMap = Object.fromEntries(products.map((p) => [p.id, p]));
  const warehouseMap = Object.fromEntries(warehouses.map((w) => [w.id, w]));

  const productLabel = (id) => {
    const p = productMap[id];
    if (!p) return "—";
    return i18n.language === "ar" ? p.name_ar || p.name_fr : p.name_fr || p.name_ar;
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-ink">{t("stockBalances.title")}</h1>

      <Card>
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {balances === null ? (
          <p className="py-8 text-center text-sm text-ink-muted">{t("common.loading")}</p>
        ) : balances.length === 0 ? (
          <EmptyState message={t("common.noData")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead>
                <tr className="border-b border-border text-ink-muted">
                  <th className="px-3 py-2 text-start font-medium">{t("stockBalances.columns.product")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("stockBalances.columns.warehouse")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("stockBalances.columns.balance")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("stockBalances.columns.status")}</th>
                </tr>
              </thead>
              <tbody>
                {balances.map((row) => {
                  const threshold = thresholds[`${row.product_id}_${row.warehouse_id}`];
                  const status = computeStatus(row.balance, threshold);
                  return (
                    <tr key={`${row.product_id}-${row.warehouse_id}`} className="border-b border-border last:border-0">
                      <td className="px-3 py-3 font-medium text-ink">{productLabel(row.product_id)}</td>
                      <td className="px-3 py-3 text-ink-muted">{warehouseMap[row.warehouse_id]?.name || "—"}</td>
                      <td className="px-3 py-3 text-ink-muted">{row.balance}</td>
                      <td className="px-3 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[status]}`}>
                          {t(`stockBalances.status.${status}`)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
