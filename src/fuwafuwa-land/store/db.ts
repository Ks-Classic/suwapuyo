import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Artwork, DisplayState, OperationLog } from "../types";

interface FuwafuwaDb extends DBSchema {
  artworks: {
    key: string;
    value: Artwork;
    indexes: {
      byStatus: string;
      byName: string;
    };
  };
  images: {
    key: string;
    value: Blob;
  };
  meta: {
    key: string;
    value: DisplayState | OperationLog[] | { persisted: boolean; checkedAt: string };
  };
}

let dbPromise: Promise<IDBPDatabase<FuwafuwaDb>> | null = null;

export function getFuwafuwaDb(): Promise<IDBPDatabase<FuwafuwaDb>> {
  dbPromise ??= openDB<FuwafuwaDb>("fuwafuwa-v1", 1, {
    upgrade(db) {
      const artworks = db.createObjectStore("artworks", { keyPath: "id" });
      artworks.createIndex("byStatus", "status");
      artworks.createIndex("byName", "givenName");
      db.createObjectStore("images");
      db.createObjectStore("meta");
    },
  });
  return dbPromise;
}

export async function requestStoragePersistence(): Promise<boolean> {
  const persisted = await navigator.storage?.persist?.();
  const granted = persisted === true;
  const db = await getFuwafuwaDb();
  await db.put("meta", { persisted: granted, checkedAt: new Date().toISOString() }, "storagePersistence");
  return granted;
}

export async function cacheArtwork(artwork: Artwork): Promise<void> {
  const db = await getFuwafuwaDb();
  await db.put("artworks", artwork);
}

export async function cacheArtworks(artworks: Artwork[]): Promise<void> {
  const db = await getFuwafuwaDb();
  const tx = db.transaction("artworks", "readwrite");
  await Promise.all(artworks.map((artwork) => tx.store.put(artwork)));
  await tx.done;
}

export async function getCachedArtwork(id: string): Promise<Artwork | undefined> {
  const db = await getFuwafuwaDb();
  return db.get("artworks", id);
}

export async function getCachedArtworks(): Promise<Artwork[]> {
  const db = await getFuwafuwaDb();
  return db.getAll("artworks");
}

export async function cacheImage(key: string, blob: Blob): Promise<void> {
  const db = await getFuwafuwaDb();
  await db.put("images", blob, key);
}

export async function getCachedImage(key: string): Promise<Blob | undefined> {
  const db = await getFuwafuwaDb();
  return db.get("images", key);
}

export async function cacheDisplayState(state: DisplayState): Promise<void> {
  const db = await getFuwafuwaDb();
  await db.put("meta", state, "displayState");
}

export async function getCachedDisplayState(): Promise<DisplayState | null> {
  const db = await getFuwafuwaDb();
  const value = await db.get("meta", "displayState");
  if (value === undefined || !("id" in value) || value.id !== "current") {
    return null;
  }
  return value;
}
