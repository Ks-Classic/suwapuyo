export function normalizeGivenName(value: string): string | undefined {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  return trimmed.slice(0, 24);
}

export function normalizeSearchQuery(value: string): string {
  return value.trim().toLowerCase();
}
