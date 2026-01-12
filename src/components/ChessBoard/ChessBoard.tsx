import { Chessboard } from "react-chessboard";
import type { CustomSquareStyles } from "react-chessboard/dist/chessboard/types";
import { type PieceSymbol, type Square, Chess } from "chess.js";
import { useState, useRef, useEffect, useMemo } from "react";
import { EvaluationBar } from '../EvaluationBar';
import './ChessBoard.css';

export type BoardMode = 'live' | 'exploration' | 'analysis';

export interface ChessBoardProps {
    // Core
    mode: BoardMode;
    fen: string;
    orientation?: 'white' | 'black';

    // Visual indicators
    checkSquare?: Square;
    lastMove?: { from: Square; to: Square };

    // Interaction
    disabled?: boolean;
    allowedColor?: 'white' | 'black' | 'both';

    // Callbacks
    onMove?: (from: Square, to: Square, promotion?: string) => boolean;

    // Exploration/Analysis controls
    showControls?: boolean;
    onUndo?: () => void;
    onRedo?: () => void;
    onReset?: () => void;
    onExit?: () => void;
    canUndo?: boolean;
    canRedo?: boolean;

    // History navigation (live mode)
    historyIndex?: number;
    historyLength?: number;
    onHistoryBack?: () => void;
    onHistoryForward?: () => void;
    onHistoryStart?: () => void;
    onHistoryEnd?: () => void;

    // Evaluation bar
    evaluation?: { score: number; mate: number | null };
}

// Icons
const UndoIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 18 9 12 15 6" />
    </svg>
);

const RedoIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6" />
    </svg>
);

const ResetIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
    </svg>
);

const ExitIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

const ChevronLeftIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 18 9 12 15 6" />
    </svg>
);

const ChevronRightIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6" />
    </svg>
);

const ChevronsLeftIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="11 17 6 12 11 7" />
        <polyline points="18 17 13 12 18 7" />
    </svg>
);

const ChevronsRightIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="13 17 18 12 13 7" />
        <polyline points="6 17 11 12 6 7" />
    </svg>
);

function parseIndicatorStyles(checkSquare?: Square, lastMove?: { from: Square; to: Square }, mode?: BoardMode): CustomSquareStyles {
    const styles: CustomSquareStyles = {};

    // Check indicator (red)
    if (checkSquare) {
        styles[checkSquare] = { backgroundColor: 'rgba(239, 68, 68, 0.6)' };
    }

    // Last move indicator (color depends on mode)
    if (lastMove) {
        const color = mode === 'exploration' ? 'rgba(59, 130, 246, 0.35)' :
            mode === 'analysis' ? 'rgba(34, 197, 94, 0.35)' :
                'rgba(247, 179, 43, 0.35)';
        styles[lastMove.from] = { backgroundColor: color };
        styles[lastMove.to] = { backgroundColor: color };
    }

    return styles;
}

// Generate legal move indicator styles (dots on target squares)
function getLegalMoveStyles(fen: string, selectedSquare: Square | null, hasPiece: (sq: Square) => boolean): CustomSquareStyles {
    if (!selectedSquare) return {};

    const styles: CustomSquareStyles = {};
    const game = new Chess(fen);
    const legalMoves = game.moves({ square: selectedSquare, verbose: true });

    for (const move of legalMoves) {
        const targetHasPiece = hasPiece(move.to);
        if (targetHasPiece) {
            // Capture: soft ring around the piece
            styles[move.to] = {
                background: 'radial-gradient(circle at center, transparent 53%, rgba(0, 0, 0, 0.12) 57%, rgba(0, 0, 0, 0.12) 67%, transparent 71%)',
            };
        } else {
            // Empty square: soft dot with slight blur
            styles[move.to] = {
                background: 'radial-gradient(circle at center, rgba(0, 0, 0, 0.15) 0%, rgba(0, 0, 0, 0.13) 12%, rgba(0, 0, 0, 0.04) 16%, transparent 18%)',
            };
        }
    }

    return styles;
}

export function ChessBoard({
    mode,
    fen,
    orientation = 'white',
    checkSquare,
    lastMove,
    disabled = false,
    allowedColor,
    onMove,
    showControls = false,
    onUndo,
    onRedo,
    onReset,
    onExit,
    canUndo = false,
    canRedo = false,
    historyIndex,
    historyLength,
    onHistoryBack,
    onHistoryForward,
    onHistoryStart,
    onHistoryEnd,
    evaluation,
}: ChessBoardProps) {
    const [selected, setSelected] = useState<string | null>(null);
    const [target, setTarget] = useState<string | null>(null);
    const [promotionOpen, setPromotionOpen] = useState(false);
    const frameRef = useRef<HTMLDivElement>(null);
    const [boardWidth, setBoardWidth] = useState<number | undefined>(undefined);

    // Get current turn from FEN
    const currentTurn = useMemo(() => {
        try {
            const game = new Chess(fen);
            return game.turn() === 'w' ? 'white' : 'black';
        } catch {
            return 'white';
        }
    }, [fen]);

    // Determine which color can move
    const effectiveAllowedColor = allowedColor ?? (mode === 'live' ? orientation : 'both');

    // Can the current player move?
    const canInteract = !disabled && (
        effectiveAllowedColor === 'both' ||
        effectiveAllowedColor === currentTurn
    );

    // Board width observer - calculate board size from frame content
    useEffect(() => {
        const updateWidth = () => {
            const frame = frameRef.current;
            if (!frame) return;

            const style = getComputedStyle(frame);
            const paddingLeft = parseFloat(style.paddingLeft);
            const paddingRight = parseFloat(style.paddingRight);
            const borderLeft = parseFloat(style.borderLeftWidth);
            const borderRight = parseFloat(style.borderRightWidth);

            const contentWidth = frame.offsetWidth - paddingLeft - paddingRight - borderLeft - borderRight;
            if (contentWidth > 0) {
                setBoardWidth(contentWidth);
            }
        };

        const frame = frameRef.current;
        if (frame) {
            const resizeObserver = new ResizeObserver(updateWidth);
            resizeObserver.observe(frame);
            requestAnimationFrame(updateWidth);
            return () => resizeObserver.disconnect();
        }
    }, []);

    // Clear selection when FEN changes
    useEffect(() => {
        setSelected(null);
    }, [fen]);

    const onSquareClick = (square: string, piece?: string) => {
        if (!canInteract) return;

        const game = new Chess(fen);
        const selectedPiece = selected ? game.get(selected as Square) : null;
        const clickedPieceColor = piece ? (piece[0] === 'w' ? 'white' : 'black') : null;

        // Second click: try to move or reselect
        if (selected) {
            // Check for pawn promotion
            if (selectedPiece?.type === 'p') {
                const isPromotion =
                    (currentTurn === 'white' && selected[1] === '7' && square[1] === '8') ||
                    (currentTurn === 'black' && selected[1] === '2' && square[1] === '1');

                if (isPromotion) {
                    // Validate promotion move is legal
                    try {
                        const testMove = game.move({ from: selected as Square, to: square as Square, promotion: 'q' });
                        if (!testMove) {
                            setSelected(null);
                            return;
                        }
                    } catch {
                        setSelected(null);
                        return;
                    }
                    setPromotionOpen(true);
                    setTarget(square);
                    return;
                }
            }

            // Reselect own piece
            if (clickedPieceColor === currentTurn) {
                setSelected(square);
                return;
            }

            // Validate move before attempting
            try {
                const testMove = game.move({ from: selected as Square, to: square as Square });
                if (!testMove) {
                    // Invalid move - just clear selection
                    setSelected(null);
                    return;
                }
            } catch {
                // Invalid move - just clear selection
                setSelected(null);
                return;
            }

            // Valid move - proceed
            setSelected(null);
            if (onMove) {
                onMove(selected as Square, square as Square);
            }
            return;
        }

        // First click: select a piece of the side to move
        if (piece && clickedPieceColor === currentTurn) {
            // In live mode, only allow selecting your own pieces
            if (mode === 'live' && effectiveAllowedColor !== 'both' && clickedPieceColor !== effectiveAllowedColor) {
                return;
            }
            setSelected(square);
        }
    };

    const handlePromotionPieceSelect = (piece?: PieceSymbol) => {
        setPromotionOpen(false);
        if (!piece || !selected || !target) return;

        if (onMove) {
            onMove(selected as Square, target as Square, piece);
        }
        setTarget(null);
        setSelected(null);
    };

    // Frame classes based on mode
    const frameClass = [
        'board-frame',
        canInteract && 'board-frame--active',
        disabled && 'board-frame--disabled',
        mode === 'exploration' && 'board-frame--exploration',
        mode === 'analysis' && 'board-frame--analysis',
    ].filter(Boolean).join(' ');

    // Square colors based on mode
    const darkSquareColor = mode === 'exploration' ? '#5a7bab' :
        mode === 'analysis' ? '#5a9b7b' :
            '#7b8bab';

    const lightSquareColor = mode === 'exploration' ? '#a0b8d8' :
        mode === 'analysis' ? '#a0d8b8' :
            '#b7c0d8';

    // History navigation available - always show in live mode for consistent layout
    const showHistoryNav = mode === 'live' && historyLength !== undefined;
    const canGoBack = historyIndex !== undefined && historyIndex > 0;
    const canGoForward = historyIndex !== undefined && historyLength !== undefined && historyIndex < historyLength - 1;

    // Legal move indicators
    const legalMoveStyles = useMemo(() => {
        if (!selected || !fen) return {};
        const game = new Chess(fen);
        const hasPiece = (sq: Square) => !!game.get(sq);
        return getLegalMoveStyles(fen, selected as Square, hasPiece);
    }, [fen, selected]);

    return (
        <div className="board-container">

            {/* Chess board frame */}
            <div className={frameClass} ref={frameRef}>
                {/* Evaluation bar on the left - same height as board */}
                {boardWidth && (
                    <div
                        className="board-frame__eval-wrapper"
                        style={{
                            height: boardWidth - 23,
                            width: evaluation ? 16 : 0,
                            marginRight: evaluation ? 8 : 0,
                            opacity: evaluation ? 1 : 0,
                        }}
                    >
                        {evaluation && (
                            <EvaluationBar
                                value={evaluation.score}
                                mate={evaluation.mate}
                            />
                        )}
                    </div>
                )}
                {boardWidth && (
                    <div>
                        <Chessboard
                            position={fen || 'start'}
                            arePiecesDraggable={false}
                            boardOrientation={orientation}
                            boardWidth={boardWidth - 23}
                            customBoardStyle={{
                                borderRadius: '12px',
                            }}
                            customDarkSquareStyle={{
                                backgroundColor: darkSquareColor
                            }}
                            customLightSquareStyle={{
                                backgroundColor: lightSquareColor
                            }}
                            customSquareStyles={{
                                ...parseIndicatorStyles(checkSquare, lastMove, mode),
                                ...legalMoveStyles,
                                ...(selected ? { [selected]: { backgroundColor: 'rgba(59, 130, 246, 0.5)' } } : {}),
                            }}
                            onSquareClick={onSquareClick}
                        />
                    </div>
                )}
            </div>

            {/* History navigation for live mode */}
            {showHistoryNav && (
                <div className="board-history-nav">
                    <button
                        className="board-nav-btn"
                        onClick={onHistoryStart}
                        disabled={!canGoBack}
                        title="Go to start"
                    >
                        <ChevronsLeftIcon />
                    </button>
                    <button
                        className="board-nav-btn"
                        onClick={onHistoryBack}
                        disabled={!canGoBack}
                        title="Previous move"
                    >
                        <ChevronLeftIcon />
                    </button>
                    <span className="board-history-indicator">
                        {historyIndex !== undefined ? historyIndex : 0} / {(historyLength ?? 1) - 1}
                    </span>
                    <button
                        className="board-nav-btn"
                        onClick={onHistoryForward}
                        disabled={!canGoForward}
                        title="Next move"
                    >
                        <ChevronRightIcon />
                    </button>
                    <button
                        className="board-nav-btn"
                        onClick={onHistoryEnd}
                        disabled={!canGoForward}
                        title="Go to latest"
                    >
                        <ChevronsRightIcon />
                    </button>
                </div>
            )}

            {/* Exploration/Analysis controls */}
            {showControls && (
                <div className="board-controls">
                    <button
                        className="board-control-btn"
                        onClick={onUndo}
                        disabled={!canUndo}
                        title="Undo"
                    >
                        <UndoIcon />
                        <span>Undo</span>
                    </button>
                    <button
                        className="board-control-btn"
                        onClick={onRedo}
                        disabled={!canRedo}
                        title="Redo"
                    >
                        <RedoIcon />
                        <span>Redo</span>
                    </button>
                    <button
                        className="board-control-btn"
                        onClick={onReset}
                        disabled={!canUndo}
                        title="Reset"
                    >
                        <ResetIcon />
                        <span>Reset</span>
                    </button>
                    {onExit && (
                        <button
                            className="board-control-btn board-control-btn--exit"
                            onClick={onExit}
                            title="Exit"
                        >
                            <ExitIcon />
                            <span>Exit</span>
                        </button>
                    )}
                </div>
            )}

            {/* Promotion modal */}
            {promotionOpen && (
                <div className="promotion-overlay" onClick={() => setPromotionOpen(false)}>
                    <div className="promotion-content" onClick={(e) => e.stopPropagation()}>
                        <div className="promotion-title">Promote Pawn</div>
                        <div className="promotion-pieces">
                            {['q', 'r', 'b', 'n'].map((p) => (
                                <button
                                    key={p}
                                    className="promotion-piece"
                                    onClick={() => handlePromotionPieceSelect(p as PieceSymbol)}
                                >
                                    <img
                                        src={`https://chessboardjs.com/img/chesspieces/wikipedia/${currentTurn === 'white' ? 'w' : 'b'}${p.toUpperCase()}.png`}
                                        alt={p}
                                    />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
