
import { useNavigate } from "react-router-dom";
import GestureCard from "../components/GestureCard";
import "../styles/home.css";

const Home = () => {
  const navigate = useNavigate();

  

  return (
    <div className="home-container">
      <h1 className="title">How to Play</h1>

      <div className="grid">
        <GestureCard
          icon="👉"
          title="Draw"
          desc="Point index finger to draw"
        />
        <GestureCard
          icon="✋"
          title="Erase"
          desc="Open palm to erase"
        />
        <GestureCard
          icon="🤏"
          title="Move"
          desc="Move hand smoothly to control drawing"
        />
        <GestureCard
          icon="✊"
          title="Idle"
          desc="Lower hand to stop drawing"
        />
      </div>

      <button className="start-btn" onClick={() => navigate("/draw")}>
        Let's Go
      </button>
    </div>
  );
};

export default Home;