import { useSupabaseOptions } from "./useSupabaseOptions";

export function useTeamOptions(farmId) {
  const { data, loading } = useSupabaseOptions("teams", {
    select: "id, name, farm_id",
    orderBy: "name",
    farmId,
    farmScoped: true,
  });
  return { teams: data, loading };
}
