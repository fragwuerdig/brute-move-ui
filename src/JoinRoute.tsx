import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Join from "./Join";
import { fetchContractStateSmart, getFactoryAddr, type JoinableGame } from "./Common";
import { useWallet } from "./WalletProvider";

function JoinRoute() {
  const navigate = useNavigate();
  const { chain } = useWallet();
  const { id } = useParams<{ id: string }>();
  const [game, setGame] = useState<JoinableGame | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || !chain) return; // wait until both exist

    setLoading(true);
    fetchContractStateSmart(getFactoryAddr(chain), { joinable_game: { id } })
      .then((data) => {
        console.log("Fetched game data:", data);
        if (data?.contract) {
          // game is already deployed -> forward
          navigate(`/games/${data.contract}`, { replace: true });
        } else {
          // still joinable, show join screen
          setGame(data);
        }
      })
      .catch((error) => {
        console.error("Error fetching game:", error);
      })
      .finally(() => setLoading(false));
  }, [id, chain, navigate]);

  if (loading) return <div>Loading…</div>;
  if (!game) return <div>Game not found.</div>;

  return <Join game={game}/>;
}

export default JoinRoute;
