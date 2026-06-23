import { DemoScreen } from "./components/screens/DemoScreen";
import { FuwafuwaApp } from "./fuwafuwa-land";

function App() {
  const isFuwafuwa =
    typeof window !== "undefined" &&
    (window.location.hostname.includes("fuwafuwa-land") ||
      window.location.hash.startsWith("#/fuwafuwa") ||
      window.location.pathname === "/fuwafuwa" ||
      window.location.pathname.startsWith("/fuwafuwa/") ||
      window.location.pathname === "/staff" ||
      window.location.pathname === "/display" ||
      window.location.pathname === "/debug");
  return isFuwafuwa ? <FuwafuwaApp /> : <DemoScreen />;
}

export default App;
