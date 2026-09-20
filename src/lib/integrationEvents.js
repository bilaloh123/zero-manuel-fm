import { supabase } from "./supabaseClient";

// Generic logging point for any future integration (SMS, WhatsApp, accounting,
// banking, GPS, weather, IoT...). Business-logic pages should call this instead
// of embedding a specific vendor's SDK/API calls directly.
export async function logIntegrationEvent({
  integrationId = null,
  direction,
  eventType,
  payload = null,
  status = "pending",
  errorMessage = null,
  relatedTable = null,
  relatedId = null,
}) {
  const { error } = await supabase.from("integration_events").insert({
    integration_id: integrationId,
    direction,
    event_type: eventType,
    payload,
    status,
    error_message: errorMessage,
    related_table: relatedTable,
    related_id: relatedId,
  });
  if (error) throw error;
}
