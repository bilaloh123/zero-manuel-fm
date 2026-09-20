import { supabase } from "./supabaseClient";

// A purchase order line has no parcel/crop_cycle/season — so "Engagé" can
// only ever be attributed at farm level. This mirrors products.category
// (purchase side) onto the expenses.category vocabulary (budget side).
const PRODUCT_CATEGORY_TO_BUDGET_CATEGORY = {
  fertilizer: "fertilizer",
  seed: "fertilizer",
  pesticide: "treatment",
  fuel: "fuel",
  packaging: "packaging",
  spare_part: "maintenance",
  harvested_product: "other",
};

const ENGAGED_STATUSES = ["draft", "approved", "confirmed"];

function resolveExpenseScope(expense) {
  const lot = expense.lots;
  const cc = expense.crop_cycles;
  const parcel_id = lot?.parcel_id ?? cc?.parcel_id ?? expense.parcel_id ?? null;
  const site_id = lot?.parcels?.site_id ?? cc?.parcels?.site_id ?? expense.parcels?.site_id ?? null;
  const season_id = lot?.season_id ?? cc?.season_id ?? null;
  return {
    parcel_id,
    site_id,
    crop_cycle_id: expense.crop_cycle_id ?? null,
    season_id,
  };
}

function matchesBudgetScope(budget, scope) {
  switch (budget.level) {
    case "farm":
      return true;
    case "site":
      return scope.site_id === budget.site_id;
    case "parcel":
      return scope.parcel_id === budget.parcel_id;
    case "crop_cycle":
      return scope.crop_cycle_id === budget.crop_cycle_id;
    case "season":
      return scope.season_id === budget.season_id;
    default:
      return false;
  }
}

export async function computeRealise(budget) {
  const { data, error } = await supabase
    .from("expenses")
    .select(
      "id, amount, parcel_id, crop_cycle_id, parcels:parcel_id(site_id), crop_cycles:crop_cycle_id(parcel_id, season_id, parcels:parcel_id(site_id)), lots:lot_id(parcel_id, season_id, parcels:parcel_id(site_id))"
    )
    .eq("farm_id", budget.farm_id)
    .eq("category", budget.category)
    .gte("expense_date", budget.period_start)
    .lte("expense_date", budget.period_end);
  if (error) throw error;

  return (data || [])
    .filter((expense) => matchesBudgetScope(budget, resolveExpenseScope(expense)))
    .reduce((sum, expense) => sum + Number(expense.amount), 0);
}

export async function computeEngage(budget) {
  if (budget.level !== "farm") {
    return 0;
  }
  const { data, error } = await supabase
    .from("purchase_order_lines")
    .select("quantity, unit_price, tax, products:product_id(category), purchase_orders:order_id!inner(requesting_farm_id, status)")
    .eq("purchase_orders.requesting_farm_id", budget.farm_id)
    .in("purchase_orders.status", ENGAGED_STATUSES);
  if (error) throw error;

  return (data || [])
    .filter((line) => PRODUCT_CATEGORY_TO_BUDGET_CATEGORY[line.products?.category] === budget.category)
    .reduce((sum, line) => sum + Number(line.quantity) * Number(line.unit_price) * (1 + Number(line.tax || 0) / 100), 0);
}

export async function computeBudgetComparison(budget) {
  const [realise, engage] = await Promise.all([computeRealise(budget), computeEngage(budget)]);
  const disponible = Number(budget.amount) - realise - engage;
  const ecart = realise - Number(budget.amount);
  const ecartPct = Number(budget.amount) > 0 ? (ecart / Number(budget.amount)) * 100 : null;
  return { realise, engage, disponible, ecart, ecartPct };
}
