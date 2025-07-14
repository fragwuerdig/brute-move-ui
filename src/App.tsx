import { Routes, Route } from "react-router-dom";
import Home from "./Home";
import GameRoute from "./GameRoute";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/games/:addr" element={<GameRoute />} />
    </Routes>
  );
}

export default App;
