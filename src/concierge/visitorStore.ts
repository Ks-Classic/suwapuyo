import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type {
  AcquisitionSource,
  ChildInfo,
  VisitDepth,
  VisitorType,
} from "../fuwafuwa-land/map/boothMapData";
import { safeUuid } from "./uuid";

const DB_NAME = "yourtime-concierge-demo";
const DB_VERSION = 1;
const VISITOR_KEY = "current";
const LOCAL_ID_KEY = "yourtime_concierge_local_id";

export interface ConciergeVisitor {
  id: string;
  line_user_id: string;
  visitor_type?: VisitorType;
  children: ChildInfo[];
  adults_count?: number;
  acquisition_source?: AcquisitionSource;
  is_health_pro?: boolean;
  interests: string[];
  onboarded_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ConciergeStamp {
  id: string;
  visitor_id: string;
  exhibitor_id: string;
  depth: VisitDepth;
  created_at: string;
  updated_at: string;
}

interface ConciergeDb extends DBSchema {
  visitors: {
    key: string;
    value: ConciergeVisitor;
  };
  stamps: {
    key: string;
    value: ConciergeStamp;
    indexes: {
      by_visitor: string;
    };
  };
}

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * ローカルID。localStorage が使えない環境（iOSプライベートブラウズ等）でも
 * 例外で止めず、メモリ上のIDで工程を成立させる。
 */
let memoryLocalId: string | null = null;
function localId(): string {
  try {
    const existing = localStorage.getItem(LOCAL_ID_KEY);
    if (existing !== null && existing.trim().length > 0) {
      return existing;
    }
    const next = `demo-${safeUuid()}`;
    localStorage.setItem(LOCAL_ID_KEY, next);
    return next;
  } catch {
    if (memoryLocalId === null) {
      memoryLocalId = `demo-${safeUuid()}`;
    }
    return memoryLocalId;
  }
}

/**
 * ストレージ抽象。IndexedDB が使える環境ではそれを、投げる/使えない環境
 * （iOSアプリ内WebView・プライベートブラウズ等）ではメモリ実装に自動で退避する。
 * どちらも同じ非同期インターフェースを満たすので上位ロジックは分岐不要。
 */
interface ConciergeStore {
  getVisitor(): Promise<ConciergeVisitor | undefined>;
  putVisitor(visitor: ConciergeVisitor): Promise<void>;
  getStamp(id: string): Promise<ConciergeStamp | undefined>;
  putStamp(stamp: ConciergeStamp): Promise<void>;
  listStampsByVisitor(visitorId: string): Promise<ConciergeStamp[]>;
}

function createIdbStore(database: IDBPDatabase<ConciergeDb>): ConciergeStore {
  return {
    getVisitor: () => database.get("visitors", VISITOR_KEY),
    putVisitor: async (visitor) => {
      await database.put("visitors", visitor);
    },
    getStamp: (id) => database.get("stamps", id),
    putStamp: async (stamp) => {
      await database.put("stamps", stamp);
    },
    listStampsByVisitor: (visitorId) => database.getAllFromIndex("stamps", "by_visitor", visitorId),
  };
}

function createMemoryStore(): ConciergeStore {
  const visitors = new Map<string, ConciergeVisitor>();
  const stamps = new Map<string, ConciergeStamp>();
  return {
    getVisitor: () => Promise.resolve(visitors.get(VISITOR_KEY)),
    putVisitor: (visitor) => {
      visitors.set(VISITOR_KEY, visitor);
      return Promise.resolve();
    },
    getStamp: (id) => Promise.resolve(stamps.get(id)),
    putStamp: (stamp) => {
      stamps.set(stamp.id, stamp);
      return Promise.resolve();
    },
    listStampsByVisitor: (visitorId) =>
      Promise.resolve(Array.from(stamps.values()).filter((stamp) => stamp.visitor_id === visitorId)),
  };
}

let storePromise: Promise<ConciergeStore> | null = null;
function getStore(): Promise<ConciergeStore> {
  if (storePromise === null) {
    storePromise = openDB<ConciergeDb>(DB_NAME, DB_VERSION, {
      upgrade(database) {
        if (!database.objectStoreNames.contains("visitors")) {
          database.createObjectStore("visitors", { keyPath: "id" });
        }
        if (!database.objectStoreNames.contains("stamps")) {
          const stamps = database.createObjectStore("stamps", { keyPath: "id" });
          stamps.createIndex("by_visitor", "visitor_id");
        }
      },
    })
      .then((database) => createIdbStore(database))
      .catch(() => createMemoryStore());
  }
  return storePromise;
}

export async function getOrCreateVisitor(): Promise<ConciergeVisitor> {
  const store = await getStore();
  const existing = await store.getVisitor();
  if (existing !== undefined) {
    return existing;
  }
  const created = nowIso();
  const visitor: ConciergeVisitor = {
    id: VISITOR_KEY,
    line_user_id: localId(),
    children: [],
    interests: [],
    created_at: created,
    updated_at: created,
  };
  await store.putVisitor(visitor);
  return visitor;
}

export async function saveVisitor(input: Partial<ConciergeVisitor>): Promise<ConciergeVisitor> {
  const current = await getOrCreateVisitor();
  const next: ConciergeVisitor = {
    ...current,
    ...input,
    id: VISITOR_KEY,
    children: input.children ?? current.children,
    interests: input.interests ?? current.interests,
    updated_at: nowIso(),
  };
  const store = await getStore();
  await store.putVisitor(next);
  return next;
}

const DEPTH_RANK: Record<VisitDepth, number> = {
  visited: 1,
  explained: 2,
  experienced: 3,
};

export async function listStamps(): Promise<ConciergeStamp[]> {
  const store = await getStore();
  const stamps = await store.listStampsByVisitor(VISITOR_KEY);
  return stamps.sort((left, right) => left.created_at.localeCompare(right.created_at));
}

export async function upsertStamp(exhibitorId: string, depth: VisitDepth): Promise<ConciergeStamp> {
  const visitor = await getOrCreateVisitor();
  const id = `${visitor.id}:${exhibitorId}`;
  const store = await getStore();
  const existing = await store.getStamp(id);
  const timestamp = nowIso();
  const nextDepth =
    existing === undefined || DEPTH_RANK[depth] >= DEPTH_RANK[existing.depth] ? depth : existing.depth;
  const stamp: ConciergeStamp = {
    id,
    visitor_id: visitor.id,
    exhibitor_id: exhibitorId,
    depth: nextDepth,
    created_at: existing?.created_at ?? timestamp,
    updated_at: timestamp,
  };
  await store.putStamp(stamp);
  return stamp;
}
