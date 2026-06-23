import type { OperationLog, OperationType } from "../types";
import { getFuwafuwaDb } from "./db";

const LOG_KEY = "operationLogs";
const MAX_LOGS = 200;

export async function appendOperationLog(type: OperationType, message: string, artworkId?: string): Promise<void> {
  const db = await getFuwafuwaDb();
  const current = await db.get("meta", LOG_KEY);
  const logs = Array.isArray(current) ? current : [];
  const next: OperationLog = {
    id: crypto.randomUUID(),
    type,
    artworkId,
    message,
    createdAt: new Date().toISOString(),
  };
  await db.put("meta", [next, ...logs].slice(0, MAX_LOGS), LOG_KEY);
}

export async function listOperationLogs(): Promise<OperationLog[]> {
  const db = await getFuwafuwaDb();
  const current = await db.get("meta", LOG_KEY);
  return Array.isArray(current) ? current : [];
}
