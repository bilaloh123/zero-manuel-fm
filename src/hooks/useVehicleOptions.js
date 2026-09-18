import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export function useVehicleOptions(farmId) {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    let query = supabase.from("vehicles").select("id, plate_no, farm_id").order("plate_no", { ascending: true });
    if (farmId && farmId !== "all") {
      query = query.eq("farm_id", farmId);
    }
    query.then(({ data }) => {
      if (!cancelled) {
        setVehicles(data || []);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [farmId]);

  return { vehicles, loading };
}
