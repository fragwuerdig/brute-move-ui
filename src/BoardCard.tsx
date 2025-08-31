
import { Chessboard } from "react-chessboard";
import { LightCard } from "./LightCard";
import type { CustomSquareStyles, PromotionPieceOption } from "react-chessboard/dist/chessboard/types";
import { type Square } from "chess.js";
import { useState } from "react";

interface BoardCardProps {
    variant?: 'compact' | 'default';
    fen?: string;
    disabled?: boolean;
    player?: "white" | "black";
    checkField?: string;
    lastMove?: string;
    onMove?: (sourceSquare: Square, targetSquare: Square) => boolean;
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

export function BoardCard({ variant, fen, disabled, player, checkField, lastMove, onMove, onPromotionPieceSelect }: BoardCardProps) {

    const [selected, setSelected] = useState<string | null>(null);

    const onSquareClick = (square: string, piece?: string) => {

        if (disabled) return;

        console.log("Clicked square:", square, "piece:", piece, "selected:", selected);
    
        // Second tap: move or unselect
        if (selected) {
            if (piece) {
                setSelected(square);
                return;
            }
            setSelected(null);
            if (onMove) {
                console.log("Attempting move from", selected, "to", square);
                onMove(selected as Square, square as Square);
            }
            return;
        }

        // First tap: only select a piece of the side to move
        if (piece) {
            setSelected(square);
        }
    };

    return (
        <div className={`${variant}`}>
            <LightCard >
                <Chessboard
                    position={fen || 'start'}
                    arePiecesDraggable={ false }
                    boardOrientation={player === "black" ? "black" : "white"}
                    customBoardStyle={{
                        borderRadius: '15px',
                    }}
                    customSquareStyles={{
                        ...parseIndicatorsSquares(checkField as Square, lastMove),
                        ...(selected ? { [selected]: { backgroundColor: 'rgba(0, 0, 255, 0.3)' } } : {}),
                    }}
                    //onPieceDrop={ onDrop }
                    onPromotionPieceSelect={onPromotionPieceSelect}
                    onSquareClick={ onSquareClick }
                />
            </LightCard>
        </div>
    );
}