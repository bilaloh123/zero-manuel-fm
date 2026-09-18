import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export function useSiteOptions(farmId) {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    let query = supabase.from("sites").select("id, code, name, farm_id").order("name", { ascending: true });
    if (farmId && farmId !== "all") {
      query = query.eq("farm_id", farmId);
    }
    query.then(({ data }) => {
      if (!cancelled) {
        setSites(data || []);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [farmId]);

  return { sites, loading };
}
