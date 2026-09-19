import { useSupabaseOptions } from "./useSupabaseOptions";

export function useFarmOptions() {
  const { data, loading } = useSupabaseOptions("farms", { select: "id, code, name", orderBy: "name" });
  return { farms: data, loading };
}
