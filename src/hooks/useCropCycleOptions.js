import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export function useCropCycleOptions(farmId) {
  const [cropCycles, setCropCycles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!farmId || farmId === "all") {
      setCropCycles([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from("crop_cycles")
      .select(
        "id, parcel_id, crop_id, season_id, status, parcels!inner(id, name, code, farm_id), crops:crop_id(name_ar, name_fr), seasons:season_id(label)"
      )
      .eq("parcels.farm_id", farmId)
      .then(({ data }) => {
        if (!cancelled) {
          setCropCycles(data || []);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [farmId]);

  return { cropCycles, loading };
}
