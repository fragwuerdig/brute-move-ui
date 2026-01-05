import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Chess } from 'chess.js';
import { MsgExecuteContract } from '@goblinhunt/cosmes/client';
import type { UnsignedTx } from '@goblinhunt/cosmes/wallet';
import { useWallet } from '../WalletProvider';
import { fetchContractStateSmart, type GameInfo } from '../Common';
import type { Square } from 'react-chessboard/dist/chessboard/types';

export interface UseOnChainGameOptions {
    gameAddress: string;
}

export interface OnChainGameState {
    // Raw state
    gameInfo: GameInfo | null;
    isLoading: boolean;
    error: Error | null;

    // Current position (respects history navigation)
    fen: string;
    lastMove: { from: Square; to: Square } | null;
    checkSquare: Square | null;

    // Player info
    isMyTurn: boolean;
    myColor: 'white' | 'black' | null;
    canPlay: boolean;
    timeLeft: { type: 'no-show' | 'turn'; seconds: number };

    // Optimistic update state
    isPostingMove: boolean;
    pendingMove: string | null;
    pendingFen: string | null;

    // On-chain history
    history: string[];              // UCI moves from contract
    historyFens: string[];          // Computed FENs for each position
    historyIndex: number;           // Current viewing position
    isViewingHistory: boolean;      // historyIndex < historyFens.length - 1

    // Draw offer
    hasOpenDrawOffer: boolean;      // Opponent offered draw

    // History navigation
    goToMove: (index: number) => void;
    goToStart: () => void;
    goToLatest: () => void;
    goBack: () => void;
    goForward: () => void;

    // Actions
    postMove: (uci: string, offerDraw?: boolean) => Promise<void>;
    resign: () => Promise<void>;
    acceptDraw: () => Promise<void>;
    claimTimeout: () => Promise<void>;
    claimReward: () => Promise<void>;

    // Refresh
    refresh: () => void;
    refreshHistory: () => Promise<string[]>;
}

// Helper: compute FENs from UCI move history
function computeHistoryFens(moves: string[]): string[] {
    const game = new Chess();
    const fens = [game.fen()];

    for (const uci of moves) {
        try {
            const from = uci.slice(0, 2);
            const to = uci.slice(2, 4);
            const promo = uci[4];
            game.move({ from, to, promotion: promo });
            fens.push(game.fen());
        } catch {
            // Invalid move, stop processing
            break;
        }
    }

    return fens;
}

// Helper: get king square for check indication
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

// Helper: get check square
function getCheckSquare(fen: string): Square | null {
    try {
        const game = new Chess(fen);
        if (!game.inCheck()) return null;
        return getKingSquare(game, game.turn());
    } catch {
        return null;
    }
}

// Helper: calculate time left
function calculateTimeLeft(gameInfo: GameInfo | null): { type: 'no-show' | 'turn'; seconds: number } {
    if (!gameInfo) return { type: 'turn', seconds: 0 };
    if (gameInfo.is_finished || gameInfo.no_show || gameInfo.timeout) {
        return { type: 'turn', seconds: 0 };
    }

    const now = Math.floor(Date.now() / 1000);

    if (gameInfo.fullmoves === 0 || gameInfo.fullmoves === 1) {
        const seconds = gameInfo.game_start_timeout + gameInfo.created - now;
        return { type: 'no-show', seconds: Math.max(0, seconds) };
    } else {
        const seconds = gameInfo.move_timeout + gameInfo.last_move_time - now;
        return { type: 'turn', seconds: Math.max(0, seconds) };
    }
}

export function useOnChainGame({ gameAddress }: UseOnChainGameOptions): OnChainGameState {
    const { chain, connectedAddr, broadcast } = useWallet();

    // Core state
    const [gameInfo, setGameInfo] = useState<GameInfo | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    // History state
    const [history, setHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState(0);

    // Optimistic update state
    const [isPostingMove, setIsPostingMove] = useState(false);
    const [pendingMove, setPendingMove] = useState<string | null>(null);
    const [pendingFen, setPendingFen] = useState<string | null>(null);

    // Polling control
    const [reloadTrigger, setReloadTrigger] = useState(0);
    const pollingEnabled = useRef(true);

    // Computed FENs from history
    const historyFens = useMemo(() => computeHistoryFens(history), [history]);

    // Current FEN (respects history navigation and pending state)
    const currentFen = useMemo(() => {
        if (pendingFen) return pendingFen;
        if (historyFens.length > 0 && historyIndex < historyFens.length) {
            return historyFens[historyIndex];
        }
        return gameInfo?.board || 'start';
    }, [pendingFen, historyFens, historyIndex, gameInfo?.board]);

    // Last move
    const lastMove = useMemo(() => {
        if (pendingMove) {
            return {
                from: pendingMove.slice(0, 2) as Square,
                to: pendingMove.slice(2, 4) as Square,
            };
        }
        if (historyIndex > 0 && history[historyIndex - 1]) {
            const uci = history[historyIndex - 1];
            return {
                from: uci.slice(0, 2) as Square,
                to: uci.slice(2, 4) as Square,
            };
        }
        return null;
    }, [pendingMove, historyIndex, history]);

    // Check square
    const checkSquare = useMemo(() => getCheckSquare(currentFen), [currentFen]);

    // Player color
    const myColor = useMemo(() => {
        if (!gameInfo || !connectedAddr) return null;
        if (gameInfo.players[0] === connectedAddr) return 'white';
        if (gameInfo.players[1] === connectedAddr) return 'black';
        return null;
    }, [gameInfo, connectedAddr]);

    // Is it my turn?
    const isMyTurn = useMemo(() => {
        if (!gameInfo || !connectedAddr) return false;
        const currentTurnColor = gameInfo.turn;
        return (currentTurnColor === 'white' && myColor === 'white') ||
            (currentTurnColor === 'black' && myColor === 'black');
    }, [gameInfo, connectedAddr, myColor]);

    // Can I play? (my turn, not finished, viewing latest position)
    const isViewingHistory = historyFens.length > 0 && historyIndex < historyFens.length - 1;

    const canPlay = useMemo(() => {
        if (!gameInfo || !connectedAddr) return false;
        if (gameInfo.is_finished) return false;
        if (gameInfo.no_show || gameInfo.timeout) return false;
        if (!isMyTurn) return false;
        if (isViewingHistory) return false;
        if (isPostingMove) return false;
        return true;
    }, [gameInfo, connectedAddr, isMyTurn, isViewingHistory, isPostingMove]);

    // Time left
    const timeLeft = useMemo(() => calculateTimeLeft(gameInfo), [gameInfo]);

    // Draw offer from opponent
    const hasOpenDrawOffer = useMemo(() => {
        if (!gameInfo || !connectedAddr) return false;
        return gameInfo.open_draw_offer !== null && gameInfo.open_draw_offer !== connectedAddr;
    }, [gameInfo, connectedAddr]);

    // Refresh function
    const refresh = useCallback(() => {
        setReloadTrigger(prev => prev + 1);
    }, []);

    // Fetch history from contract
    const refreshHistory = useCallback(async (): Promise<string[]> => {
        try {
            const moves = await fetchContractStateSmart(gameAddress, { history: {} }, chain);
            const uciMoves = Array.isArray(moves) ? moves : [];
            setHistory(uciMoves);
            // Jump to latest position when history updates
            setHistoryIndex(uciMoves.length);
            return uciMoves;
        } catch (e) {
            console.error('Error fetching history:', e);
            return [];
        }
    }, [gameAddress, chain]);

    // Poll game info
    useEffect(() => {
        let mounted = true;

        const fetchGameInfo = async () => {
            try {
                const data = await fetchContractStateSmart(gameAddress, { game_info: {} }, chain);
                if (!mounted) return;

                if (data && data.board) {
                    setGameInfo(data);
                    setError(null);
                }
            } catch (e) {
                if (mounted) {
                    setError(e as Error);
                }
            } finally {
                if (mounted) {
                    setIsLoading(false);
                }
            }
        };

        fetchGameInfo();

        // Set up polling
        const pollInterval = setInterval(() => {
            if (pollingEnabled.current) {
                fetchGameInfo();
            }
        }, 5000);

        return () => {
            mounted = false;
            clearInterval(pollInterval);
        };
    }, [gameAddress, chain, reloadTrigger]);

    // Fetch history on mount and when game info changes
    useEffect(() => {
        if (gameInfo) {
            refreshHistory();
        }
    }, [gameInfo?.fullmoves, refreshHistory]);

    // History navigation
    const goToMove = useCallback((index: number) => {
        if (index >= 0 && index < historyFens.length) {
            setHistoryIndex(index);
        }
    }, [historyFens.length]);

    const goToStart = useCallback(() => {
        setHistoryIndex(0);
    }, []);

    const goToLatest = useCallback(() => {
        setHistoryIndex(historyFens.length - 1);
    }, [historyFens.length]);

    const goBack = useCallback(() => {
        if (historyIndex > 0) {
            setHistoryIndex(historyIndex - 1);
        }
    }, [historyIndex]);

    const goForward = useCallback(() => {
        if (historyIndex < historyFens.length - 1) {
            setHistoryIndex(historyIndex + 1);
        }
    }, [historyIndex, historyFens.length]);

    // Post move to blockchain
    const postMove = useCallback(async (uci: string, offerDraw = false) => {
        if (!connectedAddr || !gameInfo) {
            throw new Error('Not connected or no game info');
        }

        // Disable polling during move
        pollingEnabled.current = false;
        setIsPostingMove(true);
        setPendingMove(uci);

        // Calculate optimistic FEN
        try {
            const game = new Chess(gameInfo.board);
            const from = uci.slice(0, 2);
            const to = uci.slice(2, 4);
            const promo = uci[4];
            game.move({ from, to, promotion: promo });
            setPendingFen(game.fen());
        } catch {
            // Invalid move locally, but try anyway
        }

        try {
            const msg = { move: { uci, offer_draw: offerDraw } };
            const tx: UnsignedTx = {
                msgs: [
                    new MsgExecuteContract({
                        sender: connectedAddr,
                        contract: gameAddress,
                        funds: [],
                        msg,
                    }),
                ],
            };

            await broadcast(tx);

            // Wait for history to update before clearing pending state
            await refreshHistory();
            setPendingMove(null);
            setPendingFen(null);
        } catch (e) {
            // Rollback optimistic update
            setPendingMove(null);
            setPendingFen(null);
            throw e;
        } finally {
            setIsPostingMove(false);
            pollingEnabled.current = true;
        }
    }, [connectedAddr, gameInfo, gameAddress, broadcast, refreshHistory]);

    // Resign
    const resign = useCallback(async () => {
        if (!connectedAddr || !gameInfo) {
            throw new Error('Not connected or no game info');
        }

        const msg = { give_up: {} };
        const tx: UnsignedTx = {
            msgs: [
                new MsgExecuteContract({
                    sender: connectedAddr,
                    contract: gameAddress,
                    funds: [],
                    msg,
                }),
            ],
        };

        await broadcast(tx);
        refresh();
    }, [connectedAddr, gameInfo, gameAddress, broadcast, refresh]);

    // Accept draw
    const acceptDraw = useCallback(async () => {
        if (!connectedAddr || !gameInfo) {
            throw new Error('Not connected or no game info');
        }

        const msg = { claim_draw: {} };
        const tx: UnsignedTx = {
            msgs: [
                new MsgExecuteContract({
                    sender: connectedAddr,
                    contract: gameAddress,
                    funds: [],
                    msg,
                }),
            ],
        };

        await broadcast(tx);
        refresh();
    }, [connectedAddr, gameInfo, gameAddress, broadcast, refresh]);

    // Claim timeout (settle)
    const claimTimeout = useCallback(async () => {
        if (!connectedAddr) {
            throw new Error('Not connected');
        }

        const msg = { settle: {} };
        const tx: UnsignedTx = {
            msgs: [
                new MsgExecuteContract({
                    sender: connectedAddr,
                    contract: gameAddress,
                    funds: [],
                    msg,
                }),
            ],
        };

        await broadcast(tx);
        refresh();
    }, [connectedAddr, gameAddress, broadcast, refresh]);

    // Claim reward
    const claimReward = useCallback(async () => {
        if (!connectedAddr) {
            throw new Error('Not connected');
        }

        const msg = { claim_balance: {} };
        const tx: UnsignedTx = {
            msgs: [
                new MsgExecuteContract({
                    sender: connectedAddr,
                    contract: gameAddress,
                    funds: [],
                    msg,
                }),
            ],
        };

        await broadcast(tx);
        refresh();
    }, [connectedAddr, gameAddress, broadcast, refresh]);

    return {
        gameInfo,
        isLoading,
        error,

        fen: currentFen,
        lastMove,
        checkSquare,

        isMyTurn,
        myColor,
        canPlay,
        timeLeft,

        isPostingMove,
        pendingMove,
        pendingFen,

        history,
        historyFens,
        historyIndex,
        isViewingHistory,

        hasOpenDrawOffer,

        goToMove,
        goToStart,
        goToLatest,
        goBack,
        goForward,

        postMove,
        resign,
        acceptDraw,
        claimTimeout,
        claimReward,

        refresh,
        refreshHistory,
    };
}
