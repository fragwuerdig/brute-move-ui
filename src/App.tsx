import { Routes, Route } from "react-router-dom";
import Home from "./Home";
import GameRoute from "./GameRoute";
import Head from "./Head";
import Create from "./Create";
import JoinRoute from "./JoinRoute";
import LeaderboardPage from "./LeaderboardPage";
import Play from "./Play";
import MyGames from "./MyGames";
import Profile from "./Profile";
import ProfileView from "./ProfileView";
import './App.css';

function App() {
  return (
    <>
      <Head>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/create" element={<Create />} />
          <Route path="/game/:addr" element={<GameRoute />} />
          <Route path="/join/:id" element={<JoinRoute />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/play" element={<Play />} />
          <Route path="/games" element={<MyGames />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/:address" element={<ProfileView />} />
        </Routes>
      </Head>
    </>
  );
}

export default App;
