import type { ReactNode } from "react";
import styles from "./mvp.module.css";

export function DataModeBadge() {
  return <span className={styles.demoBadge}>デモデータ</span>;
}

export function MvpShell({ children, active, onNavigate }: { children: ReactNode; active?: "play" | "progress" | "village"; onNavigate: (path: string) => void }) {
  return <div className={styles.appShell}>
    <div className={styles.shellContent}>{children}</div>
    {active !== undefined ? <nav className={styles.bottomNav} aria-label="メインメニュー">
      <button aria-current={active === "play" ? "page" : undefined} onClick={() => onNavigate("/play")}><span className={styles.navMark}>P</span>あそぶ</button>
      <button aria-current={active === "progress" ? "page" : undefined} onClick={() => onNavigate("/progress")}><span className={styles.navMark}>R</span>きろく</button>
      <button aria-current={active === "village" ? "page" : undefined} onClick={() => onNavigate("/village/booths")}><span className={styles.navMark}>V</span>むら</button>
    </nav> : null}
  </div>;
}
