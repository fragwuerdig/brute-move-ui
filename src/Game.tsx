
import { Chess } from 'chess.js';
import { useState, useRef, useEffect } from 'react';
import type { PromotionPieceOption, Square } from 'react-chessboard/dist/chessboard/types';
import { useWallet } from './WalletProvider';
import { MsgExecuteContract } from '@goblinhunt/cosmes/client';
import type { UnsignedTx } from '@goblinhunt/cosmes/wallet';
import { fetchContractStateSmart, type GameInfo } from './Common';
import './Game.css';
import TurnIndicator from './TurnIndicator';
import { BoardCard } from './BoardCard';
import { ActionCard } from './ActionCard';
import Modal from '@mui/material/Modal';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { StyledButton } from './StyledButton';


interface GameProps {
  variant: 'compact' | 'default';
  gameAddress?: string;
}

function isPlayerTurn(info: GameInfo, connectedAddr: string | undefined): boolean {
  if (!connectedAddr) return false;
  return info.turn === 'white' ? connectedAddr === info.players[0] : connectedAddr === info.players[1];
}

function canPlay(info: GameInfo | null, connectedAddr: string | undefined): boolean {
  if (!info) return false;
  if (!connectedAddr) return false;
  if (info.is_finished) return false;
  if (!isPlayerTurn(info, connectedAddr)) return false;
  if (info.no_show || info.timeout) return false;
  return true;
}

function getPlayersColor(info: GameInfo | null, address: string | undefined): "white" | "black" | undefined {
  if (!info) return undefined;
  if (!address) return undefined;
  if (info.players[0] === address) return "white";
  if (info.players[1] === address) return "black";
  return undefined;
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

function clockTimeLeft(game: GameInfo | null): { type: 'no-show' | 'turn', time: number } {
  if (!game) return { type: 'turn', time: 0 };
  if (game.is_finished || game.no_show || game.timeout) return { type: 'turn', time: 0 };
  if (game.fullmoves === 1 || game.fullmoves === 0) {
    let secondsSinceCreation = game.game_start_timeout + game.created - Math.floor((Date.now() / 1000));
    return { type: 'no-show', time: secondsSinceCreation };
  } else {
    let secondsSinceMove = game.move_timeout + game.last_move_time - Math.floor((Date.now() / 1000));
    return { type: 'turn', time: secondsSinceMove };
  }
}

function Game({ gameAddress, variant }: GameProps) {

  const [reload, setReload] = useState(0);
  const [fen, setFen] = useState("start");

  const [checkSquare, setCheckSquare] = useState<Square | null>(null);
  const [fromSquare, setFromSquare] = useState<Square | null>(null);
  const [toSquare, setToSquare] = useState<Square | null>(null);
  const [pendingMove, setPendingMove] = useState<string | null>(null);
  const [pendingFen, setPendingFen] = useState<string | null>(null);

  const [draggable, setDraggable] = useState(false);
  const [gameInfo, setGameInfo] = useState<GameInfo | null>(null);
  const [drawDismissed, setDrawDismissed] = useState(false);
  const polling = useRef<boolean>(true);

  const [offerDraw, setOfferDraw] = useState(false);
  const [openDraw, setOpenDraw] = useState(false);

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

  // reload timer
  useEffect(() => {
    setTimeout(() => {
      if (polling.current) {
        setReload(reload + 1);
      }
    }, 5000);
  }, [reload, polling]);

  // fetch game info
  useEffect(() => {
    fetchContractStateSmart(gameAddress || "", { game_info: {} })
      .catch(() => {
        return;
      })
      .then((data: GameInfo) => {
        if (!data || !data.board) {
          return;
          setOpenDraw(false);
          return;
        }
        let newGame = new Chess(data.board, { skipValidation: false });
        setDraggable(true);
        setFen(newGame.fen());
        setGameInfo(data);
        setOpenDraw(data.open_draw_offer !== null && data.open_draw_offer !== connectedAddr);
      });
  }, [gameAddress, connectedAddr, reload]);

  function handleSettlingAfterTimeout() {
    const msg = { settle: {} };
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
      triggerReload();
    }).catch((error) => {
      console.error("Error broadcasting transaction:", error);
      alert("Error broadcasting transaction: " + error.message);
    })
  }

  function onDrop(sourceSquare: Square, targetSquare: Square, promoPiece?: PromotionPieceOption): boolean {

    polling.current = false;
    let promo = promoPiece ? promoPiece[1].toLowerCase() : '';

    const move = {
      from: sourceSquare,
      to: targetSquare,
      promotion: promo,
    };

    var result;
    var game = new Chess(fen, { skipValidation: true });
    try {
      result = game.move(move);
    } catch (error) {
      console.error("Ungültiger Zugi:", error);
      return false;
    }

    // if not legal move, reject at frontend level
    if (!result) {
      polling.current = true;
      return false;
    }

    let oldFen = fen;
    setPendingFen(game.fen());
    setDraggable(false);
    setPendingMove(move.from + move.to + (move.promotion ? move.promotion : ''));

    const uci = move.from + move.to + move.promotion;
    const msg = {
      move: {
        uci: uci,
        offer_draw: offerDraw,
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
      setDraggable(false)
      triggerReload();
      setFen(pendingFen || oldFen);
      polling.current = true;
    }).catch((error) => {
      console.error("Error broadcasting transaction:", error);
      setDraggable(true);
      setFen(oldFen);
      alert("Error broadcasting transaction: " + error.message);
    }).finally(() => {
      setOfferDraw(false);
      setDrawDismissed(false);
      setTimeout(() => setPendingMove(null), 300);
      setTimeout(() => setPendingFen(null), 300);
    });

    return true;

  }

  function handleShare() {
    if (!gameAddress) return;
    const url = `${window.location.origin}/games/${gameAddress}`;
    navigator.clipboard.writeText(url).then(() => {
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

  function handleAcceptDraw() {
    if (!gameAddress || !connectedAddr) return;
    if (!gameInfo) return;
    if (!isPlayerTurn(gameInfo, connectedAddr)) return;
    if (!canPlay(gameInfo, connectedAddr)) return;
    const msg = { claim_draw: {} };

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
      setDrawDismissed(true);
      alert("You have accepted the draw.");
      triggerReload();
    }).catch((error) => {
      console.error("Error broadcasting accept draw transaction:", error);
      alert("Error accepting the draw: " + error.message);
    });
  }

  function handleClaimReward() {
    if (!gameAddress || !connectedAddr) return;
    if (!gameInfo) return;
    if (!gameInfo.is_finished) return;
    const msg = { claim_balance: {} };
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
      alert("You have claimed rewards.");
      triggerReload();
    }).catch((error) => {
      console.error("Error broadcasting claim reward transaction:", error);
      alert("Error claiming reward: " + error.message);
    });
  }

  return variant === 'compact' ? (
    <>
      {
        <TurnIndicator
          variant="compact"
          timeoutVariant={clockTimeLeft(gameInfo).type}
          activeTurn={gameInfo?.turn || undefined}
          secLeft={clockTimeLeft(gameInfo).time}
          players={gameInfo?.players || []}
          player={connectedAddr}
          gameFinished={gameInfo?.is_finished || false}
          winner={getPlayersColor(gameInfo, gameInfo?.winner)}
          gameTimedOut={gameInfo?.no_show ? 'no-show' : (gameInfo?.timeout ? 'turn' : undefined)}
        />
      }
      <BoardCard
        variant="compact"
        fen={pendingFen ? pendingFen : (gameInfo?.board || 'start')}
        checkField={checkSquare || undefined}
        lastMove={pendingMove ? pendingMove : (fromSquare && toSquare ? (fromSquare + toSquare) : undefined)}
        disabled={!canPlay(gameInfo, connectedAddr) || !draggable}
        onMove={onDrop}
        player={getPlayersColor(gameInfo, connectedAddr)}
        //onPromotionPieceSelect={onPromotionPieceSelect}
      />
      <ActionCard
        variant="compact"
        disabled={!canPlay(gameInfo, connectedAddr) || !draggable}
        onChange={(value) => setOfferDraw(value)}
        onRetreatClicked={() => handleGiveUp()}
        onShareClicked={() => handleShare()}
        onSettleClicked={() => handleSettlingAfterTimeout()}
        showSettle={ (gameInfo?.no_show || gameInfo?.timeout) && !gameInfo?.is_finished }
        showClaimReward={ gameInfo?.is_finished && (connectedAddr === gameInfo?.players[0] || connectedAddr === gameInfo?.players[1]) }
        onClaimRewardClicked={() => handleClaimReward()}
        offerDraw={offerDraw}
      />
      <Modal
        open={openDraw && !drawDismissed}
        aria-labelledby="draw-offer-modal-title"
        aria-describedby="draw-offer-modal-description"
      >
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 350,
            bgcolor: 'background.paper',
            border: '2px solid #000',
            boxShadow: 24,
            p: 4,
            borderRadius: 2,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Typography id="draw-offer-modal-title" variant="h6" component="h2" sx={{ mb: 2 }}>
            Draw Offer
          </Typography>
          <Typography id="draw-offer-modal-description" sx={{ mb: 3 }}>
            Your opponent has offered a draw. Do you accept?
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <StyledButton
              variant="contained"
              color="primary"
              onClick={() => handleAcceptDraw()}>
              Accept
            </StyledButton>
            <StyledButton
              variant="outlined"
              color="secondary"
              onClick={() => { setDrawDismissed(true); }}
            >
              Decline
            </StyledButton>
          </Box>
        </Box>
      </Modal>
    </>
  ) : (
    <>
    </>
  );

  /*return (
    <>

      {
        fetchingGameInfo ? (
          <div>Loading Game Info...</div>
        ) : (
          invalidGameInfo ? (
            <div>Invalid Game Info.<br /> Please check the address.</div>
          ) : (
            <Box className="chess-game-container" >

              {
                !(gameInfo?.is_finished) ? (
                  (!(gameInfo?.no_show || gameInfo?.timeout)) ? (

                    <Box className="turn-indicator-container">

                      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'row', justifyContent: 'space-between', overflow: 'hidden', gap: '5px' }}>
                        <Card variant='outlined' className={gameInfo?.turn === 'white' ? 'grow-shrink' : ''} sx={{ borderRadius: '50px', overflow: 'visible', aspectRatio: '1/1', padding: '15px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} />
                        <Card variant="outlined" sx={{ flexGrow: 1, padding: '15px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                          <Typography sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {gameInfo ? (connectedAddr == gameInfo.players[0] ? "You" : addressEllipsis(gameInfo.players[0])) : "Loading..."}
                          </Typography>
                        </Card>
                      </Box>

                      <Clock seconds={clockTimeLeft(gameInfo).time} type={clockTimeLeft(gameInfo).type} />

                      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'row', justifyContent: 'space-between', overflow: 'hidden', gap: '5px' }}>
                        <Card variant='outlined' className={gameInfo?.turn === 'black' ? 'grow-shrink' : ''} sx={{ borderRadius: '50px', overflow: 'visible', aspectRatio: '1/1', padding: '15px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', backgroundColor: 'black' }} />
                        <Card variant="outlined" sx={{ flexGrow: 1, padding: '15px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                          <Typography sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {gameInfo ? (connectedAddr == gameInfo.players[1] ? "You" : addressEllipsis(gameInfo.players[1])) : "Loading..."}
                          </Typography>
                        </Card>
                      </Box>
                    </Box>
                  ) : (
                    <Card variant="outlined" sx={{ boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                      <Box sx={{ padding: '30px', display: 'flex', flexDirection: 'row', alignContent: 'center', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography>
                          This game is over due to {gameInfo?.no_show ? "no show" : "move timeout"}.
                        </Typography>
                        <Button variant="contained" color="primary" sx={{ width: '100px' }} onClick={() => handleTimeoutSetting()}>
                          Settle
                        </Button>
                      </Box>
                    </Card>
                  )
                ) : (
                  <Card variant="outlined" sx={{ boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                    <Box sx={{ padding: '30px', display: 'flex', flexDirection: 'row', alignContent: 'center', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography>
                        This game is over. {gameInfo?.winner ? `Winner: ${addressEllipsis(gameInfo.winner)}` : "No winner."}
                      </Typography>
                    </Box>
                  </Card>
                )
              }

              <Box sx={{ width: '100%', display: 'flex', flexDirection: 'row', justifyContent: 'center' }}>
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
                <Card variant="outlined" sx={{ padding: '15px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                  <Typography sx={{ marginBottom: '5px' }}><b>Actions:</b></Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'row' }}>

                    <Box sx={{ display: 'flex', alignItems: 'center', width: '50%', marginRight: '5px', marginTop: '15px' }}>
                      <Checkbox
                        checked={offerDraw}
                        onChange={(e) => setOfferDraw(e.target.checked)}
                        color="primary"
                        disabled={!gameInfo || !canPlay(gameInfo, connectedAddr)}
                      />
                      <Typography sx={{ ml: 1 }}>Offer Draw</Typography>
                    </Box>

                    <Button variant="contained" color="error" sx={{ marginTop: '15px', width: '50%', marginRight: '5px' }} onClick={() => handleGiveUp()} disabled={!gameInfo ? true : (!canPlay(gameInfo, connectedAddr))}>Give Up</Button>
                    
                    <Button variant="contained" color="secondary" sx={{ marginTop: '15px', width: '50%', marginLeft: '5px' }} onClick={() => handleShare()}>Share</Button>
                  </Box>
                </Card>
              </Box>

              

            </Box>
          )
        )
      }
    </>
  );*/
}

export default Game;
