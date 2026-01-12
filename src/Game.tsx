import { useState, useEffect } from 'react';
import type { Square } from 'react-chessboard/dist/chessboard/types';
import { useWallet } from './WalletProvider';
import { useOnChainGame } from './hooks/useOnChainGame';
import { useChessGame } from './hooks/useChessGame';
import { useStockfish } from './hooks/useStockfish';
import { useNameService } from './hooks';
import { ChessBoard } from './components/ChessBoard';
import { EnginePanel } from './components/EnginePanel';
import TurnIndicator from './TurnIndicator';
import { ActionCard } from './ActionCard';
import { uciToPgn, addressEllipsis } from './Common';
import './Game.css';

interface GameProps {
    variant: 'compact' | 'default';
    gameAddress?: string;
}

// Track evaluation for a position
interface PositionEval {
    fen: string;
    score: number;
    bestMove: string | null;
}

function Game({ gameAddress, variant }: GameProps) {
    const { connectedAddr } = useWallet();
    const [mode, setMode] = useState<'live' | 'exploration'>('live');
    const [engineEnabled, setEngineEnabled] = useState(false);
    const [offerDraw, setOfferDraw] = useState(false);
    const [drawDismissed, setDrawDismissed] = useState(false);
    const [playerNames, setPlayerNames] = useState<{ white: string | null; black: string | null }>({ white: null, black: null });
    // Store evaluations for each position we've analyzed
    const [evalCache, setEvalCache] = useState<Map<string, PositionEval>>(new Map());

    // Name service for resolving player addresses
    const { resolveAddresses } = useNameService();

    // On-chain game state
    const onChain = useOnChainGame({
        gameAddress: gameAddress || '',
    });

    // Resolve player names when game info is loaded
    useEffect(() => {
        if (!onChain.gameInfo?.players || onChain.gameInfo.players.length < 2) return;

        const [whiteAddr, blackAddr] = onChain.gameInfo.players;
        resolveAddresses([whiteAddr, blackAddr]).then((profiles) => {
            const whiteProfile = profiles.get(whiteAddr);
            const blackProfile = profiles.get(blackAddr);
            setPlayerNames({
                white: whiteProfile?.display_name || null,
                black: blackProfile?.display_name || null,
            });
        });
    }, [onChain.gameInfo?.players, resolveAddresses]);

    // Local game for exploration mode
    const localGame = useChessGame({
        initialFen: onChain.fen,
    });

    // Stockfish engine (only active in exploration mode when enabled, and only for finished games)
    const isExploration = mode === 'exploration';
    const isGameFinished = onChain.gameInfo?.is_finished ?? false;
    const engine = useStockfish({
        enabled: engineEnabled && isExploration && isGameFinished,
        depth: 18,
    });

    // Re-analyze when exploration position changes
    useEffect(() => {
        if (engineEnabled && isExploration && isGameFinished) {
            engine.analyze(localGame.fen);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [localGame.fen, engineEnabled, isExploration, isGameFinished]);

    // Cache evaluations when engine finishes analyzing at good depth
    useEffect(() => {
        if (engine.currentEval && engine.currentEval.depth >= 12 && engine.bestMove) {
            const fen = localGame.fen;
            setEvalCache(prev => {
                const newCache = new Map(prev);
                newCache.set(fen, {
                    fen,
                    score: engine.currentEval!.score,
                    bestMove: engine.bestMove,
                });
                return newCache;
            });
        }
    }, [engine.currentEval, engine.bestMove, localGame.fen]);

    // Build lastMove data for quality assessment
    const lastMoveQualityData = (() => {
        if (!isExploration || !engineEnabled) return undefined;
        if (localGame.historyIndex <= 0) return undefined;

        const prevIndex = localGame.historyIndex - 1;
        const prevFen = localGame.history[prevIndex];
        const currFen = localGame.fen;
        const playedMove = localGame.moveHistory[prevIndex];

        if (!prevFen || !playedMove) return undefined;

        const prevEvalData = evalCache.get(prevFen);
        const currEvalData = evalCache.get(currFen);

        return {
            uci: playedMove,
            prevFen,
            prevEval: prevEvalData?.score ?? null,
            currEval: currEvalData?.score ?? engine.currentEval?.score ?? null,
            bestMove: prevEvalData?.bestMove ?? null,
        };
    })();

    // Handle live move
    const handleLiveMove = (from: Square, to: Square, promotion?: string): boolean => {
        if (onChain.isViewingHistory) {
            onChain.goToLatest();
            return false;
        }

        const uci = from + to + (promotion || '');
        onChain.postMove(uci, offerDraw)
            .then(() => {
                setOfferDraw(false);
                setDrawDismissed(false);
            })
            .catch((error) => {
                alert('Error: ' + error.message);
            });
        return true;
    };

    // Handle exploration move
    const handleExplorationMove = (from: Square, to: Square, promotion?: string): boolean => {
        return localGame.move(from, to, promotion);
    };

    // Enter exploration mode with full game history
    const enterExploration = () => {
        // Load the complete game history so user can navigate through all positions
        localGame.loadHistory(onChain.historyFens, onChain.history, onChain.historyIndex);
        setMode('exploration');
    };

    // Exit exploration mode
    const exitExploration = () => {
        setMode('live');
    };

    // Share game link
    const handleShare = () => {
        if (!gameAddress) return;
        const url = `${window.location.origin}/game/${gameAddress}`;
        navigator.clipboard.writeText(url).then(() => {
            alert('Game link copied to clipboard: ' + url);
        }).catch((err) => {
            console.error('Failed to copy game link:', err);
            alert('Failed to copy game link.');
        });
    };

    // Copy PGN to clipboard
    const handleCopyPgn = () => {
        const players = onChain.gameInfo?.players || [];
        const whiteAddr = players[0] || '?';
        const blackAddr = players[1] || '?';

        // Use display name if available, otherwise ellipsized address
        const whiteName = playerNames.white || addressEllipsis(whiteAddr);
        const blackName = playerNames.black || addressEllipsis(blackAddr);

        // Determine result
        let result = '*';
        if (onChain.gameInfo?.is_finished) {
            if (!onChain.gameInfo.winner) {
                result = '1/2-1/2';
            } else if (onChain.gameInfo.winner === whiteAddr) {
                result = '1-0';
            } else {
                result = '0-1';
            }
        }

        const pgn = uciToPgn(onChain.history, {
            white: whiteName,
            black: blackName,
            result,
        });
        navigator.clipboard.writeText(pgn).then(() => {
            alert('PGN copied to clipboard!');
        }).catch((err) => {
            console.error('Failed to copy PGN:', err);
            alert('Failed to copy PGN.');
        });
    };

    // Handle resign
    const handleResign = () => {
        if (!onChain.canPlay) return;
        onChain.resign()
            .then(() => alert('You have resigned.'))
            .catch((error) => alert('Error: ' + error.message));
    };

    // Handle accept draw
    const handleAcceptDraw = () => {
        onChain.acceptDraw()
            .then(() => {
                setDrawDismissed(true);
                alert('You have accepted the draw.');
            })
            .catch((error) => alert('Error: ' + error.message));
    };

    // Handle claim timeout
    const handleClaimTimeout = () => {
        onChain.claimTimeout()
            .catch((error) => alert('Error: ' + error.message));
    };

    // Handle claim reward
    const handleClaimReward = () => {
        onChain.claimReward()
            .then(() => alert('You have claimed rewards.'))
            .catch((error) => alert('Error: ' + error.message));
    };

    // Check if game is finished and reward can be claimed
    const showClaimReward = onChain.gameInfo?.is_finished &&
        (connectedAddr === onChain.gameInfo?.players[0] || connectedAddr === onChain.gameInfo?.players[1]);

    // Check if the connected user is the winner and there's balance to claim
    const canClaimReward = onChain.gameInfo?.is_finished &&
        onChain.gameInfo?.winner === connectedAddr &&
        onChain.contractBalance > 0;

    // Check if settle button should show
    const showSettle = (onChain.gameInfo?.no_show || onChain.gameInfo?.timeout) && !onChain.gameInfo?.is_finished;

    if (variant !== 'compact') {
        return <div className="game-container" />;
    }

    return (
        <div className="game-container">
            {/* Mobile Turn Indicator - above board */}
            <div className="game-mobile-turn">
                <TurnIndicator
                    variant="compact"
                    timeoutVariant={onChain.timeLeft.type}
                    activeTurn={onChain.gameInfo?.turn || undefined}
                    secLeft={onChain.timeLeft.seconds}
                    players={onChain.gameInfo?.players || []}
                    player={connectedAddr}
                    gameFinished={onChain.gameInfo?.is_finished || false}
                    winner={onChain.gameInfo?.winner ? (
                        onChain.gameInfo.winner === onChain.gameInfo.players[0] ? 'white' : 'black'
                    ) : undefined}
                    gameTimedOut={onChain.gameInfo?.no_show ? 'no-show' : (onChain.gameInfo?.timeout ? 'turn' : undefined)}
                />
            </div>

            {/* Board Section */}
            <div className="game-board-section">
                <ChessBoard
                    mode={isExploration ? 'exploration' : 'live'}
                    fen={isExploration ? localGame.fen : onChain.fen}
                    orientation={onChain.myColor || 'white'}
                    allowedColor={isExploration ? 'both' : (onChain.myColor || undefined)}
                    disabled={isExploration ? false : !onChain.canPlay}
                    checkSquare={(isExploration ? localGame.checkSquare : onChain.checkSquare) || undefined}
                    lastMove={(isExploration ? localGame.lastMove : onChain.lastMove) || undefined}
                    onMove={isExploration ? handleExplorationMove : handleLiveMove}
                    // Exploration controls
                    showControls={isExploration}
                    onUndo={localGame.undo}
                    onRedo={localGame.redo}
                    onReset={localGame.reset}
                    onExit={exitExploration}
                    canUndo={localGame.canUndo}
                    canRedo={localGame.canRedo}
                    // History navigation (works in both modes)
                    historyIndex={isExploration ? localGame.historyIndex : onChain.historyIndex}
                    historyLength={isExploration ? localGame.history.length : onChain.historyFens.length}
                    onHistoryBack={isExploration ? localGame.undo : onChain.goBack}
                    onHistoryForward={isExploration ? localGame.redo : onChain.goForward}
                    onHistoryStart={isExploration ? localGame.reset : onChain.goToStart}
                    onHistoryEnd={isExploration ? () => localGame.goToMove(localGame.history.length - 1) : onChain.goToLatest}
                    // Evaluation bar (exploration mode with engine enabled)
                    evaluation={isExploration && engineEnabled && engine.currentEval ? {
                        score: engine.currentEval.score,
                        mate: engine.currentEval.mate
                    } : undefined}
                />
            </div>

            {/* Sidebar */}
            <div className="game-sidebar">
                <TurnIndicator
                    variant="compact"
                    timeoutVariant={onChain.timeLeft.type}
                    activeTurn={onChain.gameInfo?.turn || undefined}
                    secLeft={onChain.timeLeft.seconds}
                    players={onChain.gameInfo?.players || []}
                    player={connectedAddr}
                    gameFinished={onChain.gameInfo?.is_finished || false}
                    winner={onChain.gameInfo?.winner ? (
                        onChain.gameInfo.winner === onChain.gameInfo.players[0] ? 'white' : 'black'
                    ) : undefined}
                    gameTimedOut={onChain.gameInfo?.no_show ? 'no-show' : (onChain.gameInfo?.timeout ? 'turn' : undefined)}
                />

                {/* Move history - content will be added later */}
                <div className="game-move-history" />

                {/* Engine Panel (exploration mode only, and only for finished games) */}
                {isExploration && onChain.gameInfo?.is_finished && (
                    <EnginePanel
                        enabled={engineEnabled}
                        isReady={engine.isReady}
                        isAnalyzing={engine.isAnalyzing}
                        lines={engine.lines}
                        depth={engine.currentEval?.depth ?? 0}
                        fen={localGame.fen}
                        error={engine.error}
                        onToggle={() => setEngineEnabled(!engineEnabled)}
                        lastMove={lastMoveQualityData}
                    />
                )}

                <ActionCard
                    variant="compact"
                    disabled={!onChain.canPlay}
                    onChange={(value) => setOfferDraw(value)}
                    onRetreatClicked={handleResign}
                    onShareClicked={handleShare}
                    onSettleClicked={handleClaimTimeout}
                    onExploreClicked={enterExploration}
                    onCopyPgnClicked={handleCopyPgn}
                    showSettle={showSettle}
                    showClaimReward={showClaimReward}
                    canClaimReward={canClaimReward}
                    onClaimRewardClicked={handleClaimReward}
                    offerDraw={offerDraw}
                />
            </div>

            {/* Draw Offer Modal */}
            {onChain.hasOpenDrawOffer && !drawDismissed && (
                <div className="game-modal-overlay">
                    <div className="game-modal">
                        <h3 className="game-modal__title">Draw Offer</h3>
                        <p className="game-modal__message">
                            Your opponent has offered a draw. Do you accept?
                        </p>
                        <div className="game-modal__actions">
                            <button
                                className="game-modal__btn game-modal__btn--secondary"
                                onClick={() => setDrawDismissed(true)}
                            >
                                Decline
                            </button>
                            <button
                                className="game-modal__btn game-modal__btn--primary"
                                onClick={handleAcceptDraw}
                            >
                                Accept
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Game;
