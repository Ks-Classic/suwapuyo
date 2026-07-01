import { openDB, type DBSchema } from "idb";
import type {
  AcquisitionSource,
  ChildInfo,
  VisitDepth,
  VisitorType,
} from "../fuwafuwa-land/map/boothMapData";

const DB_NAME = "yourtime-concierge-demo";
const DB_VERSION = 1;
const VISITOR_KEY = "current";

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

function localId(): string {
  const key = "yourtime_concierge_local_id";
  const existing = localStorage.getItem(key);
  if (existing !== null && existing.trim().length > 0) {
    return existing;
  }
  const next = `demo-${crypto.randomUUID()}`;
  localStorage.setItem(key, next);
  return next;
}

async function db() {
  return openDB<ConciergeDb>(DB_NAME, DB_VERSION, {
    upgrade(database) {
      if (!database.objectStoreNames.contains("visitors")) {
        database.createObjectStore("visitors", { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains("stamps")) {
        const stamps = database.createObjectStore("stamps", { keyPath: "id" });
        stamps.createIndex("by_visitor", "visitor_id");
      }
    },
  });
}

export async function getOrCreateVisitor(): Promise<ConciergeVisitor> {
  const database = await db();
  const existing = await database.get("visitors", VISITOR_KEY);
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
  await database.put("visitors", visitor);
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
  const database = await db();
  await database.put("visitors", next);
  return next;
}

const DEPTH_RANK: Record<VisitDepth, number> = {
  visited: 1,
  explained: 2,
  experienced: 3,
};

export async function listStamps(): Promise<ConciergeStamp[]> {
  const database = await db();
  const stamps = await database.getAllFromIndex("stamps", "by_visitor", VISITOR_KEY);
  return stamps.sort((left, right) => left.created_at.localeCompare(right.created_at));
}

export async function upsertStamp(exhibitorId: string, depth: VisitDepth): Promise<ConciergeStamp> {
  const visitor = await getOrCreateVisitor();
  const id = `${visitor.id}:${exhibitorId}`;
  const database = await db();
  const existing = await database.get("stamps", id);
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
  await database.put("stamps", stamp);
  return stamp;
}
