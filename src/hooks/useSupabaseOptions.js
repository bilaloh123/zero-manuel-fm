import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export function useSupabaseOptions(table, { select, orderBy, farmId, farmScoped = false } = {}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    let query = supabase.from(table).select(select).order(orderBy, { ascending: true });
    if (farmScoped && farmId && farmId !== "all") {
      query = query.eq("farm_id", farmId);
    }
    query.then(({ data: rows }) => {
      if (!cancelled) {
        setData(rows || []);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [table, select, orderBy, farmScoped, farmId]);

  return { data, loading };
}
