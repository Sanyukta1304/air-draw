import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Draw from "./pages/Draw";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/draw" element={<Draw />} />
    </Routes>
  );
}

export default App;