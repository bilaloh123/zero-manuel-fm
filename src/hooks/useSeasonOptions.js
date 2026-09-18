import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export function useSeasonOptions(farmId) {
  const [seasons, setSeasons] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    let query = supabase
      .from("seasons")
      .select("id, label, farm_id")
      .order("start_date", { ascending: false });
    if (farmId && farmId !== "all") {
      query = query.or(`farm_id.is.null,farm_id.eq.${farmId}`);
    }
    query.then(({ data }) => {
      if (!cancelled) {
        setSeasons(data || []);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [farmId]);

  return { seasons, loading };
}
