import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { SUPABASE_API_CACHE } from "./src/pwa/cacheNames.js";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Workbox generates the service worker from this config at build
      // time — no hand-written sw.js. That hand-rolled file was removed
      // earlier for causing duplicate-React errors: it served a stale
      // cached index.html pointing at JS chunk hashes from a previous
      // build, so two incompatible bundles ended up loaded together.
      strategies: "generateSW",
      registerType: "prompt", // never force a reload out from under a field worker mid-form
      injectRegister: false, // registered manually via useRegisterSW() in PwaUpdatePrompt.jsx
      manifest: false, // public/manifest.json is already hand-maintained and linked from index.html
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        // The app currently ships as a single ~2.3MB JS chunk (a pre-existing
        // code-splitting opportunity, unrelated to PWA work) — above
        // Workbox's default 2MiB precache limit. Raised with headroom
        // rather than restructuring the bundle here.
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // Lets the SW answer navigations to any client-side route (e.g.
        // /harvest-sessions) while offline, since there's no server route
        // for it — the SPA shell loads and React Router takes over.
        //
        // Note: workbox-build's generateSW always registers the
        // NavigationRoute this creates BEFORE any custom runtimeCaching
        // rule, regardless of array order here — so a runtimeCaching entry
        // matching `request.mode === "navigate"` would never actually be
        // reached (verified against the generated dist/sw.js: it is
        // registered first and has no denylist, so it wins every time).
        // Getting a literal NetworkFirst-for-HTML policy on top of that
        // would need injectManifest (hand-written SW source) — exactly
        // the "hand-rolled" approach being avoided here. Freshness instead
        // comes from precacheAndRoute's per-build content revisioning
        // (index.html's precache entry gets a new hash whenever its build
        // output changes) combined with registerType:"prompt": a client
        // running an old SW is told a new one is ready and reloads onto
        // an entirely new, internally-consistent precache set — it never
        // serves an old shell against new chunks or vice versa.
        navigateFallback: "/index.html",
        globPatterns: ["**/*.{js,css,html,svg,png,ico,webmanifest}"],
        runtimeCaching: [
          {
            // Hashed JS/CSS: safe to cache forever, because the filename
            // itself changes whenever the content does (Vite's build
            // hashing) — there is no such thing as a "stale" cache hit here.
            urlPattern: ({ request }) => ["script", "style", "worker"].includes(request.destination),
            handler: "CacheFirst",
            options: {
              cacheName: "hashed-assets",
              expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            // Read-only offline continuity: cache Supabase REST GETs so a
            // list already viewed while online still renders when offline.
            // GET-only by design — PostgREST mutations are POST/PATCH/
            // DELETE, so they're never matched or cached here. NetworkFirst
            // so an online user always gets live data; falls back to the
            // cache only once the network genuinely fails/times out.
            //
            // Security note: this cache is keyed by URL only, not by which
            // user is signed in — on a shared device, a second user signing
            // in could otherwise see the first user's cached data. Cleared
            // explicitly on sign-out in AuthContext to close that gap.
            urlPattern: ({ url, request }) => url.hostname.endsWith(".supabase.co") && url.pathname.startsWith("/rest/v1/") && request.method === "GET",
            handler: "NetworkFirst",
            method: "GET",
            options: {
              cacheName: SUPABASE_API_CACHE,
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
});
