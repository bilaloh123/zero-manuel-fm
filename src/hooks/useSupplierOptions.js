import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export function useSupplierOptions() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("suppliers")
      .select("id, company_name")
      .order("company_name", { ascending: true })
      .then(({ data }) => {
        if (!cancelled) {
          setSuppliers(data || []);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { suppliers, loading };
}
