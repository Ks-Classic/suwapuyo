import { openDB, type DBSchema } from "idb";
import type { ProductEvent } from "./mvpTypes";

interface QueueDb extends DBSchema {
  events: {
    key: string;
    value: ProductEvent;
  };
}

const DB_NAME = "suwapuyo-mvp-events";
const DB_VERSION = 1;

async function database() {
  return openDB<QueueDb>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("events")) {
        db.createObjectStore("events", { keyPath: "id" });
      }
    },
  });
}

export async function enqueueEvent(event: ProductEvent): Promise<void> {
  const db = await database();
  await db.put("events", event);
}

export async function removeQueuedEvent(id: string): Promise<void> {
  const db = await database();
  await db.delete("events", id);
}

export async function listQueuedEvents(): Promise<ProductEvent[]> {
  const db = await database();
  return db.getAll("events");
}

export async function queuedEventCount(): Promise<number> {
  const db = await database();
  return db.count("events");
}
