import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export function useAppUserOptions() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("app_users")
      .select("id, full_name")
      .order("full_name", { ascending: true })
      .then(({ data }) => {
        if (!cancelled) {
          setUsers(data || []);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { users, loading };
}
