import { useState } from 'react';
import type { Square } from 'react-chessboard/dist/chessboard/types';
import { useWallet } from './WalletProvider';
import { useOnChainGame } from './hooks/useOnChainGame';
import { useChessGame } from './hooks/useChessGame';
import { ChessBoard } from './components/ChessBoard';
import TurnIndicator from './TurnIndicator';
import { ActionCard } from './ActionCard';
import './Game.css';

interface GameProps {
    variant: 'compact' | 'default';
    gameAddress?: string;
}

function Game({ gameAddress, variant }: GameProps) {
    const { connectedAddr } = useWallet();
    const [mode, setMode] = useState<'live' | 'exploration'>('live');
    const [offerDraw, setOfferDraw] = useState(false);
    const [drawDismissed, setDrawDismissed] = useState(false);

    // On-chain game state
    const onChain = useOnChainGame({
        gameAddress: gameAddress || '',
    });

    // Local game for exploration mode
    const localGame = useChessGame({
        initialFen: onChain.fen,
    });

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

    // Enter exploration mode
    const enterExploration = () => {
        localGame.setPosition(onChain.fen);
        setMode('exploration');
    };

    // Exit exploration mode
    const exitExploration = () => {
        setMode('live');
    };

    // Share game link
    const handleShare = () => {
        if (!gameAddress) return;
        const url = `${window.location.origin}/games/${gameAddress}`;
        navigator.clipboard.writeText(url).then(() => {
            alert('Game link copied to clipboard: ' + url);
        }).catch((err) => {
            console.error('Failed to copy game link:', err);
            alert('Failed to copy game link.');
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

    // Check if player can claim reward
    const canClaimReward = onChain.gameInfo?.is_finished &&
        (connectedAddr === onChain.gameInfo?.players[0] || connectedAddr === onChain.gameInfo?.players[1]);

    // Check if settle button should show
    const showSettle = (onChain.gameInfo?.no_show || onChain.gameInfo?.timeout) && !onChain.gameInfo?.is_finished;

    if (variant !== 'compact') {
        return <div className="game-container" />;
    }

    const isExploration = mode === 'exploration';

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
                    // Live history navigation
                    historyIndex={isExploration ? undefined : onChain.historyIndex}
                    historyLength={isExploration ? undefined : onChain.historyFens.length}
                    onHistoryBack={onChain.goBack}
                    onHistoryForward={onChain.goForward}
                    onHistoryStart={onChain.goToStart}
                    onHistoryEnd={onChain.goToLatest}
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

                <ActionCard
                    variant="compact"
                    disabled={!onChain.canPlay}
                    onChange={(value) => setOfferDraw(value)}
                    onRetreatClicked={handleResign}
                    onShareClicked={handleShare}
                    onSettleClicked={handleClaimTimeout}
                    onExploreClicked={enterExploration}
                    showSettle={showSettle}
                    showClaimReward={canClaimReward}
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
