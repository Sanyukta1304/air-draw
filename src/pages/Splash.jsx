import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/splash.css";

const Splash = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      sessionStorage.setItem("splashPassed", "true");
      navigate("/home", { replace: true });
    }, 2500);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="splash-page">
      <div className="splash-content">
        <h1 className="splash-logo">San</h1>
        <p className="splash-text">INITIALIZING HAND TRACKING...</p>
        <div className="loading-line">
          <div className="loading-bar"></div>
        </div>
      </div>
    </div>
  );
};

export default Splash;