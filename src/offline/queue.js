import { getDB, MUTATION_STORE } from "./db";
import { supabase } from "../lib/supabaseClient";

const CHANGE_EVENT = "agrimax-offline-queue-changed";

function notifyChange() {
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

export function onQueueChange(handler) {
  window.addEventListener(CHANGE_EVENT, handler);
  return () => window.removeEventListener(CHANGE_EVENT, handler);
}

// A page queuing an offline write must generate its own row id up front
// (crypto.randomUUID()) and include it in `payload` — that id is what makes
// a retried insert idempotent (see syncOne's 23505 handling below).
export const createId = () => crypto.randomUUID();

// getSession() reads the persisted session from localStorage without a
// network round-trip (unlike getUser(), which revalidates against the
// server) — needed here since this must work while offline.
async function currentUserId() {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

export async function enqueueMutation({ table, op = "insert", payload, matchId = null, dependsOn = [] }) {
  const db = await getDB();
  const queueId = crypto.randomUUID();
  const userId = await currentUserId();
  await db.add(MUTATION_STORE, {
    queueId,
    table,
    op,
    payload,
    matchId: matchId ?? payload?.id ?? null,
    dependsOn,
    userId,
    createdAt: Date.now(),
    status: "pending",
    attempts: 0,
    lastError: null,
  });
  notifyChange();
  // Awaited, not fire-and-forget: when online this must behave like the
  // direct insert it replaced — the caller's onSaved() (typically a list
  // reload) expects the row to already be confirmed in Supabase, not just
  // written to IndexedDB. A real E2E test (transfers.spec.js) caught this
  // as a race: the list reloaded before the fire-and-forget drain had
  // actually reached the server, so the just-created row wasn't there yet.
  // When offline this still returns quickly — syncOne's network failure is
  // detected immediately, not a hang — so awaiting it costs nothing here.
  await drainQueue();
  return queueId;
}

// A network failure (offline, DNS, connection drop) never carries a
// Postgres error code — real server-side errors (unique violation, FK
// violation, etc.) always do, because PostgREST includes the SQLSTATE in
// its JSON error response and supabase-js parses it into `error.code`.
// Verified empirically in Phase B: an offline insert threw
// "TypeError: Failed to fetch" with no `.code` at all.
function isNetworkError(error) {
  return !!error && !error.code;
}

async function syncOne(entry) {
  const { table, op, payload, matchId } = entry;
  let result;
  if (op === "insert") {
    result = await supabase.from(table).insert(payload);
  } else if (op === "update") {
    result = await supabase.from(table).update(payload).eq("id", matchId);
  } else {
    return { status: "failed", error: { message: `Unknown op: ${op}` } };
  }

  const { error } = result;
  if (!error) return { status: "done" };
  // Retried after a dropped connection whose insert actually committed
  // server-side before the response came back — not a real failure.
  if (op === "insert" && error.code === "23505") return { status: "done" };
  if (isNetworkError(error)) return { status: "retry", error };
  return { status: "failed", error };
}

let draining = false;

export async function drainQueue() {
  if (draining) return;
  draining = true;
  try {
    const db = await getDB();
    const userId = await currentUserId();
    if (!userId) return; // signed out — nothing should sync under no session

    let progressed = true;
    while (progressed) {
      progressed = false;
      const all = await db.getAll(MUTATION_STORE);
      const presentIds = new Set(all.map((e) => e.queueId));
      const byId = new Map(all.map((e) => [e.queueId, e]));

      // Entries belonging to a different user are left untouched entirely —
      // they'll sync once that user is the one signed in on this device.
      const mine = all.filter((e) => e.userId === userId && e.status === "pending").sort((a, b) => a.createdAt - b.createdAt);

      for (const entry of mine) {
        const blockingDeps = entry.dependsOn.filter((depId) => presentIds.has(depId));

        if (blockingDeps.length > 0) {
          const failedBlocker = blockingDeps.find((depId) => byId.get(depId)?.status === "failed");
          if (failedBlocker) {
            // Cascade instead of waiting forever on a dependency that will
            // never resolve.
            entry.status = "failed";
            entry.attempts += 1;
            entry.lastError = `Blocked: dependency ${failedBlocker} failed`;
            await db.put(MUTATION_STORE, entry);
            progressed = true;
          }
          // Otherwise the dependency is still genuinely pending — it either
          // syncs earlier in this same pass (createdAt order) or a later
          // pass of the outer while loop picks this entry up once it does.
          continue;
        }

        const result = await syncOne(entry);
        if (result.status === "done") {
          await db.delete(MUTATION_STORE, entry.queueId);
          presentIds.delete(entry.queueId);
          progressed = true;
        } else if (result.status === "failed") {
          entry.status = "failed";
          entry.attempts += 1;
          entry.lastError = result.error?.message || String(result.error);
          await db.put(MUTATION_STORE, entry);
          progressed = true;
        } else {
          // Network failure — stop draining entirely rather than hammering
          // the rest of the queue while offline; the "online" listener (or
          // the next enqueue/sign-in) will retry.
          entry.attempts += 1;
          await db.put(MUTATION_STORE, entry);
          return;
        }
      }
    }
  } finally {
    draining = false;
    notifyChange();
  }
}

export async function getQueueSnapshot() {
  const db = await getDB();
  const all = await db.getAll(MUTATION_STORE);
  return {
    pending: all.filter((e) => e.status === "pending"),
    failed: all.filter((e) => e.status === "failed"),
  };
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => drainQueue());
}
