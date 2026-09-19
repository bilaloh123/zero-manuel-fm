import { AlertTriangle, AlertOctagon } from "lucide-react";

export const SEVERITY_STYLE = {
  critical: { badge: "bg-red-100 text-red-700", icon: AlertOctagon },
  warning: { badge: "bg-amber-100 text-amber-700", icon: AlertTriangle },
};

export function alertProductLabel(product, lang) {
  if (!product) return "";
  return lang === "ar" ? product.name_ar || product.name_fr : product.name_fr || product.name_ar;
}

export function alertMessage(alert, t, lang) {
  const p = alert.params;
  switch (alert.type) {
    case "stock_out":
      return t("alerts.messages.stock_out", { product: alertProductLabel(p.product, lang), warehouse: p.warehouseName });
    case "stock_low":
      return t("alerts.messages.stock_low", {
        product: alertProductLabel(p.product, lang),
        warehouse: p.warehouseName,
        balance: p.balance,
        threshold: p.threshold,
      });
    case "vehicle_insurance":
    case "vehicle_inspection":
      return t(`alerts.messages.${alert.type}`, { plateNo: p.plateNo, date: p.date, days: p.days });
    case "equipment_maintenance":
      return t("alerts.messages.equipment_maintenance", { code: p.code, date: p.date, days: p.days });
    default:
      return "";
  }
}
