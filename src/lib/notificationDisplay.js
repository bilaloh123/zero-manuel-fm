export function notificationMessage(notification, t) {
  const p = notification.params || {};
  switch (notification.type) {
    case "period_locked":
      return t("notifications.messages.period_locked", { start: p.period_start, end: p.period_end });
    case "transfer_cancelled":
      return t("notifications.messages.transfer_cancelled", { quantity: p.quantity });
    case "transfer_variance":
      return t("notifications.messages.transfer_variance", {
        sent: p.sent_quantity,
        received: p.received_quantity,
        variance: p.variance,
      });
    case "purchase_order_confirmed":
      return t("notifications.messages.purchase_order_confirmed");
    case "quality_check_failed":
      return t("notifications.messages.quality_check_failed", {
        stage: p.stage || "-",
        reason: p.reject_reason || "-",
      });
    default:
      return t(`notifications.types.${notification.type}`, notification.type);
  }
}
