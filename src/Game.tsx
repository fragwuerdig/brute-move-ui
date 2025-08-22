
import { Chess } from 'chess.js';
import { useState, useRef, useEffect } from 'react';
import { Chessboard } from "react-chessboard";
import type { Piece, PromotionPieceOption, Square } from 'react-chessboard/dist/chessboard/types';
import { useWallet } from './WalletProvider';
import { MsgExecuteContract } from '@goblinhunt/cosmes/client';
import type { UnsignedTx } from '@goblinhunt/cosmes/wallet';
import { Box, Button, Card, Typography } from '@mui/material';
import { addressEllipsis, fetchContractStateSmart, type GameInfo } from './Common';
import './Game.css';


interface GameProps {
  gameAddress?: string;
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

function getPlayersColor(info: GameInfo, address: string): "white" | "black" | "neither" {
  if (!address) return "neither";
  if (info.players[0] === address) return "white";
  if (info.players[1] === address) return "black";
  return "neither";
}

function getKingSquare(game: Chess, color: 'w' | 'b'): Square | null {
  const board = game.board();
  if (!board) return null;
  for (const row of board) {
    for (const piece of row) {
      if (piece && piece.type === 'k' && piece.color === color) {
        return piece.square;
      }
    }
  }
  return null;
}

function getCheckIndicator(game: Chess): Square | null {
  const switchedFen = game.fen().replace(/\b[w|b]\b/, (match) => match === 'w' ? 'b' : 'w');
  const switchedGame = new Chess(switchedFen, { skipValidation: true });
  const switchedTurn = switchedGame.turn() as 'w' | 'b';
  const nonSwitchedTurn = switchedTurn === 'w' ? 'b' : 'w';
  if (switchedGame.inCheck()) {
    return getKingSquare(game, switchedTurn);
  } else if (game.inCheck()) {
    return getKingSquare(game, nonSwitchedTurn);
  } else {
    return null;
  }
}

function splitLastMoveUCI(uci: string): { from: Square, to: Square, promotion?: string } {
  if (uci.length < 4) {
    throw new Error("Invalid UCI string: " + uci);
  }
  const from = uci.slice(0, 2) as Square;
  const to = uci.slice(2, 4) as Square;
  const promotion = uci.length > 4 ? uci[4] : undefined;
  return { from, to, promotion };
}

function Game({ gameAddress }: GameProps) {

  const [reload, setReload] = useState(0);
  const [fen, setFen] = useState("start");
  const promotionPiece = useRef<string>('');

  const [checkSquare, setCheckSquare] = useState<Square | null>(null);
  const [fromSquare, setFromSquare] = useState<Square | null>(null);
  const [toSquare, setToSquare] = useState<Square | null>(null);

  const [fetchingGameInfo, setFetchingGameInfo] = useState(true);
  const [invalidGameInfo, setInvalidGameInfo] = useState(false);
  const [draggable, setDraggable] = useState(false);
  const [gameInfo, setGameInfo] = useState<GameInfo | null>(null);
  const polling = useRef<boolean>(true);

  const { connectedAddr, broadcast } = useWallet();

  function triggerReload() {
    setReload(reload + 1);
  }

  // last move effect
  useEffect(() => {
    const query = { last_move: {} };
    fetchContractStateSmart(gameAddress || "", query)
      .then((data: string) => {
        if (data) {
          const { from, to } = splitLastMoveUCI(data);
          setFromSquare(from);
          setToSquare(to);
        } else {
          setFromSquare(null);
          setToSquare(null);
        }
      })
      .catch((error) => {
        console.error("Error fetching last move:", error);
      });
  }, [fen, gameAddress, reload]);

  // check indication effect
  useEffect(() => {
    if (!gameInfo || !connectedAddr) return;
    const game = new Chess(fen, { skipValidation: true });
    setCheckSquare(getCheckIndicator(game));
  }, [fen, gameAddress, connectedAddr])

  useEffect(() => {
    setTimeout(() => {
      if (polling.current) {
        setReload(reload + 1);
      }
    }, 5000);
  }, [reload, polling]);

  useEffect(() => {
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
    const base = piece[1].toLowerCase();
    promotionPiece.current = base;
    return true;
  }

  function onDrop(sourceSquare: Square, targetSquare: Square, _piece: Piece): boolean {

    polling.current = false;

    const move = {
      from: sourceSquare,
      to: targetSquare,
      promotion: promotionPiece.current,
    };

    var result;
    var game = new Chess(fen, { skipValidation: true });
    try {
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

    const uci = move.from + move.to + move.promotion;
    const msg = {
      move: {
        uci: uci,
      }
    };

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

    broadcast(tx as UnsignedTx).then((_result) => {
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

  function handleShare() {
    if (!gameAddress) return;
    const url = `${window.location.origin}/game/${gameAddress}`;
    const encodedUrl = encodeURIComponent(url);
    const keplrUrl = `keplrwallet://browser?url=${encodedUrl}`;
    navigator.clipboard.writeText(keplrUrl).then(() => {
      alert("Game link copied to clipboard: " + url);
    }).catch((err) => {
      console.error("Failed to copy game link:", err);
      alert("Failed to copy game link.");
    });
  }

  function handleGiveUp() {
    if (!gameAddress || !connectedAddr) return;
    if (!gameInfo) return;
    if (!isPlayerTurn(gameInfo, connectedAddr)) return;
    const msg = {
      give_up: {}
    };

    const tx = {
      msgs: [
        new MsgExecuteContract({
          sender: connectedAddr,
          contract: gameAddress,
          funds: [],
          msg: msg,
        })
      ]
    };

    broadcast(tx as UnsignedTx).then((_result) => {
      alert("You have given up the game.");
      triggerReload();
    }).catch((error) => {
      console.error("Error broadcasting give up transaction:", error);
      alert("Error giving up the game: " + error.message);
    });
  }

  return (
    <>

      {
        fetchingGameInfo ? (
          <div>Loading Game Info...</div>
        ) : (
          invalidGameInfo ? (
            <div>Invalid Game Info.<br /> Please check the address.</div>
          ) : (
            <Box className="chess-game-container" >

              <Box className="turn-indicator-container">
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'row', justifyContent: 'space-between', overflow: 'hidden', gap: '5px' }}>
                  <Card variant='outlined' className={gameInfo?.turn === 'white' ? 'grow-shrink' : ''} sx={{ borderRadius: '50px', overflow: 'visible', aspectRatio: '1/1', padding: '15px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} />
                  <Card variant="outlined" sx={{ flexGrow: 1,padding: '15px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                    <Typography sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {gameInfo ? (connectedAddr == gameInfo.players[0] ? "You" : addressEllipsis(gameInfo.players[0])) : "Loading..."}
                    </Typography>
                  </Card>
                </Box>
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'row', justifyContent: 'space-between', overflow: 'hidden', gap: '5px' }}>
                  <Card variant='outlined' className={gameInfo?.turn === 'black' ? 'grow-shrink' : ''} sx={{ borderRadius: '50px', overflow: 'visible', aspectRatio: '1/1', padding: '15px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', backgroundColor: 'black' }} />
                  <Card variant="outlined" sx={{ flexGrow: 1, padding: '15px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                    <Typography sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {gameInfo ? (connectedAddr == gameInfo.players[1] ? "You" : addressEllipsis(gameInfo.players[1])) : "Loading..."}
                    </Typography>
                  </Card>
                </Box>
              </Box>

              <Box sx={{ width: '100%', display: 'flex', flexDirection: 'row', justifyContent: 'center'  }}>
                <Chessboard
                  position={fen}
                  onPieceDrop={onDrop}
                  onPromotionPieceSelect={onPromotionPieceSelect}
                  arePiecesDraggable={
                    gameInfo ? (
                      connectedAddr ? (
                        canPlay(gameInfo, connectedAddr) ? draggable : false
                      ) : false
                    ) : false
                  }
                  boardOrientation={gameInfo ? boardOrientation(gameInfo, connectedAddr) : "white"}
                  customSquareStyles={
                    [{ sq: checkSquare, type: 'check' }, { sq: fromSquare, type: 'move' }, { sq: toSquare, type: 'move' }].reduce((acc, square) => {
                      if (!square.sq) {
                        return acc;
                      }
                      if (square.type === 'check') {
                        acc[square.sq] = { backgroundColor: 'rgba(255, 0, 0, 0.5)' };
                      } else if (square.type === 'move') {
                        acc[square.sq] = { backgroundColor: 'rgba(0, 255, 0, 0.3)' };
                      }
                      return acc;
                    }, {} as Record<string, React.CSSProperties>)
                  }
                />
              </Box>

              <Box sx={{ maxWidth: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
                <Card variant="outlined" sx={{ marginBottom: '15px', padding: '15px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                  <Typography sx={{ marginBottom: '5px' }}><b>Game Status:</b></Typography>
                  <Typography>
                    {
                      gameInfo ? (
                        gameInfo.is_finished ? (
                          gameInfo.winner ? `Game over, winner: ${gameInfo.winner} (${getPlayersColor(gameInfo, gameInfo.winner)})` : "It's a draw!"
                        ) : "The game is ongoing"
                      ) : "Loading..."
                    }
                  </Typography>
                </Card>
                <Card variant="outlined" sx={{ padding: '15px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                  <Typography sx={{ marginBottom: '5px' }}><b>Actions:</b></Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'row' }}>
                    <Button variant="contained" color="error" sx={{ marginTop: '15px', width: '50%', marginRight: '5px' }} onClick={() => handleGiveUp()} disabled={!gameInfo || !isPlayerTurn(gameInfo, connectedAddr)}>Give Up</Button>
                    <Button variant="contained" color="primary" sx={{ marginTop: '15px', width: '50%' }}>Offer Draw</Button>
                    <Button variant="contained" color="secondary" sx={{ marginTop: '15px', width: '50%', marginLeft: '5px' }} onClick={() => handleShare()}>Share</Button>
                  </Box>
                </Card>
              </Box>

            </Box>
          )
        )
      }
    </>
  );
}

export default Game;
