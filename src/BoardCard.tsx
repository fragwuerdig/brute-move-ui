import { Chessboard } from "react-chessboard";
import type { CustomSquareStyles, PromotionPieceOption } from "react-chessboard/dist/chessboard/types";
import { type PieceSymbol, type Square, Chess } from "chess.js";
import { useState, useRef, useEffect } from "react";
import './BoardCard.css';

interface BoardCardProps {
    variant?: 'compact' | 'default';
    fen?: string;
    disabled?: boolean;
    player?: "white" | "black";
    checkField?: string;
    lastMove?: string;
    onMove?: (sourceSquare: Square, targetSquare: Square, promotionPiece?: PromotionPieceOption) => boolean;
}

function parseIndicatorsSquares(checkField?: Square, lastMove?: string): CustomSquareStyles {
    const styles: CustomSquareStyles = {};
    if (checkField) {
        styles[checkField] = { backgroundColor: 'rgba(239, 68, 68, 0.6)' };
    }
    if (lastMove) {
        styles[lastMove.substring(0, 2) as Square] = { backgroundColor: 'rgba(247, 179, 43, 0.35)' };
        styles[lastMove.substring(2, 4) as Square] = { backgroundColor: 'rgba(247, 179, 43, 0.35)' };
    }
    return styles;
}

export function BoardCard({ fen, disabled, player, checkField, lastMove, onMove }: BoardCardProps) {
    const [selected, setSelected] = useState<string | null>(null);
    const [target, setTarget] = useState<string | null>(null);
    const [promotionOpen, setPromotionOpen] = useState(false);
    const frameRef = useRef<HTMLDivElement>(null);
    const [boardWidth, setBoardWidth] = useState<number | undefined>(undefined);

    useEffect(() => {
        const updateWidth = () => {
            const frame = frameRef.current;
            if (frame) {
                // Get the computed content width (excluding padding/border)
                const style = getComputedStyle(frame);
                const paddingLeft = parseFloat(style.paddingLeft);
                const paddingRight = parseFloat(style.paddingRight);
                const borderLeft = parseFloat(style.borderLeftWidth);
                const borderRight = parseFloat(style.borderRightWidth);
                const contentWidth = frame.offsetWidth - paddingLeft - paddingRight - borderLeft - borderRight;

                if (contentWidth > 0 && contentWidth !== boardWidth) {
                    setBoardWidth(contentWidth);
                }
            }
        };

        const frame = frameRef.current;
        if (frame) {
            const resizeObserver = new ResizeObserver(updateWidth);
            resizeObserver.observe(frame);
            // Initial calculation
            updateWidth();
            return () => resizeObserver.disconnect();
        }
    }, [boardWidth]);

    const onSquareClick = (square: string, piece?: string) => {
        const game = new Chess(fen);
        const selectedPiece = selected ? game.get(selected as Square) : null;

        if (disabled) return;

        // Second tap: move or unselect
        if (selected) {
            // if selected is pawn that moves to last rank, trigger promotion
            if (
                (
                    (player === "white" && selected[1] === '7' && square[1] === '8' && selectedPiece?.type === 'p') ||
                    (player === "black" && selected[1] === '2' && square[1] === '1' && selectedPiece?.type === 'p')
                )
            ) {
                setPromotionOpen(true);
                setTarget(square);
                return;
            }

            if (piece && piece[0] === (player === "white" ? 'w' : 'b')) {
                setSelected(square);
                return;
            }

            setSelected(null);
            if (onMove) {
                onMove(selected as Square, square as Square);
            }
            return;
        }

        // First tap: only select a piece of the side to move
        if (piece) {
            if ((player === "white" && piece[0] !== 'w') || (player === "black" && piece[0] !== 'b')) {
                return;
            }
            setSelected(square);
        }
    };

    const handlePromotionPieceSelect = (piece?: PieceSymbol) => {
        setPromotionOpen(false);
        if (!piece || !selected || !target) {
            return;
        }
        const pieceOption = ((player === "white" ? 'w' : 'b') + piece.toUpperCase()) as PromotionPieceOption;
        onMove && onMove(selected as Square, (player === "white" ? target[0] + '8' : target[0] + '1') as Square, pieceOption);
        setTarget(null);
        setSelected(null);
    };

    const frameClass = `board-frame ${!disabled ? 'board-frame--active' : ''} ${disabled ? 'board-frame--disabled' : ''}`;

    return (
        <div className="board-container">
            <div className={frameClass} ref={frameRef}>
                {boardWidth && (
                <Chessboard
                    position={fen || 'start'}
                    arePiecesDraggable={false}
                    boardOrientation={player === "black" ? "black" : "white"}
                    boardWidth={boardWidth}
                    customBoardStyle={{
                        borderRadius: '12px',
                    }}
                    customDarkSquareStyle={{
                        backgroundColor: '#7b8bab'
                    }}
                    customLightSquareStyle={{
                        backgroundColor: '#b7c0d8'
                    }}
                    customSquareStyles={{
                        ...parseIndicatorsSquares(checkField as Square, lastMove),
                        ...(selected ? { [selected]: { backgroundColor: 'rgba(59, 130, 246, 0.5)' } } : {}),
                    }}
                    onSquareClick={onSquareClick}
                />
                )}
            </div>

            {/* Custom Promotion Modal */}
            {promotionOpen && (
                <div className="promotion-overlay" onClick={() => setPromotionOpen(false)}>
                    <div className="promotion-content" onClick={(e) => e.stopPropagation()}>
                        <div className="promotion-title">Promote Pawn</div>
                        <div className="promotion-pieces">
                            {['q', 'r', 'b', 'n'].map((piece) => (
                                <button
                                    key={piece}
                                    className="promotion-piece"
                                    onClick={() => handlePromotionPieceSelect(piece as PieceSymbol)}
                                >
                                    <img
                                        src={`https://chessboardjs.com/img/chesspieces/wikipedia/${player === "white" ? 'w' : 'b'}${piece.toUpperCase()}.png`}
                                        alt={piece}
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
