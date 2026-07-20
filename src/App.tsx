import { FuwafuwaApp } from "./fuwafuwa-land";
import { MvpApp } from "./app/MvpApp";
import { isRetiredDemoPath } from "./app/routePolicy";

function App() {
  const pathname = typeof window === "undefined" ? "/" : window.location.pathname;
  const isFuwafuwa =
    typeof window !== "undefined" &&
    !isRetiredDemoPath(pathname) &&
    (pathname === "/fuwafuwa" ||
      pathname.startsWith("/fuwafuwa/") ||
      pathname === "/staff" ||
      pathname.startsWith("/staff/") ||
      pathname === "/display");
  return isFuwafuwa ? <FuwafuwaApp /> : <MvpApp />;
}

export default App;
