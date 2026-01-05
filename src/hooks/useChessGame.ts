import { useState, useCallback, useMemo } from 'react';
import { Chess } from 'chess.js';
import type { Square } from 'react-chessboard/dist/chessboard/types';

export interface UseChessGameOptions {
    initialFen?: string;
}

export interface ChessGameState {
    // Current state
    fen: string;
    turn: 'w' | 'b';
    isCheck: boolean;
    isCheckmate: boolean;
    isDraw: boolean;
    isGameOver: boolean;

    // Derived visuals
    checkSquare: Square | null;
    lastMove: { from: Square; to: Square } | null;

    // History management
    history: string[];          // Array of FENs (all positions)
    moveHistory: string[];      // Array of UCI moves
    historyIndex: number;       // Current position in history
    canUndo: boolean;
    canRedo: boolean;

    // Actions
    move: (from: Square, to: Square, promotion?: string) => boolean;
    undo: () => void;
    redo: () => void;
    reset: () => void;
    goToMove: (index: number) => void;
    setPosition: (fen: string) => void;

    // PGN
    pgn: string;
}

function getKingSquare(game: Chess, color: 'w' | 'b'): Square | null {
    const board = game.board();
    for (const row of board) {
        for (const piece of row) {
            if (piece && piece.type === 'k' && piece.color === color) {
                return piece.square;
            }
        }
    }
    return null;
}

function getCheckSquare(game: Chess): Square | null {
    if (!game.inCheck()) return null;
    return getKingSquare(game, game.turn());
}

export function useChessGame(options?: UseChessGameOptions): ChessGameState {
    const initialFen = options?.initialFen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

    // History state: array of FENs and corresponding UCI moves
    const [history, setHistory] = useState<string[]>([initialFen]);
    const [moveHistory, setMoveHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState(0);

    // Current FEN is derived from history and index
    const fen = history[historyIndex];

    // Create a Chess instance for the current position
    const game = useMemo(() => new Chess(fen), [fen]);

    // Derived state
    const turn = game.turn();
    const isCheck = game.inCheck();
    const isCheckmate = game.isCheckmate();
    const isDraw = game.isDraw();
    const isGameOver = game.isGameOver();
    const checkSquare = getCheckSquare(game);

    // Last move (if we're not at the start)
    const lastMove = useMemo(() => {
        if (historyIndex === 0) return null;
        const uci = moveHistory[historyIndex - 1];
        if (!uci) return null;
        return {
            from: uci.slice(0, 2) as Square,
            to: uci.slice(2, 4) as Square,
        };
    }, [historyIndex, moveHistory]);

    // Navigation flags
    const canUndo = historyIndex > 0;
    const canRedo = historyIndex < history.length - 1;

    // Make a move
    const move = useCallback((from: Square, to: Square, promotion?: string): boolean => {
        try {
            const tempGame = new Chess(fen);
            const result = tempGame.move({ from, to, promotion });

            if (!result) return false;

            const newFen = tempGame.fen();
            const uci = from + to + (promotion || '');

            // If we're not at the end of history, discard future moves
            const newHistory = history.slice(0, historyIndex + 1);
            const newMoveHistory = moveHistory.slice(0, historyIndex);

            setHistory([...newHistory, newFen]);
            setMoveHistory([...newMoveHistory, uci]);
            setHistoryIndex(historyIndex + 1);

            return true;
        } catch {
            return false;
        }
    }, [fen, history, historyIndex, moveHistory]);

    // Undo (go back one move)
    const undo = useCallback(() => {
        if (historyIndex > 0) {
            setHistoryIndex(historyIndex - 1);
        }
    }, [historyIndex]);

    // Redo (go forward one move)
    const redo = useCallback(() => {
        if (historyIndex < history.length - 1) {
            setHistoryIndex(historyIndex + 1);
        }
    }, [historyIndex, history.length]);

    // Reset to initial position
    const reset = useCallback(() => {
        setHistoryIndex(0);
    }, []);

    // Jump to specific move
    const goToMove = useCallback((index: number) => {
        if (index >= 0 && index < history.length) {
            setHistoryIndex(index);
        }
    }, [history.length]);

    // Set a new position (resets history)
    const setPosition = useCallback((newFen: string) => {
        setHistory([newFen]);
        setMoveHistory([]);
        setHistoryIndex(0);
    }, []);

    // Generate PGN from move history
    const pgn = useMemo(() => {
        const pgnGame = new Chess();
        for (const uci of moveHistory.slice(0, historyIndex)) {
            const from = uci.slice(0, 2);
            const to = uci.slice(2, 4);
            const promo = uci[4];
            try {
                pgnGame.move({ from, to, promotion: promo });
            } catch {
                break;
            }
        }
        return pgnGame.pgn();
    }, [moveHistory, historyIndex]);

    return {
        fen,
        turn,
        isCheck,
        isCheckmate,
        isDraw,
        isGameOver,
        checkSquare,
        lastMove,
        history,
        moveHistory,
        historyIndex,
        canUndo,
        canRedo,
        move,
        undo,
        redo,
        reset,
        goToMove,
        setPosition,
        pgn,
    };
}
