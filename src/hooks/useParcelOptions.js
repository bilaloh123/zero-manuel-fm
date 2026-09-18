import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export function useParcelOptions(farmId) {
  const [parcels, setParcels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    let query = supabase.from("parcels").select("id, code, name, farm_id").order("name", { ascending: true });
    if (farmId && farmId !== "all") {
      query = query.eq("farm_id", farmId);
    }
    query.then(({ data }) => {
      if (!cancelled) {
        setParcels(data || []);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [farmId]);

  return { parcels, loading };
}
