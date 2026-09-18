import { supabase } from "./supabaseClient";

function cropAbbreviation(nameFr) {
  const letters = (nameFr || "XXX").replace(/[^a-zA-Z]/g, "").toUpperCase();
  return (letters + "XXX").slice(0, 3);
}

async function nextSequenceNumber() {
  const { data, error } = await supabase.from("lots").select("lot_code");
  if (error) throw error;
  let max = 0;
  (data || []).forEach((row) => {
    const match = row.lot_code?.match(/(\d{6})$/);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n > max) max = n;
    }
  });
  return max + 1;
}

export async function generateLotCode({ year, farmCode, parcelCode, cropNameFr }) {
  const sequence = await nextSequenceNumber();
  const seqStr = String(sequence).padStart(6, "0");
  const crop = cropAbbreviation(cropNameFr);
  return `LOT-${year}-${farmCode}-${parcelCode}-${crop}-${seqStr}`;
}

export async function generateTicketNo(year) {
  const { data, error } = await supabase.from("weighing_tickets").select("ticket_no");
  if (error) throw error;
  let max = 0;
  (data || []).forEach((row) => {
    const match = row.ticket_no?.match(/(\d+)$/);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n > max) max = n;
    }
  });
  return `WT-${year}-${String(max + 1).padStart(5, "0")}`;
}
