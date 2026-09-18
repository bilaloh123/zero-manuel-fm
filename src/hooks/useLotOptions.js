import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export function useLotOptions(farmId) {
  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    let query = supabase
      .from("lots")
      .select("id, lot_code, parcels!inner(farm_id)")
      .order("lot_code", { ascending: false });
    if (farmId && farmId !== "all") {
      query = query.eq("parcels.farm_id", farmId);
    }
    query.then(({ data }) => {
      if (!cancelled) {
        setLots(data || []);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [farmId]);

  return { lots, loading };
}
