import { useEffect, useRef } from "react";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import Splash from "./pages/Splash";
import Home from "./pages/Home";
import Draw from "./pages/Draw";

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const checkedReloadRef = useRef(false);

  useEffect(() => {
    if (checkedReloadRef.current) return;
    checkedReloadRef.current = true;

    const navEntry = performance.getEntriesByType("navigation")[0];
    const isReload = navEntry?.type === "reload";

    if (isReload && location.pathname !== "/") {
      sessionStorage.setItem("afterSplashRoute", "/home");
      navigate("/", { replace: true });
    }
  }, [location.pathname, navigate]);

  return (
    <Routes>
      <Route path="/" element={<Splash />} />
      <Route path="/home" element={<Home />} />
      <Route path="/draw" element={<Draw />} />
    </Routes>
  );
}

export default App;