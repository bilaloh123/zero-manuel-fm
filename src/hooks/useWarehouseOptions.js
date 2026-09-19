import { useSupabaseOptions } from "./useSupabaseOptions";

export function useWarehouseOptions(farmId) {
  const { data, loading } = useSupabaseOptions("warehouses", {
    select: "id, name, farm_id",
    orderBy: "name",
    farmId,
    farmScoped: true,
  });
  return { warehouses: data, loading };
}
