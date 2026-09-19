import { useSupabaseOptions } from "./useSupabaseOptions";

export function useParcelOptions(farmId) {
  const { data, loading } = useSupabaseOptions("parcels", {
    select: "id, code, name, farm_id",
    orderBy: "name",
    farmId,
    farmScoped: true,
  });
  return { parcels: data, loading };
}
