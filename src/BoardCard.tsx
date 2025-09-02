
import { Chessboard } from "react-chessboard";
import { LightCard } from "./LightCard";
import type { CustomSquareStyles, PromotionPieceOption } from "react-chessboard/dist/chessboard/types";
import { type Piece, type PieceSymbol, type Square } from "chess.js";
import { useState } from "react";
import { Box, Modal, Typography } from "@mui/material";

import { Chess } from "chess.js";

interface BoardCardProps {
    variant?: 'compact' | 'default';
    fen?: string;
    disabled?: boolean;
    player?: "white" | "black";
    checkField?: string;
    lastMove?: string;
    onMove?: (sourceSquare: Square, targetSquare: Square, promotionPiece?: PromotionPieceOption) => boolean;
    onPromotionPieceSelect?: (piece?: PromotionPieceOption, from?: Square, to?: Square) => boolean;
}

function parseIndicatorsSquares(checkField?: Square, lastMove?: string): CustomSquareStyles {
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
    const [target, setTarget] = useState<string | null>(null);
    const [promotionOpen, setPromotionOpen] = useState(false);

    const onSquareClick = (square: string, piece?: string) => {

        let game = new Chess(fen);
        let selectedPiece = selected ? game.get(selected as Square) : null;

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
                console.log("MOVING LAST RANK");
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
        let pieceOption = ((player === "white" ? 'w' : 'b') + piece.toUpperCase()) as PromotionPieceOption;
        onMove && onMove(selected as Square, (player === "white" ? target[0] + '8' : target[0] + '1') as Square, pieceOption);
        setTarget(null);
    };

    return (
        <div className={`${variant}`}>
            <LightCard >
                <Chessboard
                    position={fen || 'start'}
                    arePiecesDraggable={false}
                    boardOrientation={player === "black" ? "black" : "white"}
                    customBoardStyle={{
                        borderRadius: '15px',
                    }}
                    customSquareStyles={{
                        ...parseIndicatorsSquares(checkField as Square, lastMove),
                        ...(selected ? { [selected]: { backgroundColor: 'rgba(0, 0, 255, 0.3)' } } : {}),
                    }}
                    //onPieceDrop={ onDrop }
                    //onPromotionPieceSelect={onPromotionPieceSelect}
                    onSquareClick={onSquareClick}
                />
            </LightCard>
            <Modal
                open={promotionOpen}
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
                        Promote Pawn
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        {['q', 'r', 'b', 'n'].map((piece) => (
                            <Box
                                key={piece}
                                component="img"
                                src={`https://chessboardjs.com/img/chesspieces/wikipedia/${player === "white" ? 'w' : 'b'}${piece.toUpperCase()}.png`}
                                alt={piece}
                                sx={{
                                    width: 60,
                                    height: 60,
                                    cursor: 'pointer',
                                    border: '1px solid #000',
                                    borderRadius: 1,
                                }}
                                onClick={() => {
                                    setPromotionOpen(false);
                                    setSelected(null);
                                    handlePromotionPieceSelect(piece as PieceSymbol);
                                }}
                            />
                        ))}
                    </Box>
                   
                </Box>
            </Modal>
        </div>
    );
}