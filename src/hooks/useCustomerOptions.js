import { useSupabaseOptions } from "./useSupabaseOptions";

export function useCustomerOptions() {
  const { data, loading } = useSupabaseOptions("customers", {
    select: "id, name, status",
    orderBy: "name",
  });
  return { customers: data, loading };
}
