import { useSupabaseOptions } from "./useSupabaseOptions";

export function useVehicleOptions(farmId) {
  const { data, loading } = useSupabaseOptions("vehicles", {
    select: "id, plate_no, farm_id",
    orderBy: "plate_no",
    farmId,
    farmScoped: true,
  });
  return { vehicles: data, loading };
}
