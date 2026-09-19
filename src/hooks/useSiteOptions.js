import { useSupabaseOptions } from "./useSupabaseOptions";

export function useSiteOptions(farmId) {
  const { data, loading } = useSupabaseOptions("sites", {
    select: "id, code, name, farm_id",
    orderBy: "name",
    farmId,
    farmScoped: true,
  });
  return { sites: data, loading };
}
