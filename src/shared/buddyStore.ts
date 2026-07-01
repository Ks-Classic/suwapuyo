export type BuddySource = "fuwafuwa-local" | "demo-seed" | "liff";

export interface BuddyRecord {
  artworkId: string;
  label: string;
  image: Blob;
  width: number;
  height: number;
  scale: number;
  source: BuddySource;
  firstSummonedAt?: string;
  createdAt: string;
}

const DB_NAME = "suwapuyo-buddy";
const STORE_NAME = "current";
const DB_VERSION = 1;
const CURRENT_KEY = "buddy";

function openBuddyDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("buddy_db_open_failed"));
  });
}

async function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openBuddyDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const request = run(tx.objectStore(STORE_NAME));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("buddy_db_request_failed"));
    tx.oncomplete = () => db.close();
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error("buddy_db_transaction_failed"));
    };
  });
}

export async function setBuddy(record: BuddyRecord): Promise<void> {
  await withStore("readwrite", (store) => store.put(record, CURRENT_KEY));
}

export async function getBuddy(): Promise<BuddyRecord | null> {
  if (typeof indexedDB === "undefined") {
    return null;
  }
  try {
    const record = await withStore<BuddyRecord | undefined>("readonly", (store) => store.get(CURRENT_KEY));
    return record ?? null;
  } catch (error) {
    console.debug("buddyStore.getBuddy failed", error);
    return null;
  }
}

export async function markSummoned(): Promise<void> {
  const current = await getBuddy();
  if (current === null || current.firstSummonedAt !== undefined) {
    return;
  }
  await setBuddy({ ...current, firstSummonedAt: new Date().toISOString() });
}

export async function clearBuddy(): Promise<void> {
  await withStore("readwrite", (store) => store.delete(CURRENT_KEY));
}

export function buddyImageObjectUrl(record: BuddyRecord): string {
  return URL.createObjectURL(record.image);
}

async function createDemoSeedBlob(): Promise<{ blob: Blob; width: number; height: number }> {
  const width = 360;
  const height = 360;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (ctx === null) {
    throw new Error("canvas_context_unavailable");
  }
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#ffd166";
  ctx.beginPath();
  ctx.ellipse(180, 188, 112, 96, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(138, 158, 25, 0, Math.PI * 2);
  ctx.arc(222, 158, 25, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#3a2a1d";
  ctx.beginPath();
  ctx.arc(145, 162, 10, 0, Math.PI * 2);
  ctx.arc(215, 162, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#3a2a1d";
  ctx.lineWidth = 9;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(144, 218);
  ctx.quadraticCurveTo(180, 245, 218, 218);
  ctx.stroke();
  ctx.strokeStyle = "#8bd46e";
  ctx.lineWidth = 16;
  ctx.beginPath();
  ctx.moveTo(105, 104);
  ctx.quadraticCurveTo(180, 28, 255, 104);
  ctx.stroke();
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((next) => (next === null ? reject(new Error("seed_blob_failed")) : resolve(next)), "image/png");
  });
  return { blob, width, height };
}

export async function ensureDemoBuddy(): Promise<BuddyRecord> {
  const existing = await getBuddy();
  if (existing !== null) {
    return existing;
  }
  const seed = await createDemoSeedBlob();
  const record: BuddyRecord = {
    artworkId: "demo-seed-local-buddy",
    label: "デモのなかま",
    image: seed.blob,
    width: seed.width,
    height: seed.height,
    scale: 0.6,
    source: "demo-seed",
    createdAt: new Date().toISOString(),
  };
  await setBuddy(record);
  return record;
}
