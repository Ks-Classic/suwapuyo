const RETIRED_DEMO_ROOTS = [
  "/line",
  "/concierge",
  "/report",
  "/legacy/game",
  "/shorts-studio",
  "/map",
  "/fuwafuwa/map",
  "/fuwafuwa/staff",
] as const;

export function isRetiredDemoPath(pathname: string): boolean {
  const path = pathname.replace(/\/$/, "") || "/";
  return RETIRED_DEMO_ROOTS.some((root) => path === root || path.startsWith(`${root}/`));
}
