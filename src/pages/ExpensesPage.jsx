import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2 } from "lucide-react";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import StatTile from "../components/ui/StatTile";
import Pagination from "../components/ui/Pagination";
import ExpenseFormModal from "../components/expenses/ExpenseFormModal";
import { supabase } from "../lib/supabaseClient";
import { useFilters } from "../context/FiltersContext";
import { inputClass } from "../components/ui/FormField";

const PAGE_SIZE = 25;

const CATEGORY_OPTIONS = [
  "labor",
  "fertilizer",
  "treatment",
  "irrigation",
  "transport",
  "fuel",
  "maintenance",
  "packaging",
];

function dateStr(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function ExpensesPage() {
  const { t } = useTranslation();
  const { farmId, periodRange } = useFilters();
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [expenses, setExpenses] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [kpi, setKpi] = useState({ total: 0, byCategory: {} });
  const [error, setError] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const applyFilters = useCallback(
    (query) => {
      let q = query;
      if (farmId !== "all") q = q.eq("farm_id", farmId);
      if (categoryFilter !== "all") q = q.eq("category", categoryFilter);
      if (periodRange.start) q = q.gte("expense_date", dateStr(periodRange.start));
      q = q.lte("expense_date", dateStr(periodRange.end));
      return q;
    },
    [farmId, categoryFilter, periodRange]
  );

  // KPI tiles must reflect the full filtered set, not just the current page,
  // so they're computed from a separate lightweight (amount, category only)
  // unpaginated query rather than from the paginated table rows.
  const loadExpenses = useCallback(async () => {
    setError(null);
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const listQuery = applyFilters(
      supabase
        .from("expenses")
        .select("id, category, amount, expense_date, farm_id, parcels:parcel_id(name, code)", { count: "exact" })
    )
      .order("expense_date", { ascending: false })
      .range(from, to);
    const kpiQuery = applyFilters(supabase.from("expenses").select("amount, category"));

    const [listRes, kpiRes] = await Promise.all([listQuery, kpiQuery]);

    if (listRes.error) {
      setError(listRes.error.message);
      setExpenses([]);
      return;
    }
    if ((listRes.data || []).length === 0 && page > 1) {
      setPage((p) => p - 1);
      return;
    }
    setExpenses(listRes.data);
    setTotal(listRes.count || 0);

    if (!kpiRes.error) {
      const sums = {};
      let sum = 0;
      (kpiRes.data || []).forEach((e) => {
        sum += Number(e.amount);
        sums[e.category] = (sums[e.category] || 0) + Number(e.amount);
      });
      setKpi({ total: sum, byCategory: sums });
    }
  }, [applyFilters, page]);

  useEffect(() => {
    setPage(1);
  }, [farmId, categoryFilter, periodRange]);

  useEffect(() => {
    setExpenses(null);
    loadExpenses();
  }, [loadExpenses]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error: deleteError } = await supabase.from("expenses").delete().eq("id", deleteTarget.id);
      if (deleteError) throw deleteError;
      setDeleteTarget(null);
      await loadExpenses();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">{t("expenses.title")}</h1>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" />
          {t("expenses.add")}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label={t("expenses.totalForPeriod")} value={kpi.total.toFixed(2)} accent />
        {CATEGORY_OPTIONS.filter((c) => kpi.byCategory[c]).map((c) => (
          <StatTile key={c} label={t(`expenses.categories.${c}`)} value={kpi.byCategory[c].toFixed(2)} />
        ))}
      </div>

      <div className="flex items-center gap-3">
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className={`${inputClass} max-w-xs`}
        >
          <option value="all">{t("expenses.allCategories")}</option>
          {CATEGORY_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {t(`expenses.categories.${opt}`)}
            </option>
          ))}
        </select>
      </div>

      <Card>
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {expenses === null ? (
          <p className="py-8 text-center text-sm text-ink-muted">{t("common.loading")}</p>
        ) : expenses.length === 0 ? (
          <EmptyState message={t("common.noData")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead>
                <tr className="border-b border-border text-ink-muted">
                  <th className="px-3 py-2 text-start font-medium">{t("expenses.columns.date")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("expenses.columns.category")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("expenses.columns.parcel")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("expenses.columns.amount")}</th>
                  <th className="px-3 py-2 text-end font-medium">{t("expenses.columns.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => (
                  <tr key={expense.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-3 text-ink-muted">{expense.expense_date}</td>
                    <td className="px-3 py-3 text-ink">{t(`expenses.categories.${expense.category}`, expense.category)}</td>
                    <td className="px-3 py-3 text-ink-muted">{expense.parcels?.name || expense.parcels?.code || "—"}</td>
                    <td className="px-3 py-3 font-medium text-ink">{expense.amount}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(expense)}
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
        {expenses && expenses.length > 0 && (
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
        )}
      </Card>

      {formOpen && (
        <ExpenseFormModal
          open
          defaultFarmId={farmId !== "all" ? farmId : undefined}
          onClose={() => setFormOpen(false)}
          onSaved={loadExpenses}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          open
          title={t("expenses.deleteConfirmTitle")}
          message={t("expenses.deleteConfirmMessage")}
          confirming={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
