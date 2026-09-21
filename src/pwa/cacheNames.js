// Shared between vite.config.js (Workbox runtimeCaching config, Node context)
// and app code (the sign-out cache-clear in AuthContext) so the two never
// drift apart into two different literal strings.
export const SUPABASE_API_CACHE = "supabase-api-cache";
