import { useEffect } from "react";
import { ConciergeApp } from "./concierge/ConciergeApp";
import { DemoScreen } from "./components/screens/DemoScreen";
import { LineDemoMenu } from "./components/screens/LineDemoMenu";
import { FuwafuwaApp } from "./fuwafuwa-land";
import { ExhibitorReport } from "./report/ExhibitorReport";
import { ShortsStudioMock } from "./shorts-studio/ShortsStudioMock";
import { MvpApp } from "./app/MvpApp";

// 旧「当日マップ」(BoothMapScreen)は退役。会場マップは /concierge のマップに一本化した。
function isLegacyMapPath(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return (
    window.location.pathname === "/map" ||
    window.location.pathname === "/fuwafuwa/map" ||
    window.location.hash.startsWith("#/fuwafuwa/map")
  );
}

function App() {
  const legacyMap = isLegacyMapPath();

  useEffect(() => {
    if (legacyMap) {
      window.location.replace("/concierge");
    }
  }, [legacyMap]);

  const isShortsStudio =
    typeof window !== "undefined" &&
    (window.location.hash.startsWith("#/shorts-studio") ||
      window.location.pathname === "/shorts-studio" ||
      window.location.pathname.startsWith("/shorts-studio/"));
  const isFuwafuwa =
    typeof window !== "undefined" &&
    (window.location.hash.startsWith("#/fuwafuwa") ||
      window.location.pathname === "/fuwafuwa" ||
      window.location.pathname.startsWith("/fuwafuwa/") ||
      window.location.pathname === "/staff" ||
      window.location.pathname === "/display" ||
      window.location.pathname === "/debug");
  const isLineDemo =
    typeof window !== "undefined" &&
    (window.location.hash.startsWith("#/line") ||
      window.location.pathname === "/line" ||
      window.location.pathname.startsWith("/line/"));
  const isConcierge =
    typeof window !== "undefined" &&
    (window.location.pathname === "/concierge" ||
      window.location.pathname.startsWith("/concierge/"));
  const isLegacyReport =
    typeof window !== "undefined" &&
    (window.location.pathname === "/report" ||
      window.location.pathname.startsWith("/report/") ||
      window.location.hash.startsWith("#/report"));
  const isLegacyGame = typeof window !== "undefined" && window.location.pathname === "/legacy/game";
  if (legacyMap) {
    return null;
  }
  if (isShortsStudio) {
    return <ShortsStudioMock />;
  }
  if (isLegacyGame) {
    return <DemoScreen />;
  }
  if (isLegacyReport) {
    return <ExhibitorReport />;
  }
  if (isConcierge) {
    return <ConciergeApp />;
  }
  if (isLineDemo) {
    return <LineDemoMenu />;
  }
  return isFuwafuwa ? <FuwafuwaApp /> : <MvpApp />;
}

export default App;
