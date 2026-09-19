import { useSupabaseOptions } from "./useSupabaseOptions";

export function useEmployeeOptions(farmId) {
  const { data, loading } = useSupabaseOptions("employees", {
    select: "id, full_name, farm_id",
    orderBy: "full_name",
    farmId,
    farmScoped: true,
  });
  return { employees: data, loading };
}
