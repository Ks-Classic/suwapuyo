import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { BOOTH_MAP_LANDS } from "../fuwafuwa-land/map/boothMapData";
import type { BoothExhibitor, MapLandId } from "../fuwafuwa-land/map/boothMapData";
import { track } from "../shared/analytics";
import { CONCIERGE_MAP_IMAGE_URL, CONCIERGE_QR_IMAGE_URL, DEMO_BOOTHS, LAND_CAMERA_TARGETS } from "./demoData";
import type { ConciergeStamp } from "./visitorStore";
import { MapViewport, type MapViewportHandle } from "./MapViewport";
import styles from "./mapScreen.module.css";

const MAP_WIDTH = 1724;
const MAP_HEIGHT = 1012;

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
  const color = booth.themeColor ?? "#0f766e";
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

export function MapScreen({ stamps, onOpenStamp, onStampBook }: MapScreenProps) {
  const reduced = !!useReducedMotion();
  const [selectedLand, setSelectedLand] = useState<MapLandId>(BOOTH_MAP_LANDS[0].id);
  const [selectedBooth, setSelectedBooth] = useState<BoothExhibitor | null>(null);
  const stampedIds = useMemo(() => new Set(stamps.map((stamp) => stamp.exhibitor_id)), [stamps]);
  const viewportHandle = useRef<MapViewportHandle | null>(null);

  useEffect(() => {
    track("map_open", { surface: "concierge" });
  }, []);

  useEffect(() => {
    const camera = LAND_CAMERA_TARGETS[selectedLand];
    viewportHandle.current?.flyTo({ xPercent: camera.x, yPercent: camera.y, scale: camera.scale });
  }, [selectedLand]);

  function selectLand(landId: MapLandId): void {
    setSelectedLand(landId);
    track("tap", { surface: "concierge", id: landId, kind: "land_tab" });
  }

  function refit(): void {
    const camera = LAND_CAMERA_TARGETS[selectedLand];
    viewportHandle.current?.flyTo({ xPercent: camera.x, yPercent: camera.y, scale: camera.scale });
  }

  return (
    <main className={styles.root}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>村のマップ</p>
          <h1>行きたい場所をタップ</h1>
        </div>
        <button type="button" className={styles.stampBadge} onClick={onStampBook} aria-label="スタンプ帳">
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

      <nav className={styles.landTabs} aria-label="ランドを選ぶ">
        {BOOTH_MAP_LANDS.map((land) => (
          <button
            key={land.id}
            type="button"
            className={selectedLand === land.id ? styles.landTabActive : styles.landTab}
            style={{ "--land-color": land.themeColor } as CSSProperties}
            onClick={() => selectLand(land.id)}
          >
            {land.shortLabel}
          </button>
        ))}
      </nav>

      <div className={styles.stage}>
        <MapViewport
          contentWidth={MAP_WIDTH}
          contentHeight={MAP_HEIGHT}
          initialTarget={{
            xPercent: LAND_CAMERA_TARGETS[selectedLand].x,
            yPercent: LAND_CAMERA_TARGETS[selectedLand].y,
            scale: LAND_CAMERA_TARGETS[selectedLand].scale,
          }}
          handleRef={viewportHandle}
          className={styles.viewport}
        >
          <div className={styles.canvas} style={{ width: MAP_WIDTH, height: MAP_HEIGHT }}>
            <img src={CONCIERGE_MAP_IMAGE_URL} width={MAP_WIDTH} height={MAP_HEIGHT} alt="YourTIME 会場マップ" draggable={false} className={styles.mapImage} />
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
          <motion.aside
            className={styles.sheet}
            initial={reduced ? false : { y: 260 }}
            animate={{ y: 0 }}
            exit={reduced ? { opacity: 0 } : { y: 260 }}
            transition={reduced ? { duration: 0.12 } : { type: "spring", stiffness: 320, damping: 30 }}
          >
            <div className={styles.sheetHandle} aria-hidden="true" />
            <button type="button" className={styles.sheetClose} onClick={() => setSelectedBooth(null)} aria-label="閉じる">
              ×
            </button>
            <div className={styles.sheetHead}>
              <span className={styles.sheetIcon} style={{ "--pin-color": selectedBooth.themeColor ?? "#0f766e" } as CSSProperties}>
                {selectedBooth.stampEmoji ?? selectedBooth.boothNo}
              </span>
              <div>
                <p className={styles.kicker}>{selectedBooth.category}・ブース{selectedBooth.boothNo}</p>
                <h2>{selectedBooth.name}</h2>
              </div>
            </div>
            <p className={styles.sheetSummary}>{selectedBooth.summary}</p>
            <p className={styles.sheetActivity}>{selectedBooth.activity}</p>
            <div className={styles.sheetActions}>
              <button type="button" className={styles.sheetPrimary} onClick={() => onOpenStamp(selectedBooth.id)}>
                このブースでスタンプ
              </button>
              <button type="button" className={styles.sheetSecondary} onClick={() => setSelectedBooth(null)}>
                とじる
              </button>
            </div>
          </motion.aside>
        ) : null}
      </AnimatePresence>
    </main>
  );
}
