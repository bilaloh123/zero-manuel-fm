import { useSupabaseOptions } from "./useSupabaseOptions";

export function useDriverOptions(farmId) {
  const { data, loading } = useSupabaseOptions("drivers", {
    select: "id, full_name, farm_id",
    orderBy: "full_name",
    farmId,
    farmScoped: true,
  });
  return { drivers: data, loading };
}
