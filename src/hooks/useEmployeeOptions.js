import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export function useEmployeeOptions(farmId) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    let query = supabase
      .from("employees")
      .select("id, full_name, farm_id")
      .order("full_name", { ascending: true });
    if (farmId && farmId !== "all") {
      query = query.eq("farm_id", farmId);
    }
    query.then(({ data }) => {
      if (!cancelled) {
        setEmployees(data || []);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [farmId]);

  return { employees, loading };
}
