import { useEffect, useState } from "react";
import Join from "./Join";
import { useParams } from "react-router-dom";
import { fetchContractStateSmart, getFactoryAddr, type JoinableGame } from "./Common";
import { useWallet } from "./WalletProvider";

function JoinRoute() {
  
  const {chain} = useWallet();
  const { id } = useParams();
  const [game, setGame] = useState<JoinableGame | null>(null);
  
  useEffect(() => {
    fetchContractStateSmart(getFactoryAddr(chain), { joinable_game: { id: id } })
      .then((data) => {
        console.log("Fetched joinable game data:", data);
        setGame(data);
      })
      .catch((error) => {
        console.error("Error fetching game:", error);
      });
  }, [id]);

  return <Join game={game} />;
}

export default JoinRoute;