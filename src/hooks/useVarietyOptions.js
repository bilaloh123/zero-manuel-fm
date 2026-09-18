import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export function useVarietyOptions(cropId) {
  const [varieties, setVarieties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!cropId) {
      setVarieties([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from("varieties")
      .select("id, name, crop_id")
      .eq("crop_id", cropId)
      .order("name", { ascending: true })
      .then(({ data }) => {
        if (!cancelled) {
          setVarieties(data || []);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [cropId]);

  return { varieties, loading };
}
