import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export function useCropOptions() {
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("crops")
      .select("id, name_ar, name_fr, category")
      .order("name_fr", { ascending: true })
      .then(({ data }) => {
        if (!cancelled) {
          setCrops(data || []);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { crops, loading };
}
