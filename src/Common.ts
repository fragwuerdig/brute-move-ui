import type { ChainInfo } from "@goblinhunt/cosmes/wallet";
import { Chess } from 'chess.js';

const REBEL_FACTORY = 'terra1epal6ev4pas762cun685kh36qdtd9u9um0yd3u0r22x39u43dhessteue6';
const REBEL_LEADERBOARD = 'terra1lshuhtqfh25zlalgm9zy529vvpdljp9kdmzsx6t9wn64766aqq3s5ttfyh';
const REBEL_GAMEDB = 'terra183e9ul80dss0q708vwzjr364sm39elcuuyduld7fnry8t8n4vr9sr7x87m';
const REBEL_NAMESERVICE = 'terra1c3ws7g7uw3njju7jyj04qq80zdw4zzdu0rclmuce7feg37pnzhsqcfphl6';

const COLUMBUS_FACTORY = 'terra1y9xqqe7tfekmjvumt5d5guapvrged0dq0e0v9z7afm80z4wpkujqszy3cw';
const COLUMBUS_LEADERBOARD = 'terra1ej2fmakaq24qxh3fttxn3uma9l3j0y9elyp85ecft2rktpejvtgsyau2mj';
const COLUMBUS_GAMEDB = 'terra1tuae4mshuu3fna25j25k4anyv9dz7qcyqntlmvd9ewprztq5m0hsd6erl9';
const COLUMBUS_NAMESERVICE = 'terra1xttfedej46ajg63ruvgfx2trpqxpq542tzpedmc5kauv87kds80sy68qpk';

export function addressEllipsis(address: string): string {
  const parts = address.split('1');
  if (parts.length !== 2 || parts[1].length < 8) return address;
  //let str = `terra1${parts[1].slice(0, 4)}...${parts[1].slice(-5, -1)}`;
  return `terra1...${parts[1].slice(-5)}`
}

export function fetchContractStateSmart(gameAddress: string, query: any, chain: ChainInfo<string>): Promise<any> {

  let queryBase64 = btoa(JSON.stringify(query));
  let url = `${getLcdUrl(chain)}/cosmwasm/wasm/v1/contract/${gameAddress}/smart/${queryBase64}`;
  return fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  }).then(response => response.json())
    .then(data => data.data)
    .catch(error => {
      console.error("Error fetching contract state:", error);
      throw error;
    });

}

export function fetchBankBalance(address: string, denom: string, chain: ChainInfo<string>): Promise<any> {

  let url = `${getLcdUrl(chain)}/cosmos/bank/v1beta1/spendable_balances/${address}/by_denom?denom=${denom}`;
  return fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  }).then(response => {  return response.json(); })
    .then(data => { return data.balance; })
    .then(data => data.amount/1000000)
    .catch(error => {
      console.error("Error fetching bank balance:", error);
      throw error;
    });

}

export function getFactoryAddr(chain: ChainInfo<string>) {

  if ( chain.chainId === 'rebel-2' ) {
    return REBEL_FACTORY;
  } else if ( chain.chainId === 'columbus-5') {
    return COLUMBUS_FACTORY;
  }

  throw new Error

}

export function getLeaderboardAddr(chain: ChainInfo<string>) {

  if ( chain.chainId === 'rebel-2' ) {
    return REBEL_LEADERBOARD;
  } else if ( chain.chainId === 'columbus-5') {
    return COLUMBUS_LEADERBOARD;
  }

  throw new Error

}

export function getGameDbAddr(chain: ChainInfo<string>) {

  if ( chain.chainId === 'rebel-2' ) {
    return REBEL_GAMEDB;
  }
  else if ( chain.chainId === 'columbus-5') {
    return COLUMBUS_GAMEDB;
  }

  throw new Error

}

export function getNameServiceAddr(chain: ChainInfo<string>) {

  if ( chain.chainId === 'rebel-2' ) {
    return REBEL_NAMESERVICE;
  }
  else if ( chain.chainId === 'columbus-5') {
    return COLUMBUS_NAMESERVICE;
  }

  throw new Error

}

export function getRpcUrl(chain: ChainInfo<string>) {

  if ( chain.chainId === 'rebel-2' ) {
    return 'https://rebel-rpc.luncgoblins.com';
  } else if ( chain.chainId === 'columbus-5') {
    return 'https://tc-rpc.luncgoblins.com';
  }

  throw new Error
  
}

export function getLcdUrl(chain: ChainInfo<string>) {

  if ( chain.chainId === 'rebel-2' ) {
    return 'https://rebel-lcd.luncgoblins.com';
  } else if ( chain.chainId === 'columbus-5') {
    return 'https://tc-lcd.luncgoblins.com';
  }

  throw new Error
  
}

export interface GameInfo {
  board: string;
  players: string[];
  turn: "black" | "white";
  is_finished: boolean;
  winner: string;
  no_show: boolean;
  timeout: boolean;
  fullmoves: number;
  created: number;
  last_move_time: number;
  move_timeout: number; // in seconds
  game_start_timeout: number; // in seconds
  open_draw_offer: string | null;
}

export interface JoinableGame {
  id: string;
  opponent_color: "Black" | "White" | null,
  opponent: string,
  recipient: string | null,
  create_time: number,
  bet: number,
  fee: number,
  contract?: string,
}

export interface PgnOptions {
  white?: string;  // White player name or address
  black?: string;  // Black player name or address
  event?: string;
  site?: string;
  date?: string;
  result?: string;
}

// Convert a single UCI move to SAN given a FEN position
export function uciToSan(fen: string, uci: string): string {
  try {
    const chess = new Chess(fen);
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promotion = uci.length > 4 ? uci[4] : undefined;
    const move = chess.move({ from, to, promotion });
    return move ? move.san : uci;
  } catch {
    return uci;
  }
}

// Convert multiple UCI moves to SAN starting from a FEN position
export function uciLinesToSan(fen: string, uciMoves: string[], maxMoves?: number): string[] {
  const result: string[] = [];
  try {
    const chess = new Chess(fen);
    const limit = maxMoves ?? uciMoves.length;

    for (let i = 0; i < Math.min(uciMoves.length, limit); i++) {
      const uci = uciMoves[i];
      const from = uci.slice(0, 2);
      const to = uci.slice(2, 4);
      const promotion = uci.length > 4 ? uci[4] : undefined;
      const move = chess.move({ from, to, promotion });
      if (move) {
        result.push(move.san);
      } else {
        break;
      }
    }
  } catch {
    // Return what we have so far
  }
  return result;
}

// Format a line of SAN moves with move numbers
export function formatSanLine(fen: string, sanMoves: string[]): string {
  if (sanMoves.length === 0) return '';

  // Get starting move number and side from FEN
  const parts = fen.split(' ');
  const sideToMove = parts[1] || 'w';
  const fullMoveNumber = parseInt(parts[5] || '1');

  let result = '';
  let moveNum = fullMoveNumber;
  let isWhiteToMove = sideToMove === 'w';

  for (let i = 0; i < sanMoves.length; i++) {
    if (isWhiteToMove) {
      result += `${moveNum}. ${sanMoves[i]} `;
    } else {
      if (i === 0) {
        // First move is black, show "1... Nf6" format
        result += `${moveNum}... ${sanMoves[i]} `;
      } else {
        result += `${sanMoves[i]} `;
      }
      moveNum++;
    }
    isWhiteToMove = !isWhiteToMove;
  }

  return result.trim();
}

// Convert UCI move history to PGN format
export function uciToPgn(uciMoves: string[], options?: PgnOptions): string {
  const chess = new Chess();

  for (const uci of uciMoves) {
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promotion = uci.length > 4 ? uci[4] : undefined;

    chess.move({ from, to, promotion });
  }

  // Build PGN headers
  const headers: string[] = [];
  headers.push(`[Event "${options?.event || 'Brute Move Game'}"]`);
  headers.push(`[Site "${options?.site || 'https://brutemove.com'}"]`);
  headers.push(`[Date "${options?.date || new Date().toISOString().split('T')[0].replace(/-/g, '.')}"]`);
  headers.push(`[White "${options?.white || '?'}"]`);
  headers.push(`[Black "${options?.black || '?'}"]`);
  headers.push(`[Result "${options?.result || '*'}"]`);

  // Get move text from chess.js
  const moveText = chess.pgn({ maxWidth: 80 });
  // chess.pgn() may include headers, so extract just the moves
  const movesOnly = moveText.replace(/\[[^\]]*\]\s*/g, '').trim();

  return headers.join('\n') + '\n\n' + movesOnly;
}

// Piece types for captured pieces calculation
export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q';

export interface CapturedPieces {
  white: Record<PieceType, number>;  // Pieces captured BY white (i.e., black pieces lost)
  black: Record<PieceType, number>;  // Pieces captured BY black (i.e., white pieces lost)
}

// Initial piece counts per side (excluding king)
const INITIAL_PIECES: Record<PieceType, number> = {
  p: 8,
  n: 2,
  b: 2,
  r: 2,
  q: 1,
};

/**
 * Count promotions from UCI move history for each color.
 * White moves are at even indices (0, 2, 4...), black at odd indices (1, 3, 5...).
 * A promotion move has 5 characters, e.g., "e7e8q" where the 5th char is the promoted piece.
 */
function countPromotions(uciMoves: string[]): {
  white: Record<PieceType, number>;
  black: Record<PieceType, number>;
} {
  const result = {
    white: { p: 0, n: 0, b: 0, r: 0, q: 0 },
    black: { p: 0, n: 0, b: 0, r: 0, q: 0 },
  };

  for (let i = 0; i < uciMoves.length; i++) {
    const move = uciMoves[i];
    if (move.length === 5) {
      const promotedTo = move[4].toLowerCase() as PieceType;
      if (promotedTo in result.white) {
        const side = i % 2 === 0 ? 'white' : 'black';
        result[side][promotedTo]++;
      }
    }
  }

  return result;
}

/**
 * Count pieces on board from FEN for each color.
 */
function countPiecesOnBoard(fen: string): {
  white: Record<PieceType, number>;
  black: Record<PieceType, number>;
} {
  const result = {
    white: { p: 0, n: 0, b: 0, r: 0, q: 0 },
    black: { p: 0, n: 0, b: 0, r: 0, q: 0 },
  };

  // Extract board part of FEN (before first space)
  const board = fen.split(' ')[0];

  for (const char of board) {
    if (char === '/' || /\d/.test(char)) continue;

    const piece = char.toLowerCase() as PieceType;
    if (piece in result.white) {
      const side = char === char.toUpperCase() ? 'white' : 'black';
      result[side][piece]++;
    }
  }

  return result;
}

/**
 * Calculate captured pieces for each side based on current FEN and move history.
 * 
 * The algorithm:
 * - captured = initial + promoted_to_this_piece - current_on_board
 * - Pawns are special: they can only be captured, not promoted TO
 *   so captured_pawns = initial(8) - current - promotions_made
 * 
 * @param fen Current board position in FEN format
 * @param uciMoves Move history in UCI format (e.g., ["e2e4", "e7e5", ...])
 * @returns Captured pieces for each side
 */
export function getCapturedPieces(fen: string, uciMoves: string[]): CapturedPieces {
  const promotions = countPromotions(uciMoves);
  const onBoard = countPiecesOnBoard(fen);

  const captured: CapturedPieces = {
    white: { p: 0, n: 0, b: 0, r: 0, q: 0 },
    black: { p: 0, n: 0, b: 0, r: 0, q: 0 },
  };

  // White captures black pieces, black captures white pieces
  for (const piece of ['n', 'b', 'r', 'q'] as PieceType[]) {
    // Black pieces captured by white = initial black + black promotions to piece - current black
    captured.white[piece] = INITIAL_PIECES[piece] + promotions.black[piece] - onBoard.black[piece];
    // White pieces captured by black = initial white + white promotions to piece - current white
    captured.black[piece] = INITIAL_PIECES[piece] + promotions.white[piece] - onBoard.white[piece];
  }

  // Pawns: captured = initial - current - promotions_made (promotions consume pawns)
  const whitePawnPromotions = promotions.white.n + promotions.white.b + promotions.white.r + promotions.white.q;
  const blackPawnPromotions = promotions.black.n + promotions.black.b + promotions.black.r + promotions.black.q;

  // Black pawns captured by white
  captured.white.p = INITIAL_PIECES.p - onBoard.black.p - blackPawnPromotions;
  // White pawns captured by black
  captured.black.p = INITIAL_PIECES.p - onBoard.white.p - whitePawnPromotions;

  // Clamp to 0 (shouldn't be negative, but just in case)
  for (const side of ['white', 'black'] as const) {
    for (const piece of ['p', 'n', 'b', 'r', 'q'] as PieceType[]) {
      captured[side][piece] = Math.max(0, captured[side][piece]);
    }
  }

  return captured;
}