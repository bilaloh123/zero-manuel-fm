import { SUPABASE_API_CACHE } from "../pwa/cacheNames";

// The Supabase REST GET cache (vite.config.js runtimeCaching) is keyed by
// URL only, not by which user is signed in. On a shared device, without
// this, a second user signing in could see the first user's cached data.
// Called from AuthContext's signOut() — never left implicit.
export async function clearSupabaseApiCache() {
  if (!("caches" in window)) return;
  await caches.delete(SUPABASE_API_CACHE);
}
