import { useEffect, useRef, useState } from "react";
import { DataModeBadge } from "../app/MvpShell";
import {
  boothHasSnsLink,
  boothThumbnailSrc,
  FEATURED_BOOTHS,
  matchesBoothSearch,
  type FeaturedBooth,
} from "./featuredBoothData";
import styles from "./featuredBooths.module.css";

function BoothThumbnail({ booth }: { booth: FeaturedBooth }) {
  const src = boothThumbnailSrc(booth);
  if (src === null) return <div className={styles.thumbnailPlaceholder} role="img" aria-label={`${booth.name}の画像は準備中だよ`}>画像準備中</div>;
  return <img src={src} alt=""/>;
}

function BoothDetail({ booth, onClose }: { booth: FeaturedBooth; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => { closeRef.current?.focus(); }, []);
  return <div className={styles.backdrop} role="presentation" onClick={onClose}>
    <section className={styles.detail} role="dialog" aria-modal="true" aria-labelledby={`booth-${booth.id}`} onClick={(event) => event.stopPropagation()}>
      <button ref={closeRef} className={styles.close} onClick={onClose}>閉じる</button>
      <div className={styles.carousel} aria-label={`${booth.name}の紹介画像`}>
        {booth.images.length === 0
          ? <p className={styles.carouselPlaceholder}>紹介画像は準備中だよ。</p>
          : booth.images.map((image, index) => <figure key={image}><img src={image} alt={`${booth.name} 紹介画像 ${index + 1} / ${booth.images.length}`}/><figcaption>{index + 1} / {booth.images.length}</figcaption></figure>)}
      </div>
      <div className={styles.detailBody}>
        <span className={styles.category}>{booth.category}</span>
        <h2 id={`booth-${booth.id}`}>{booth.name}</h2>
        <p className={styles.organizer}>{booth.organizer}・{booth.handle}</p>
        <p>{booth.description}</p>
        <h3>ここで楽しめること</h3>
        <ul>{booth.highlights.map((highlight) => <li key={highlight}>{highlight}</li>)}</ul>
        <p className={styles.notice}>{booth.confirmationNote}</p>
        {boothHasSnsLink(booth) ? <a className={styles.instagram} href={booth.sourceUrl} target="_blank" rel="noreferrer">Instagramの紹介投稿を見る</a> : null}
      </div>
    </section>
  </div>;
}

export function FeaturedBoothCatalog({ onMap }: { onMap: () => void }) {
  const [selected, setSelected] = useState<FeaturedBooth | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const filteredBooths = FEATURED_BOOTHS.filter((booth) => matchesBoothSearch(booth, searchTerm));
  return <main className={styles.screen}>
    <header className={styles.header}><div><DataModeBadge/><p className={styles.eyebrow}>YourTIME. 8th</p><h1>気になるブースを見つけよう</h1></div><button onClick={onMap}>会場案内</button></header>
    <p className={styles.lead}>まずは投稿内容を確認できたブースから紹介しています。画像を横に動かすと、投稿の続きも見られます。</p>
    <label className={styles.search}>
      <span className={styles.searchLabel}>ブースをさがす</span>
      <input type="search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="名前やカテゴリで検索"/>
    </label>
    {filteredBooths.length === 0
      ? <p className={styles.empty}>「{searchTerm}」に一致するブースが見つからなかったよ。<button onClick={() => setSearchTerm("")}>検索をやめて全部見る</button></p>
      : <div className={styles.grid}>{filteredBooths.map((booth) => <article key={booth.id} className={styles.card}>
        <BoothThumbnail booth={booth}/>
        <div className={styles.cardBody}><span className={styles.category}>{booth.category}</span><h2>{booth.name}</h2><p>{booth.summary}</p><button onClick={() => setSelected(booth)}>画像と詳しい紹介を見る</button></div>
      </article>)}</div>}
    {selected !== null ? <BoothDetail booth={selected} onClose={() => setSelected(null)}/> : null}
  </main>;
}
