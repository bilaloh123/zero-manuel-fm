import { useSupabaseOptions } from "./useSupabaseOptions";

export function useCropOptions() {
  const { data, loading } = useSupabaseOptions("crops", {
    select: "id, name_ar, name_fr, category",
    orderBy: "name_fr",
  });
  return { crops: data, loading };
}
