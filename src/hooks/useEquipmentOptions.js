import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export function useEquipmentOptions(farmId) {
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    let query = supabase.from("equipment").select("id, code, farm_id").order("code", { ascending: true });
    if (farmId && farmId !== "all") {
      query = query.eq("farm_id", farmId);
    }
    query.then(({ data }) => {
      if (!cancelled) {
        setEquipment(data || []);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [farmId]);

  return { equipment, loading };
}
