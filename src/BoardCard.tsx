
import { Chessboard } from "react-chessboard";
import { LightCard } from "./LightCard";
import type { CustomSquareStyles, PromotionPieceOption } from "react-chessboard/dist/chessboard/types";
import type { Square } from "chess.js";

interface BoardCardProps {
    variant?: 'compact' | 'default';
    fen?: string;
    disabled?: boolean;
    player?: "white" | "black";
    checkField?: string;
    lastMove?: string;
    onDrop?: (sourceSquare: Square, targetSquare: Square) => boolean;
    onPromotionPieceSelect?: (piece?: PromotionPieceOption, from?: Square, to?: Square) => boolean;
}

function parseIndicatorsSquares(checkField?: Square, lastMove?: string): CustomSquareStyles{
    var styles: CustomSquareStyles = {};
    if (checkField) {
        styles[checkField] = { backgroundColor: 'rgba(255, 0, 0, 0.5)' };
    }
    if (lastMove) {
        styles[lastMove.substring(0, 2) as Square] = { backgroundColor: 'rgba(0, 255, 0, 0.3)' };
        styles[lastMove.substring(2, 4) as Square] = { backgroundColor: 'rgba(0, 255, 0, 0.3)' };
    }
    return styles;
}

export function BoardCard({ variant, fen, disabled, player, checkField, lastMove, onDrop, onPromotionPieceSelect }: BoardCardProps) {

    return (
        <div className={`${variant}`}>
            <LightCard >
                <Chessboard
                    position={fen || 'start'}
                    arePiecesDraggable={ !disabled }
                    boardOrientation={player === "black" ? "black" : "white"}
                    customBoardStyle={{
                        borderRadius: '15px',
                    }}
                    customSquareStyles={parseIndicatorsSquares(checkField as Square, lastMove)}
                    onPieceDrop={ onDrop }
                    onPromotionPieceSelect={onPromotionPieceSelect}
                />
            </LightCard>
        </div>
    );
}