import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

function daysUntil(dateStr) {
  return Math.floor((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
}

function severityForDays(days) {
  if (days <= 7) return "critical";
  if (days <= 30) return "warning";
  return null;
}

export function useAlerts() {
  const [alerts, setAlerts] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const result = [];

      // 1 + 2: stock balances vs thresholds (out-of-stock / low-stock)
      // Fetched unscoped (all farms) and shared via AlertsContext — consumers
      // filter by farm_id client-side so the badge and the page never issue
      // duplicate network requests.
      const { data: balances } = await supabase
        .from("stock_balances")
        .select("product_id, warehouse_id, farm_id, balance");

      if (balances && balances.length > 0) {
        const { data: thresholds } = await supabase
          .from("product_thresholds")
          .select("product_id, warehouse_id, min_threshold");
        const thresholdMap = {};
        (thresholds || []).forEach((row) => {
          thresholdMap[`${row.product_id}_${row.warehouse_id}`] = row.min_threshold;
        });

        const productIds = [...new Set(balances.map((b) => b.product_id))];
        const warehouseIds = [...new Set(balances.map((b) => b.warehouse_id))];
        const [{ data: products }, { data: warehouses }] = await Promise.all([
          productIds.length
            ? supabase.from("products").select("id, name_ar, name_fr").in("id", productIds)
            : Promise.resolve({ data: [] }),
          warehouseIds.length
            ? supabase.from("warehouses").select("id, name").in("id", warehouseIds)
            : Promise.resolve({ data: [] }),
        ]);
        const productMap = Object.fromEntries((products || []).map((p) => [p.id, p]));
        const warehouseMap = Object.fromEntries((warehouses || []).map((w) => [w.id, w.name]));

        balances.forEach((b) => {
          const threshold = thresholdMap[`${b.product_id}_${b.warehouse_id}`];
          const product = productMap[b.product_id];
          const warehouseName = warehouseMap[b.warehouse_id] || "";
          const balance = Number(b.balance);
          if (balance <= 0) {
            result.push({
              id: `stock-out-${b.product_id}-${b.warehouse_id}`,
              type: "stock_out",
              severity: "critical",
              farm_id: b.farm_id,
              params: { product, warehouseName, balance },
            });
          } else if (threshold != null && balance <= Number(threshold)) {
            result.push({
              id: `stock-low-${b.product_id}-${b.warehouse_id}`,
              type: "stock_low",
              severity: "warning",
              farm_id: b.farm_id,
              params: { product, warehouseName, balance, threshold },
            });
          }
        });
      }

      // 3: vehicle insurance / inspection expiry
      const { data: vehicles } = await supabase
        .from("vehicles")
        .select("id, plate_no, farm_id, insurance_expiry, inspection_expiry");
      (vehicles || []).forEach((v) => {
        [
          { field: "insurance_expiry", type: "vehicle_insurance" },
          { field: "inspection_expiry", type: "vehicle_inspection" },
        ].forEach(({ field, type }) => {
          const date = v[field];
          if (!date) return;
          const days = daysUntil(date);
          const severity = severityForDays(days);
          if (severity) {
            result.push({
              id: `${type}-${v.id}`,
              type,
              severity,
              farm_id: v.farm_id,
              params: { plateNo: v.plate_no, date, days },
            });
          }
        });
      });

      // 4: equipment next maintenance
      const { data: equipmentRows } = await supabase
        .from("equipment")
        .select("id, code, farm_id, next_maintenance_date");
      (equipmentRows || []).forEach((e) => {
        if (!e.next_maintenance_date) return;
        const days = daysUntil(e.next_maintenance_date);
        const severity = severityForDays(days);
        if (severity) {
          result.push({
            id: `equipment_maintenance-${e.id}`,
            type: "equipment_maintenance",
            severity,
            farm_id: e.farm_id,
            params: { code: e.code, date: e.next_maintenance_date, days },
          });
        }
      });

      const severityOrder = { critical: 0, warning: 1 };
      result.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

      if (!cancelled) {
        setAlerts(result);
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { alerts: alerts || [], loading };
}
