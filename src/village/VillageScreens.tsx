import { useEffect, useMemo, useRef, useState } from "react";
import { DataModeBadge } from "../app/MvpShell";
import { DEMO_BOOTHS, newEvent, recordEvent } from "../shared/localMvpRepository";
import type { Booth } from "../shared/mvpTypes";
import styles from "../app/mvp.module.css";

function BoothSheet({ booth, onClose, onMap }: { booth: Booth; onClose: () => void; onMap: () => void }) {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    closeRef.current?.focus();
    void recordEvent(newEvent("booth_detail_opened", { boothId: booth.id }));
    const listener = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [booth.id, onClose]);
  return <div className={styles.sheetBackdrop} role="presentation" onClick={onClose}><section className={`${styles.boothSheet} ${expanded ? styles.boothSheetExpanded : ""}`} role="dialog" aria-modal="true" aria-labelledby="booth-title" onClick={(event) => event.stopPropagation()}>
    <div className={styles.sheetHandle} aria-hidden="true"/><button ref={closeRef} className={styles.sheetClose} onClick={onClose}>閉じる</button>
    <div className={styles.badgeRow}>{booth.pr ? <span className={styles.prBadge}>PR・村のブース紹介</span> : <span className={styles.infoBadge}>村のブース紹介</span>}<DataModeBadge/></div>
    <p>{booth.area}</p><h2 id="booth-title">{booth.number} {booth.name}</h2><p>{booth.summary}</p>
    {expanded ? <div className={styles.sheetDetails}><h3>ここでできること</h3><p>会場で親子が一緒に参加できる体験のデモ紹介です。内容は正式情報へ差し替えます。</p></div> : null}
    <div className={styles.sheetActions}><button className={styles.primaryButton} onClick={onMap}>会場で場所を見る</button><button className={styles.secondaryButton} aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>{expanded ? "短く表示" : "詳しく見る"}</button></div>
  </section></div>;
}

export function BoothListScreen({ onMap }: { onMap: () => void }) {
  const [query, setQuery] = useState("");
  const [area, setArea] = useState("全部");
  const [selected, setSelected] = useState<Booth | null>(null);
  const areas = ["全部", ...Array.from(new Set(DEMO_BOOTHS.map((booth) => booth.area)))];
  const filtered = useMemo(() => DEMO_BOOTHS.filter((booth) => (area === "全部" || booth.area === area) && `${booth.number}${booth.name}${booth.category}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())), [area, query]);
  return <main className={styles.contentScreen}><div className={styles.screenTitleRow}><div><DataModeBadge/><h1>ブースをさがす</h1></div><button onClick={onMap}>会場マップ</button></div>
    <label className={styles.searchBox}>ブース検索<input value={query} onChange={(event) => setQuery(event.currentTarget.value)} placeholder="名前・番号でさがす"/></label>
    <div className={styles.filterRow} role="group" aria-label="エリアで絞り込む">{areas.map((label) => <button key={label} aria-pressed={area === label} onClick={() => setArea(label)}>{label}</button>)}</div>
    {filtered.length === 0 ? <section className={styles.emptyState}><h2>見つかりませんでした</h2><p>条件を外すと、全部のブースを見られます。</p><button onClick={() => { setQuery(""); setArea("全部"); }}>全件表示</button></section> : <div className={styles.boothList}>{filtered.map((booth) => <article key={booth.id}><span className={styles.boothNumber}>{booth.number}</span><div><span className={styles.categoryLabel}>{booth.category}</span><h2>{booth.name}</h2><p>{booth.summary}</p></div><button onClick={() => setSelected(booth)}>紹介を見る</button></article>)}</div>}
    {selected !== null ? <BoothSheet booth={selected} onClose={() => setSelected(null)} onMap={onMap}/> : null}
  </main>;
}

export function VenueMapFallback({ onList }: { onList: () => void }) {
  const [area, setArea] = useState("全部");
  const areas = ["全部", ...Array.from(new Set(DEMO_BOOTHS.map((booth) => booth.area)))];
  const booths = area === "全部" ? DEMO_BOOTHS : DEMO_BOOTHS.filter((booth) => booth.area === area);
  return <main className={styles.contentScreen}><div className={styles.screenTitleRow}><div><DataModeBadge/><h1>きょうの村</h1></div><button onClick={onList}>一覧</button></div>
    <section className={styles.uncalibratedNotice}><span className={styles.mapSymbol} aria-hidden="true">MAP</span><div><h2>会場の位置を準備しています</h2><p>正確なブース位置が確認できるまでは、推測したピンを表示しません。一覧から探せます。</p></div></section>
    <h2>エリアから探す</h2><div className={styles.areaGrid}>{areas.map((label) => <button aria-pressed={area === label} key={label} onClick={() => setArea(label)}>{label}</button>)}</div>
    <div className={styles.simpleList}>{booths.map((booth) => <div key={booth.id}><b>{booth.number}</b><span>{booth.name}</span></div>)}</div><button className={styles.primaryButton} onClick={onList}>ブース一覧で見る</button>
  </main>;
}

export function ExerciseBoothIntro({ onOpen, onLater }: { onOpen: () => void; onLater: () => void }) {
  return <section className={styles.introCard}><div><span className={styles.prBadge}>PR・村のブース紹介</span><DataModeBadge/></div><h2>この「お口」テーマを会場でも体験できるよ</h2><div className={styles.splitActions}><button className={styles.primaryButton} onClick={onOpen}>ブースを見る</button><button className={styles.secondaryButton} onClick={onLater}>あとで</button></div></section>;
}
