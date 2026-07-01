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
  onSelect,
}: {
  booth: BoothExhibitor;
  stamped: boolean;
  selected: boolean;
  reduced: boolean;
  onSelect: () => void;
}) {
  const color = booth.themeColor ?? "#F5A623";
  return (
    <button
      type="button"
      className={`${styles.pin} ${selected ? styles.pinSelected : ""} ${stamped ? styles.pinStamped : ""}`}
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
function PoiMarker({ poi, onSelect }: { poi: VenuePoi; onSelect: () => void }) {
  return (
    <button
      type="button"
      className={styles.poi}
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
  const stampedIds = useMemo(() => new Set(stamps.map((stamp) => stamp.exhibitor_id)), [stamps]);
  const viewportHandle = useRef<MapViewportHandle | null>(null);

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
