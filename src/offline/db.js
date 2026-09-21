import { openDB } from "idb";

const DB_NAME = "agrimax-offline";
const DB_VERSION = 1;
export const MUTATION_STORE = "mutationQueue";

let dbPromise;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore(MUTATION_STORE, { keyPath: "queueId" });
        store.createIndex("status", "status");
        store.createIndex("userId", "userId");
      },
    });
  }
  return dbPromise;
}
