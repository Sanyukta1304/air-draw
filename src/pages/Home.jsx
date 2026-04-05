import { useNavigate } from "react-router-dom";
import GestureCard from "../components/GestureCard";
import "../styles/home.css";

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="home-page">
      <div className="home-bg"></div>

      <div className="home-card">
        <div className="home-logo">San</div>

        <h1 className="home-title">How to Play</h1>

        <div className="home-grid">
          <GestureCard
            icon="👉"
            title="Draw"
            desc="Point index finger to draw"
          />
          <GestureCard
            icon="✋"
            title="Erase"
            desc="Sweep open palm to erase"
          />
          <GestureCard
            icon="🤏"
            title="Move"
            desc="Pinch to grab & reposition"
          />
          <GestureCard
            icon="✊"
            title="Idle"
            desc="Close fist to rest"
          />
        </div>

        <button className="start-btn" onClick={() => navigate("/draw")}>
          Let's Go!
        </button>
      </div>
    </div>
  );
};

export default Home;