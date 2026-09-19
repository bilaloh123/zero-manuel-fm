import { useSupabaseOptions } from "./useSupabaseOptions";

export function useSupplierOptions() {
  const { data, loading } = useSupabaseOptions("suppliers", {
    select: "id, company_name",
    orderBy: "company_name",
  });
  return { suppliers: data, loading };
}
