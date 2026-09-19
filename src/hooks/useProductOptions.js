import { useSupabaseOptions } from "./useSupabaseOptions";

export function useProductOptions() {
  const { data, loading } = useSupabaseOptions("products", {
    select: "id, name_ar, name_fr, unit",
    orderBy: "name_fr",
  });
  return { products: data, loading };
}
