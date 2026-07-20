import { FuwafuwaApp } from "./fuwafuwa-land";
import { MvpApp } from "./app/MvpApp";

function App() {
  const isFuwafuwa =
    typeof window !== "undefined" &&
    (window.location.pathname === "/fuwafuwa" ||
      window.location.pathname.startsWith("/fuwafuwa/") ||
      window.location.pathname === "/staff" ||
      window.location.pathname.startsWith("/staff/") ||
      window.location.pathname === "/display" ||
      window.location.pathname === "/staff/debug");
  return isFuwafuwa ? <FuwafuwaApp /> : <MvpApp />;
}

export default App;
