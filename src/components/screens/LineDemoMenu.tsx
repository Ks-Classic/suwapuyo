import { useMemo } from "react";
import styles from "../../styles/lineDemoMenu.module.css";

interface MenuTile {
  href: string;
  label: string;
  body: string;
  tone: "game" | "map" | "land" | "survey" | "info" | "help";
}

// 来場者の画面に本当に出る想定のタイルのみ。運営用ツールは別枠（OPS_LINKS）に分離する。
const MENU_TILES: MenuTile[] = [
  {
    href: "/",
    label: "すわぷよ",
    body: "なかまと遊んで、お口体操へ",
    tone: "game",
  },
  {
    href: "/concierge",
    label: "会場マップ",
    body: "村の案内所でブースを探す",
    tone: "map",
  },
  {
    href: "/fuwafuwa",
    label: "ふわふわランド",
    body: "描いた絵と村を見る",
    tone: "land",
  },
  {
    href: "/?taisou=1",
    label: "お口体操",
    body: "もぐぴよとすぐ体操する",
    tone: "survey",
  },
];

interface OpsLink {
  href: string;
  label: string;
}

const OPS_LINKS: OpsLink[] = [
  { href: "/staff", label: "スタッフ" },
  { href: "/display", label: "ディスプレイ" },
];

export function LineDemoMenu() {
  const today = useMemo(
    () =>
      new Intl.DateTimeFormat("ja-JP", {
        month: "numeric",
        day: "numeric",
        weekday: "short",
      }).format(new Date()),
    [],
  );

  return (
    <main className={styles.shell}>
      <section className={styles.phone} aria-labelledby="line-demo-title">
        <header className={styles.header}>
          <div>
            <span>LINE 村の案内所</span>
            <h1 id="line-demo-title">YourTIME デモ入口</h1>
          </div>
          <strong>{today}</strong>
        </header>

        <section className={styles.chat}>
          <div className={styles.avatar}>
            <img src="/content/01_すわぷよ/01_キャラクター/02_表示用/02_わーわー.png" alt="" />
          </div>
          <div className={styles.bubble}>
            <p>今日はここから見せれば大丈夫。マップ、ふわふわランド、すわぷよ、体操までつながってるよ。</p>
          </div>
        </section>

        <nav className={styles.richMenu} aria-label="デモ用リッチメニュー">
          {MENU_TILES.map((tile) => (
            <a key={tile.href + tile.label} className={`${styles.tile} ${styles[tile.tone]}`} href={tile.href}>
              <span>{tile.label}</span>
              <small>{tile.body}</small>
            </a>
          ))}
        </nav>
      </section>

      <nav className={styles.opsBar} aria-label="運営用（来場者には見せない画面）">
        <span>運営用（来場者には見せません）</span>
        {OPS_LINKS.map((link) => (
          <a key={link.href} href={link.href}>
            {link.label}
          </a>
        ))}
      </nav>
    </main>
  );
}
