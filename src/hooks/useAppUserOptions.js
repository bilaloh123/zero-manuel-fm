import { useSupabaseOptions } from "./useSupabaseOptions";

export function useAppUserOptions() {
  const { data, loading } = useSupabaseOptions("app_users", { select: "id, full_name", orderBy: "full_name" });
  return { users: data, loading };
}
