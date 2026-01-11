// Engine evaluation result
export interface EngineEvaluation {
  depth: number;
  score: number;           // In centipawns (100 = 1 pawn advantage for white)
  mate: number | null;     // Moves to mate (positive = white wins, negative = black wins)
  pv: string[];            // Principal variation (best line) in UCI format
  nodes: number;
  nps: number;             // Nodes per second
  time: number;            // Time spent in ms
}

// Move quality classification
export type MoveQuality =
  | 'brilliant'    // Better than engine's best move (rare)
  | 'great'        // Top 2 engine moves
  | 'good'         // Within 0.3 pawns of best
  | 'book'         // Opening book move
  | 'inaccuracy'   // 0.3-1.0 pawn loss
  | 'mistake'      // 1.0-3.0 pawn loss
  | 'blunder';     // >3.0 pawn loss or missed mate

// Analysis for a single move
export interface MoveAnalysis {
  move: string;            // UCI format (e.g., "e2e4")
  san: string;             // SAN format (e.g., "e4")
  evalBefore: number;
  evalAfter: number;
  evalDelta: number;       // Change in evaluation
  quality: MoveQuality;
  bestMove: string;        // What engine suggested
  isBestMove: boolean;
}

// Full game analysis
export interface GameAnalysis {
  moves: MoveAnalysis[];
  accuracy: {
    white: number;         // 0-100%
    black: number;
  };
  summary: {
    brilliantMoves: number;
    greatMoves: number;
    blunders: number;
    mistakes: number;
    inaccuracies: number;
  };
}
