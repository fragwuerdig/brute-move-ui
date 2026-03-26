import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Join from "./Join";
import { fetchContractStateSmart, getFactoryAddr, type JoinableGame } from "./Common";
import { useWallet } from "./WalletProvider";
import { useGameMode } from "./GameModeContext";
import { GlassCard } from "./GlassCard";
import { GameNotFound } from "./components/GameNotFound";

function JoinRoute() {
  const navigate = useNavigate();
  const { chain } = useWallet();
  const { mode } = useGameMode();
  const { id } = useParams<{ id: string }>();
  const [game, setGame] = useState<JoinableGame | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || !chain) return; // wait until both exist

    setLoading(true);
    setGame(null);
    fetchContractStateSmart(getFactoryAddr(chain, mode), { joinable_game: { id } }, chain)
      .then((data) => {
        if (!data) {
          setGame(null);
          return;
        }

        if (data?.contract) {
          // game is already deployed -> forward
          navigate(`/game/${data.contract}?joinId=${id}`, { replace: true });
        } else {
          // still joinable, show join screen
          if (typeof data.bet === 'undefined' || typeof data.fee === 'undefined') {
            setGame(null);
            return;
          }
          data.bet = parseInt(data.bet);
          data.fee = parseInt(data.fee);
          setGame(data);
        }
      })
      .catch((error) => {
        console.error("Error fetching game:", error);
        setGame(null);
      })
      .finally(() => setLoading(false));
  }, [id, chain, navigate, mode]);

  if (loading) {
    return (
      <div className="game-not-found">
        <GlassCard accent>
          <div className="game-not-found__content">
            <p className="game-not-found__title">Loading challenge...</p>
          </div>
        </GlassCard>
      </div>
    );
  }

  if (!game) {
    return <GameNotFound subtitle="This challenge ID is not available in the selected mode." />;
  }

  return <Join game={game}/>;
}

export default JoinRoute;
