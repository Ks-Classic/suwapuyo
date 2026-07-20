import { isRetiredDemoPath } from "./app/routePolicy";

export type ProductSurface = "suwapuyo" | "fuwafuwa-land";

export interface ProductRouteBoundary {
  owner: ProductSurface;
  exact: readonly string[];
  prefixes: readonly string[];
}

export const PRODUCT_ROUTE_BOUNDARIES: readonly ProductRouteBoundary[] = [
  {
    owner: "fuwafuwa-land",
    exact: ["/fuwafuwa", "/staff", "/display"],
    prefixes: ["/fuwafuwa/", "/staff/"],
  },
  {
    owner: "suwapuyo",
    exact: ["/", "/auth", "/auth/friend", "/welcome", "/onboarding", "/arrival", "/characters", "/play", "/progress", "/missions", "/settings/family", "/claim", "/makers"],
    prefixes: ["/exercise/", "/village/", "/events/", "/reports/exhibitors/"],
  },
];

export function resolveProductSurface(pathname: string): ProductSurface {
  if (isRetiredDemoPath(pathname)) return "suwapuyo";
  const land = PRODUCT_ROUTE_BOUNDARIES[0];
  if (land !== undefined && (land.exact.includes(pathname) || land.prefixes.some((prefix) => pathname.startsWith(prefix)))) {
    return "fuwafuwa-land";
  }
  return "suwapuyo";
}
