import { FuwafuwaApp } from "./fuwafuwa-land";
import { MvpApp } from "./app/MvpApp";
import { resolveProductSurface } from "./productRoutes";

function App() {
  const pathname = typeof window === "undefined" ? "/" : window.location.pathname;
  const isFuwafuwa = typeof window !== "undefined" && resolveProductSurface(pathname) === "fuwafuwa-land";
  return isFuwafuwa ? <FuwafuwaApp /> : <MvpApp />;
}

export default App;
