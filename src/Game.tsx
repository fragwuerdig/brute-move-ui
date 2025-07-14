
import { Chess } from 'chess.js';
import { useState, useRef, useEffect, type JSX } from 'react';
import { Chessboard } from "react-chessboard";
import type { Piece, PromotionPieceOption, Square } from 'react-chessboard/dist/chessboard/types';
import { useWallet } from './WalletProvider';
import { MsgExecuteContract } from '@goblinhunt/cosmes/client';
import type { UnsignedTx } from '@goblinhunt/cosmes/wallet';

interface GameProps {
  gameAddress?: string;
}

interface GameInfo {
  board: string;
  players: string[];
  turn: "black" | "white";
  is_finished: boolean;
  winner: string;
}

function fetchContractStateSmart(gameAddress: string, query: any): Promise<any> {

  let queryBase64 = btoa(JSON.stringify(query));
  let url = `https://rebel-lcd.luncgoblins.com/cosmwasm/wasm/v1/contract/${gameAddress}/smart/${queryBase64}`;
  return fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  }).then(response => response.json())
    .then(data => data.data)
    .catch(error => {
      console.error("Error fetching contract state:", error);
      throw error;
    });

}

function isPlayerTurn(info: GameInfo, connectedAddr: string | undefined): boolean {
  if (!connectedAddr) return false;
  return info.turn === 'white' ? connectedAddr === info.players[0] : connectedAddr === info.players[1];
}

function boardOrientation(info: GameInfo, connectedAddr: string | undefined): "white" | "black" {
  if (!connectedAddr) return "white";
  if (info.players[0] === connectedAddr) return "white";
  if (info.players[1] === connectedAddr) return "black";
  return "white";
}

function canPlay(info: GameInfo, connectedAddr: string | undefined): boolean {
  if (!connectedAddr) return false;
  if (info.is_finished) return false;
  if (!isPlayerTurn(info, connectedAddr)) return false;
  return true;
}

function connectedPlayerColor(info: GameInfo, connectedAddr: string | undefined): "white" | "black" | "neither" {
  return getPlayersColor(info, connectedAddr || "");
}

function getPlayersColor(info: GameInfo, address: string): "white" | "black" | "neither" {
  if (!address) return "neither";
  if (info.players[0] === address) return "white";
  if (info.players[1] === address) return "black";
  return "neither";
}

function Game({ gameAddress }: GameProps) {

  const [reload, setReload] = useState(0);
  const [fen, setFen] = useState("start");
  const promotionPiece = useRef<string>('');

  const [fetchingGameInfo, setFetchingGameInfo] = useState(true);
  const [invalidGameInfo, setInvalidGameInfo] = useState(false);
  const [draggable, setDraggable] = useState(false);
  const [gameInfo, setGameInfo] = useState<GameInfo | null>(null);
  const polling = useRef<boolean>(true);

  const { connect, connected, connectedAddr, broadcast } = useWallet();

  function triggerReload() {
    setReload(reload + 1);
    console.log("Reload triggered, current reload count:", reload);
  }

  useEffect(() => {
    setTimeout(() => {
      console.log("polling = ", polling.current);
      if (polling.current) {
        setReload(reload + 1);
      }
    }, 5000);
  }, [reload, polling]);

  useEffect(() => {
    console.log("Game component mounted with address:", gameAddress);
    fetchContractStateSmart(gameAddress || "", { game_info: {} })
      .catch(() => {
        setInvalidGameInfo(true);
        setFetchingGameInfo(false);
      })
      .then((data: GameInfo) => {
        if (!data || !data.board) {
          setInvalidGameInfo(true);
          setFetchingGameInfo(false);
          return;
        }
        let newGame = new Chess(data.board, { skipValidation: false });
        console.log("Fetched game info:", data);
        setFetchingGameInfo(false);
        setInvalidGameInfo(false);
        setDraggable(true);
        setFen(newGame.fen());
        setGameInfo(data);
      });
  }, [gameAddress, connectedAddr, reload]);

  function onPromotionPieceSelect(piece?: PromotionPieceOption, _from?: Square, _to?: Square): boolean {
    if (!piece) {
      promotionPiece.current = 'q';
      return true
    }
    const base = piece[1].toLowerCase(); // z. B. "Q" → "q"
    promotionPiece.current = base;
    return true;
  }

  function onDrop(sourceSquare: Square, targetSquare: Square, piece: Piece): boolean {

    polling.current = false;

    const move = {
      from: sourceSquare,
      to: targetSquare,
      promotion: promotionPiece.current,
    };

    var result;
    var game = new Chess(fen, { skipValidation: true });
    try {
      console.log(game);
      result = game.move(move);
    } catch (error) {
      console.error("Ungültiger Zug:", error);
      return false;
    }

    // if not legal move, reject at frontend level
    if (!result) {
      polling.current = true;
      return false;
    }

    let oldFen = fen;
    setFen(game.fen());
    setDraggable(false);
    console.log(`Zug ${piece} von ${sourceSquare} nach ${targetSquare}`);

    const uci = move.from + move.to + move.promotion;
    const msg = {
      move: {
        uci: uci,
      }
    };
    
    console.log("Attempting move:", move, "with message:", msg, "uci:", uci);
    
    const tx = {
      msgs: [
        new MsgExecuteContract({
          sender: connectedAddr || "",
          contract: gameAddress || "",
          funds: [],
          msg: msg,
        })
      ]
    };

    broadcast(tx as UnsignedTx).then((result) => {
      console.log("Transaction broadcasted successfully:", result);
      setDraggable(true);
      triggerReload();
    }).catch((error) => {
      console.error("Error broadcasting transaction:", error);
      setDraggable(true);
      setFen(oldFen);
      alert("Error broadcasting transaction: " + error.message);
    }).finally(() => {
      polling.current = true;
    });

    return true;

  }

  function briefInfo(gameInfo: GameInfo | null, connectedAddr: string | undefined): JSX.Element | null {
    if (!gameInfo) return (<p>Invalid Game Info</p>);
    if (gameInfo.is_finished) {
      return (
        <p>
          The game is over, my friend! <br /> {gameInfo.winner ? `Winner: ${gameInfo.winner} (${getPlayersColor(gameInfo, gameInfo.winner)})` : "It's a draw!"}
        </p>
      );
    }
    return (
      <p>
        You are {
          (connectedPlayerColor(gameInfo, connectedAddr) === "white" ||
            connectedPlayerColor(gameInfo, connectedAddr) === "black")
            ? <>
              playing {connectedPlayerColor(gameInfo, connectedAddr)}
              <br />
              {isPlayerTurn(gameInfo, connectedAddr) ? "it's your turn" : "waiting for opponent's move"}
            </>
            : "spectator"
        }
      </p>
    )
  }

  return (
    <>
      {connected ? (
        fetchingGameInfo ? (
          <div>Loading Game Info...</div>
        ) : (
          invalidGameInfo ? (
            <div>Invalid Game Info.<br /> Please check the address.</div>
          ) : (
            <div style={{ width: "600px", margin: "2rem auto", textAlign: "center" }}>
              <h1>Brute Move UI</h1>
              {
                briefInfo(gameInfo, connectedAddr)
              }
              <Chessboard
                boardOrientation={gameInfo ? boardOrientation(gameInfo, connectedAddr) : "white"}
                position={fen}
                onPieceDrop={onDrop}
                onPromotionPieceSelect={onPromotionPieceSelect}
                arePiecesDraggable={gameInfo ? canPlay(gameInfo, connectedAddr) && draggable : false}
              />
            </div>
          )
        )
      ) : (
        <div style={{ width: "400px", margin: "2rem auto", textAlign: "center" }}>
          <button onClick={connect}>Mit Wallet verbinden</button>
        </div>
      )}
    </>
  );
}

export default Game;
