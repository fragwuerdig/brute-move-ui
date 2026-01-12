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