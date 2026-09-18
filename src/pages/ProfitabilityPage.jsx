import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import { supabase } from "../lib/supabaseClient";
import { useFilters } from "../context/FiltersContext";
import { inputClass } from "../components/ui/FormField";

const LEVELS = ["parcel", "crop", "season"];

function dateStr(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function cropLabel(crops, lang) {
  if (!crops) return null;
  return lang === "ar" ? crops.name_ar || crops.name_fr : crops.name_fr || crops.name_ar;
}

function resolveExpenseKeys(expense, lang) {
  const lot = expense.lots;
  const cc = expense.crop_cycles;
  return {
    parcel_id: lot?.parcel_id ?? cc?.parcel_id ?? expense.parcel_id ?? null,
    parcel_name: lot?.parcels?.name ?? cc?.parcels?.name ?? expense.parcels?.name ?? null,
    crop_id: lot?.crop_id ?? cc?.crop_id ?? null,
    crop_label: cropLabel(lot?.crops ?? cc?.crops, lang),
    season_id: lot?.season_id ?? cc?.season_id ?? null,
    season_label: (lot?.seasons ?? cc?.seasons)?.label ?? null,
  };
}

function resolveSaleKeys(sale, lang) {
  const lot = sale.lots;
  return {
    parcel_id: lot?.parcel_id ?? null,
    parcel_name: lot?.parcels?.name ?? null,
    crop_id: lot?.crop_id ?? null,
    crop_label: cropLabel(lot?.crops, lang),
    season_id: lot?.season_id ?? null,
    season_label: lot?.seasons?.label ?? null,
  };
}

export default function ProfitabilityPage() {
  const { t, i18n } = useTranslation();
  const { farmId, periodRange } = useFilters();
  const [level, setLevel] = useState("parcel");
  const [expenses, setExpenses] = useState(null);
  const [sales, setSales] = useState(null);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    setError(null);

    let expQuery = supabase
      .from("expenses")
      .select(
        "id, amount, expense_date, parcel_id, parcels:parcel_id(name), crop_cycles:crop_cycle_id(parcel_id, crop_id, season_id, parcels:parcel_id(name), crops:crop_id(name_ar, name_fr), seasons:season_id(label)), lots:lot_id(parcel_id, crop_id, season_id, parcels:parcel_id(name), crops:crop_id(name_ar, name_fr), seasons:season_id(label))"
      );
    if (farmId !== "all") expQuery = expQuery.eq("farm_id", farmId);
    if (periodRange.start) expQuery = expQuery.gte("expense_date", dateStr(periodRange.start));
    expQuery = expQuery.lte("expense_date", dateStr(periodRange.end));

    let salesQuery = supabase
      .from("sales")
      .select(
        "id, quantity, unit_price, status, sold_at, lots:lot_id(parcel_id, crop_id, season_id, parcels!inner(name, farm_id), crops:crop_id(name_ar, name_fr), seasons:season_id(label))"
      )
      .eq("status", "confirmed");
    if (farmId !== "all") salesQuery = salesQuery.eq("lots.parcels.farm_id", farmId);
    salesQuery = salesQuery.gte("sold_at", periodRange.start ? periodRange.start.toISOString() : "1970-01-01");
    salesQuery = salesQuery.lte("sold_at", periodRange.end.toISOString());

    const [expResult, salesResult] = await Promise.all([expQuery, salesQuery]);
    if (expResult.error) {
      setError(expResult.error.message);
      setExpenses([]);
    } else {
      setExpenses(expResult.data);
    }
    if (salesResult.error) {
      setError(salesResult.error.message);
      setSales([]);
    } else {
      setSales(salesResult.data);
    }
  }, [farmId, periodRange]);

  useEffect(() => {
    setExpenses(null);
    setSales(null);
    loadData();
  }, [loadData]);

  const rows = useMemo(() => {
    if (expenses === null || sales === null) return null;
    const buckets = {};

    const ensure = (key, label) => {
      if (!buckets[key]) buckets[key] = { key, label, costs: 0, revenue: 0 };
      return buckets[key];
    };

    expenses.forEach((expense) => {
      const keys = resolveExpenseKeys(expense, i18n.language);
      const id = keys[`${level}_id`];
      const label = level === "parcel" ? keys.parcel_name : level === "crop" ? keys.crop_label : keys.season_label;
      const key = id || "unspecified";
      ensure(key, id ? label : t("profitability.unspecified")).costs += Number(expense.amount);
    });

    sales.forEach((sale) => {
      const keys = resolveSaleKeys(sale, i18n.language);
      const id = keys[`${level}_id`];
      const label = level === "parcel" ? keys.parcel_name : level === "crop" ? keys.crop_label : keys.season_label;
      const key = id || "unspecified";
      ensure(key, id ? label : t("profitability.unspecified")).revenue += Number(sale.quantity) * Number(sale.unit_price);
    });

    return Object.values(buckets)
      .map((b) => ({
        ...b,
        margin: b.revenue - b.costs,
        marginPct: b.revenue > 0 ? ((b.revenue - b.costs) / b.revenue) * 100 : null,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [expenses, sales, level, i18n.language, t]);

  const totals = useMemo(() => {
    if (!rows) return null;
    const costs = rows.reduce((s, r) => s + r.costs, 0);
    const revenue = rows.reduce((s, r) => s + r.revenue, 0);
    return { costs, revenue, margin: revenue - costs, marginPct: revenue > 0 ? ((revenue - costs) / revenue) * 100 : null };
  }, [rows]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-ink">{t("profitability.title")}</h1>

      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-ink">{t("profitability.groupBy")}</label>
        <select value={level} onChange={(e) => setLevel(e.target.value)} className={`${inputClass} max-w-xs`}>
          {LEVELS.map((lvl) => (
            <option key={lvl} value={lvl}>
              {t(`profitability.levels.${lvl}`)}
            </option>
          ))}
        </select>
      </div>

      <Card>
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {rows === null ? (
          <p className="py-8 text-center text-sm text-ink-muted">{t("common.loading")}</p>
        ) : rows.length === 0 ? (
          <EmptyState message={t("common.noData")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead>
                <tr className="border-b border-border text-ink-muted">
                  <th className="px-3 py-2 text-start font-medium">{t("profitability.columns.name")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("profitability.columns.costs")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("profitability.columns.revenue")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("profitability.columns.margin")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("profitability.columns.marginPct")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key} className="border-b border-border last:border-0">
                    <td className="px-3 py-3 font-medium text-ink">{row.label}</td>
                    <td className="px-3 py-3 text-ink-muted">{row.costs.toFixed(2)}</td>
                    <td className="px-3 py-3 text-ink-muted">{row.revenue.toFixed(2)}</td>
                    <td className={`px-3 py-3 font-medium ${row.margin >= 0 ? "text-brand-700" : "text-red-600"}`}>
                      {row.margin.toFixed(2)}
                    </td>
                    <td className={`px-3 py-3 ${row.margin >= 0 ? "text-brand-700" : "text-red-600"}`}>
                      {row.marginPct != null ? `${row.marginPct.toFixed(1)}%` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
              {totals && (
                <tfoot>
                  <tr className="border-t border-border font-semibold text-ink">
                    <td className="px-3 py-3">{t("profitability.totals")}</td>
                    <td className="px-3 py-3">{totals.costs.toFixed(2)}</td>
                    <td className="px-3 py-3">{totals.revenue.toFixed(2)}</td>
                    <td className={totals.margin >= 0 ? "px-3 py-3 text-brand-700" : "px-3 py-3 text-red-600"}>
                      {totals.margin.toFixed(2)}
                    </td>
                    <td className={totals.margin >= 0 ? "px-3 py-3 text-brand-700" : "px-3 py-3 text-red-600"}>
                      {totals.marginPct != null ? `${totals.marginPct.toFixed(1)}%` : "—"}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
