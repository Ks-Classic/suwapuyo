import { DemoScreen } from "./components/screens/DemoScreen";
import { FuwafuwaApp } from "./fuwafuwa-land";
import { ShortsStudioMock } from "./shorts-studio/ShortsStudioMock";

function App() {
  const isShortsStudio =
    typeof window !== "undefined" &&
    (window.location.hash.startsWith("#/shorts-studio") ||
      window.location.pathname === "/shorts-studio" ||
      window.location.pathname.startsWith("/shorts-studio/"));
  const isFuwafuwa =
    typeof window !== "undefined" &&
    (window.location.hostname.includes("fuwafuwa-land") ||
      window.location.hash.startsWith("#/fuwafuwa") ||
      window.location.pathname === "/fuwafuwa" ||
      window.location.pathname.startsWith("/fuwafuwa/") ||
      window.location.pathname === "/staff" ||
      window.location.pathname === "/display" ||
      window.location.pathname === "/debug");
  if (isShortsStudio) {
    return <ShortsStudioMock />;
  }
  return isFuwafuwa ? <FuwafuwaApp /> : <DemoScreen />;
}

export default App;
