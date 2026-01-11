import { Routes, Route } from "react-router-dom";
import Home from "./Home";
import GameRoute from "./GameRoute";
import Head from "./Head";
import { useWallet } from "./WalletProvider";
import Create from "./Create";
import JoinRoute from "./JoinRoute";
import LeaderboardPage from "./LeaderboardPage";
import Play from "./Play";
import MyGames from "./MyGames";
import Profile from "./Profile";
import ProfileView from "./ProfileView";
import { GlassCard } from "./GlassCard";
import './App.css';

// Wallet icon
const WalletIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
    <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
    <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
  </svg>
);

function App() {
  const { connect, connected } = useWallet();

  return (
    <>
      <Head>
        {connected ? (
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/create" element={<Create />} />
            <Route path="/games/:addr" element={<GameRoute />} />
            <Route path="/join/:id" element={<JoinRoute />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/play" element={<Play />} />
            <Route path="/my-games" element={<MyGames />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/profile/:address" element={<ProfileView />} />
          </Routes>
        ) : (
          <div className="connect-screen">
            <div className="connect-card">
              <GlassCard accent>
                <div className="connect-icon">
                  <WalletIcon />
                </div>
                <h1 className="connect-title">Connect Wallet</h1>
                <p className="connect-subtitle">
                  Connect your Terra wallet to start playing on-chain chess
                </p>
                <button className="connect-btn" onClick={connect}>
                  <WalletIcon />
                  Connect Wallet
                </button>
              </GlassCard>
            </div>
            <div className="connect-features">
              <div className="connect-feature">
                <span className="connect-feature__icon">&#128274;</span>
                <span className="connect-feature__text">Secure</span>
              </div>
              <div className="connect-feature">
                <span className="connect-feature__icon">&#9889;</span>
                <span className="connect-feature__text">Fast</span>
              </div>
              <div className="connect-feature">
                <span className="connect-feature__icon">&#128176;</span>
                <span className="connect-feature__text">Trustless</span>
              </div>
            </div>
          </div>
        )}
      </Head>
    </>
  );
}

export default App;
