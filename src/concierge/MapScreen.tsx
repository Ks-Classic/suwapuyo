import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { BoothExhibitor } from "../fuwafuwa-land/map/boothMapData";
import { track } from "../shared/analytics";
import { CONCIERGE_QR_IMAGE_URL, DEMO_BOOTHS, VENUE_POIS, type VenuePoi } from "./demoData";
import type { ConciergeStamp } from "./visitorStore";
import { MapViewport, type MapViewportHandle } from "./MapViewport";
import { VenueMapSvg } from "./VenueMapSvg";
import { BoothPopup } from "./BoothPopup";
import styles from "./mapScreen.module.css";

const MAP_WIDTH = 1724;
const MAP_HEIGHT = 1012;
// scale:0 は MapViewport 側で「横幅フィット・中央寄せ」に補正される(初期の全体表示)。
const FIT_TARGET = { xPercent: 50, yPercent: 50, scale: 0 };

interface MapScreenProps {
  stamps: ConciergeStamp[];
  onOpenStamp: (boothId: string) => void;
  onStampBook: () => void;
}

function BoothPin({
  booth,
  stamped,
  selected,
  reduced,
  dimmed,
  matched,
  onSelect,
}: {
  booth: BoothExhibitor;
  stamped: boolean;
  selected: boolean;
  reduced: boolean;
  dimmed: boolean;
  matched: boolean;
  onSelect: () => void;
}) {
  const color = booth.themeColor ?? "#F5A623";
  return (
    <button
      type="button"
      className={`${styles.pin} ${selected ? styles.pinSelected : ""} ${stamped ? styles.pinStamped : ""} ${dimmed ? styles.markerDim : ""} ${matched ? styles.pinMatch : ""}`}
      style={{ left: `${booth.mapX}%`, top: `${booth.mapY}%`, "--pin-color": color } as CSSProperties}
      onClick={onSelect}
      aria-label={`${booth.name} ブース${booth.boothNo}`}
    >
      {!stamped && !reduced ? <span className={styles.pinPulse} /> : null}
      <span className={styles.pinHead}>
        {stamped ? <span aria-hidden="true">✓</span> : <span aria-hidden="true">{booth.boothNo}</span>}
      </span>
      <span className={styles.pinTail} />
    </button>
  );
}

/** Googleマップ型のPOIラベル(アイコン+名前のピル)。会場の主要スポット用。 */
function PoiMarker({
  poi,
  dimmed,
  matched,
  onSelect,
}: {
  poi: VenuePoi;
  dimmed: boolean;
  matched: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={`${styles.poi} ${dimmed ? styles.markerDim : ""} ${matched ? styles.poiMatch : ""}`}
      style={{ left: `${poi.mapX}%`, top: `${poi.mapY}%`, "--poi-color": poi.themeColor } as CSSProperties}
      onClick={onSelect}
      aria-label={`${poi.label} を見る`}
    >
      <span className={styles.poiDot} aria-hidden="true">
        {poi.icon}
      </span>
      <span className={styles.poiLabel}>{poi.label}</span>
    </button>
  );
}

/**
 * カテゴリフィルタ。選ぶと該当ブース/POIが強調され、非該当はディムする。
 * 判定は booth.landId / category と POI.category を横断で見る(実データが来ても効くように緩め)。
 */
interface MarkerCat {
  landId?: string;
  category: string;
}

const MAP_FILTERS: { id: string; label: string; icon: string; match: (m: MarkerCat) => boolean }[] = [
  { id: "all", label: "すべて", icon: "🗺️", match: () => true },
  { id: "dental", label: "歯・お口", icon: "🦷", match: (m) => m.landId === "dental" || m.category.includes("歯") || m.category.includes("口") },
  { id: "kids", label: "こども", icon: "🧒", match: (m) => m.landId === "kids" || m.category.includes("こども") || m.category.includes("縁日") || m.category.includes("体験") },
  { id: "food", label: "たべもの", icon: "🍙", match: (m) => m.landId === "food" || m.category.includes("フード") },
  { id: "stage", label: "ステージ", icon: "🎤", match: (m) => m.category.includes("ステージ") },
];

function poiToBooth(poi: VenuePoi): BoothExhibitor {
  return {
    id: poi.id,
    boothNo: "",
    landId: "food",
    name: poi.label,
    category: poi.category,
    summary: poi.summary,
    activity: poi.activity,
    mapX: poi.mapX,
    mapY: poi.mapY,
    themeColor: poi.themeColor,
    stampEmoji: poi.icon,
  };
}

export function MapScreen({ stamps, onOpenStamp, onStampBook }: MapScreenProps) {
  const reduced = !!useReducedMotion();
  const [selectedBooth, setSelectedBooth] = useState<BoothExhibitor | null>(null);
  const [selectedInfo, setSelectedInfo] = useState<BoothExhibitor | null>(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const stampedIds = useMemo(() => new Set(stamps.map((stamp) => stamp.exhibitor_id)), [stamps]);
  const viewportHandle = useRef<MapViewportHandle | null>(null);

  const filter = MAP_FILTERS.find((entry) => entry.id === activeFilter) ?? MAP_FILTERS[0];
  const filtering = activeFilter !== "all";
  const boothMatches = (booth: BoothExhibitor): boolean => filter.match({ landId: booth.landId, category: booth.category });
  const poiMatches = (poi: VenuePoi): boolean => filter.match({ category: poi.category });

  useEffect(() => {
    track("map_open", { surface: "concierge" });
  }, []);

  function refit(): void {
    viewportHandle.current?.flyTo(FIT_TARGET);
  }

  return (
    <main className={styles.root}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>村のマップ</p>
          <h1>気になるブースをタップ</h1>
        </div>
        <button type="button" className={styles.stampBadge} onClick={onStampBook} aria-label="スタンプ帳">
          <span aria-hidden="true">🎫</span>
          <motion.span
            key={stamps.length}
            initial={reduced ? false : { scale: 1.4 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 420, damping: 16 }}
          >
            {stamps.length}/{DEMO_BOOTHS.length}
          </motion.span>
        </button>
      </header>

      <div className={styles.filterBar} role="group" aria-label="カテゴリで絞りこむ">
        {MAP_FILTERS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className={`${styles.filterChip} ${activeFilter === entry.id ? styles.filterChipActive : ""}`}
            aria-pressed={activeFilter === entry.id}
            onClick={() => {
              setActiveFilter(entry.id);
              track("map_filter", { surface: "concierge", id: entry.id });
            }}
          >
            <span aria-hidden="true">{entry.icon}</span>
            {entry.label}
          </button>
        ))}
      </div>

      <div className={styles.stage}>
        <MapViewport
          contentWidth={MAP_WIDTH}
          contentHeight={MAP_HEIGHT}
          initialTarget={FIT_TARGET}
          handleRef={viewportHandle}
          className={styles.viewport}
        >
          <div className={styles.canvas} style={{ width: MAP_WIDTH, height: MAP_HEIGHT }}>
            <div className={styles.mapImage} style={{ width: MAP_WIDTH, height: MAP_HEIGHT }}>
              <VenueMapSvg />
            </div>
            {VENUE_POIS.map((poi) => (
              <PoiMarker
                key={poi.id}
                poi={poi}
                dimmed={filtering && !poiMatches(poi)}
                matched={filtering && poiMatches(poi)}
                onSelect={() => {
                  setSelectedInfo(poiToBooth(poi));
                  track("booth_card_open", { surface: "concierge", id: poi.id });
                }}
              />
            ))}
            {DEMO_BOOTHS.map((booth) => (
              <BoothPin
                key={booth.id}
                booth={booth}
                stamped={stampedIds.has(booth.id)}
                selected={selectedBooth?.id === booth.id}
                reduced={reduced}
                dimmed={filtering && !boothMatches(booth)}
                matched={filtering && boothMatches(booth)}
                onSelect={() => {
                  setSelectedBooth(booth);
                  track("booth_card_open", { surface: "concierge", id: booth.id });
                }}
              />
            ))}
          </div>
        </MapViewport>

        <div className={styles.vignette} aria-hidden="true" />

        <div className={styles.zoomControls} aria-label="拡大縮小">
          <button type="button" onClick={() => viewportHandle.current?.zoomBy(1.35)} aria-label="拡大">
            +
          </button>
          <button type="button" onClick={() => viewportHandle.current?.zoomBy(1 / 1.35)} aria-label="縮小">
            −
          </button>
          <button type="button" onClick={refit} aria-label="現在のランドに戻す" className={styles.zoomFit}>
            ⟲
          </button>
        </div>

        <p className={styles.hint}>指でドラッグ・ピンチで拡大できます</p>
      </div>

      <div className={styles.qrBar}>
        <img src={CONCIERGE_QR_IMAGE_URL} alt="体験版ブースQR" />
        <div className={styles.qrBarText}>
          <strong>ブースのQRを読み取ると</strong>
          <span>スタンプ画面が開きます</span>
        </div>
        <button type="button" className={styles.qrBarButton} onClick={() => onOpenStamp("demo-01")}>
          QRを読んだことにする（デモ）
        </button>
      </div>

      <AnimatePresence>
        {selectedBooth !== null ? (
          <BoothPopup
            key="booth"
            booth={selectedBooth}
            onStamp={() => onOpenStamp(selectedBooth.id)}
            onClose={() => setSelectedBooth(null)}
          />
        ) : selectedInfo !== null ? (
          <BoothPopup key="info" booth={selectedInfo} onClose={() => setSelectedInfo(null)} />
        ) : null}
      </AnimatePresence>
    </main>
  );
}
