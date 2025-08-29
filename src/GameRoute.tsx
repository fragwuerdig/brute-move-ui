import Game from "./Game";
import { useParams } from "react-router-dom";

function GameRoute() {
  const { addr } = useParams();
  return <Game variant="compact" gameAddress={addr ?? ""} />;
}

export default GameRoute;