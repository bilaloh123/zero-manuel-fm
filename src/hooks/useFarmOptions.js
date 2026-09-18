import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export function useFarmOptions() {
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("farms")
      .select("id, code, name")
      .order("name", { ascending: true })
      .then(({ data }) => {
        if (!cancelled) {
          setFarms(data || []);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { farms, loading };
}
