import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export function useFuelTankOptions(farmId) {
  const [tanks, setTanks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    let query = supabase
      .from("warehouses")
      .select("id, name, farm_id, type")
      .eq("type", "fuel_tank")
      .order("name", { ascending: true });
    if (farmId && farmId !== "all") {
      query = query.eq("farm_id", farmId);
    }
    query.then(({ data }) => {
      if (!cancelled) {
        setTanks(data || []);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [farmId]);

  return { tanks, loading };
}
