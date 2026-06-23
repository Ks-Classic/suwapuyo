import type { MetricsSnapshot } from "../types";

interface MetricsOverlayProps {
  metrics: MetricsSnapshot;
}

function formatBytes(value?: number): string {
  if (value === undefined) {
    return "-";
  }
  return `${Math.round(value / 1024 / 1024)}MB`;
}

export function MetricsOverlay({ metrics }: MetricsOverlayProps) {
  return (
    <div className="fuwafuwa-metrics">
      <span>FPS {Math.round(metrics.fps)}</span>
      <span>ART {metrics.artworkCount}</span>
      <span>VISIBLE {metrics.visibleCount}</span>
      <span>{metrics.connectionStatus}</span>
      <span>
        {formatBytes(metrics.storageUsageBytes)} / {formatBytes(metrics.storageQuotaBytes)}
      </span>
      <span>HEAP {formatBytes(metrics.heapUsedBytes)}</span>
    </div>
  );
}
