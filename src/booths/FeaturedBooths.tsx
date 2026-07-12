import { useEffect, useRef, useState } from "react";
import { DataModeBadge } from "../app/MvpShell";
import styles from "./featuredBooths.module.css";

export interface FeaturedBooth {
  id: string;
  name: string;
  organizer: string;
  handle: string;
  category: string;
  summary: string;
  description: string;
  highlights: readonly string[];
  images: readonly string[];
  sourceUrl?: string;
  confirmationNote: string;
}

export const FEATURED_BOOTHS: readonly FeaturedBooth[] = [
  {
    id: "patakarush",
    name: "PaTaKaRUSH",
    organizer: "Teesmile",
    handle: "@patakarush_official",
    category: "お口・体験",
    summary: "声とお口の動きで挑戦する、世代を超えて楽しめるシューティングゲームです。",
    description: "画面に向かって声を出し、お口を動かしながら高得点を目指す体験です。投稿では子どもから高齢者まで、3世代で楽しむ企画として紹介されています。",
    highlights: ["音声で遊ぶシューティングゲーム", "3世代で挑戦", "イベント開催中の体験内容・予約は要確認"],
    images: ["/content/booths/demo/patakarush/01.jpg", "/content/booths/demo/patakarush/02.jpg"],
    sourceUrl: "https://www.instagram.com/your_time.niw/p/Dajs5ghie5J/",
    confirmationNote: "デモ表示。画像・ロゴ・紹介文は公開前にTeesmile／YourTIME.運営の許諾と最終確認が必要です。",
  },
  {
    id: "kids-yoga-mami",
    name: "キッズヨガ まみ先生",
    organizer: "キッズヨガ まみ先生",
    handle: "@sumile_kids_yoga",
    category: "親子・からだ",
    summary: "キッズヨガと発達講座を通して、子どもの今を知るヒントに触れられます。",
    description: "投稿では、キッズヨガを3枠、子どもの姿を根っこから理解する発達講座を2枠実施すると紹介されています。具体的な参加年齢、予約、定員、服装などは主催者への確認が必要です。",
    highlights: ["キッズヨガ 10:45／13:30／15:00", "発達講座 12:00／16:00", "料金・予約・持ち物は要確認"],
    images: Array.from({ length: 9 }, (_, index) => `/content/booths/demo/kids-yoga-mami/slide-${String(index + 1).padStart(2, "0")}.jpg`),
    sourceUrl: "https://www.instagram.com/your_time.niw/p/DaWfvQiieTK/",
    confirmationNote: "デモ表示。画像・人物・紹介文、発達や健康に関する表現は公開前に出展者／YourTIME.運営／専門家の確認が必要です。",
  },
  {
    id: "shozankan-mct-keto",
    name: "勝山館 MCT&KETO専門店",
    organizer: "MCT&KETO専門店 勝山館",
    handle: "@shozankancocoil・@asato.s_keto_life",
    category: "食・相談／販売",
    summary: "MCTオイル関連商品を見ながら、使い方などを商品開発者へ質問できます。",
    description: "投稿ではMCTオイル関連商品のYourTIME.限定販売と、商品開発者による質問対応が紹介されています。相談料、予約、具体的な商品価格、在庫、購入制限は記載されていません。",
    highlights: ["MCTオイル関連商品の販売", "商品開発者への質問", "会場価格・在庫・決済方法は要確認"],
    images: Array.from({ length: 9 }, (_, index) => `/content/booths/demo/shozankan-mct-keto/slide-${String(index + 1).padStart(2, "0")}.jpg`),
    sourceUrl: "https://www.instagram.com/your_time.niw/p/DaUy7DhiYXk/",
    confirmationNote: "デモ表示。商品・価格・健康表現・画像・人物・ロゴは公開前に出展者／YourTIME.運営の許諾と確認が必要です。",
  },
];

export function boothHasSnsLink(booth: FeaturedBooth): boolean {
  return typeof booth.sourceUrl === "string" && booth.sourceUrl.trim().length > 0;
}

export function boothThumbnailSrc(booth: FeaturedBooth): string | null {
  return booth.images[0] ?? null;
}

export function matchesBoothSearch(booth: FeaturedBooth, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (normalized === "") return true;
  return booth.name.toLowerCase().includes(normalized) || booth.category.toLowerCase().includes(normalized);
}

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
