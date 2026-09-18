import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export function useDriverOptions(farmId) {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    let query = supabase.from("drivers").select("id, full_name, farm_id").order("full_name", { ascending: true });
    if (farmId && farmId !== "all") {
      query = query.eq("farm_id", farmId);
    }
    query.then(({ data }) => {
      if (!cancelled) {
        setDrivers(data || []);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [farmId]);

  return { drivers, loading };
}
