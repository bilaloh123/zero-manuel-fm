import { useSupabaseOptions } from "./useSupabaseOptions";

export function useEquipmentOptions(farmId) {
  const { data, loading } = useSupabaseOptions("equipment", {
    select: "id, code, farm_id",
    orderBy: "code",
    farmId,
    farmScoped: true,
  });
  return { equipment: data, loading };
}
