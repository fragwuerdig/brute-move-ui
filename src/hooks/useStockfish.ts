import { useState, useEffect, useCallback, useRef } from 'react';
import type { EngineEvaluation, EngineLine } from '../types/analysis';

export interface UseStockfishOptions {
  enabled?: boolean;       // Whether engine should be active
  depth?: number;          // Analysis depth (default: 18)
  multiPv?: number;        // Number of lines to calculate (default: 3)
}

export interface UseStockfishReturn {
  // State
  isReady: boolean;
  isAnalyzing: boolean;
  currentEval: EngineEvaluation | null;
  error: string | null;

  // Best move info
  bestMove: string | null;
  bestLine: string[];

  // MultiPV lines (all top lines)
  lines: EngineLine[];

  // Actions
  analyze: (fen: string) => void;
  stop: () => void;
}

// Extract side to move from FEN (returns 'w' or 'b')
function getSideToMove(fen: string): 'w' | 'b' {
  const parts = fen.split(' ');
  return (parts[1] === 'b' ? 'b' : 'w');
}

// Parse UCI info line into evaluation with multipv support
interface ParsedInfo {
  multipv?: number;
  depth?: number;
  score?: number;
  mate?: number | null;
  pv?: string[];
  nodes?: number;
  nps?: number;
  time?: number;
}

function parseInfoLine(line: string): ParsedInfo | null {
  if (!line.startsWith('info ')) return null;

  const result: ParsedInfo = {};

  // Parse multipv (line number)
  const multipvMatch = line.match(/\bmultipv (\d+)/);
  if (multipvMatch) result.multipv = parseInt(multipvMatch[1]);

  // Parse depth
  const depthMatch = line.match(/\bdepth (\d+)/);
  if (depthMatch) result.depth = parseInt(depthMatch[1]);

  // Parse score (cp = centipawns, mate = moves to mate)
  const cpMatch = line.match(/\bscore cp (-?\d+)/);
  if (cpMatch) {
    result.score = parseInt(cpMatch[1]);
    result.mate = null;
  }

  const mateMatch = line.match(/\bscore mate (-?\d+)/);
  if (mateMatch) {
    result.mate = parseInt(mateMatch[1]);
    // Convert mate to a large score for display
    result.score = result.mate > 0 ? 10000 - result.mate : -10000 - result.mate;
  }

  // Parse nodes
  const nodesMatch = line.match(/\bnodes (\d+)/);
  if (nodesMatch) result.nodes = parseInt(nodesMatch[1]);

  // Parse nps (nodes per second)
  const npsMatch = line.match(/\bnps (\d+)/);
  if (npsMatch) result.nps = parseInt(npsMatch[1]);

  // Parse time
  const timeMatch = line.match(/\btime (\d+)/);
  if (timeMatch) result.time = parseInt(timeMatch[1]);

  // Parse pv (principal variation)
  const pvMatch = line.match(/\bpv (.+?)(?:\s+(?:bmc|string|score|depth|seldepth|multipv|nodes|nps|hashfull|tbhits|time|currmove|currmovenumber)|$)/);
  if (pvMatch) {
    result.pv = pvMatch[1].trim().split(/\s+/);
  }

  return result;
}

// Parse bestmove line
function parseBestMove(line: string): string | null {
  const match = line.match(/^bestmove (\S+)/);
  return match ? match[1] : null;
}

export function useStockfish(options: UseStockfishOptions = {}): UseStockfishReturn {
  const { enabled = true, depth = 18, multiPv = 3 } = options;

  const [isReady, setIsReady] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentEval, setCurrentEval] = useState<EngineEvaluation | null>(null);
  const [bestMove, setBestMove] = useState<string | null>(null);
  const [bestLine, setBestLine] = useState<string[]>([]);
  const [lines, setLines] = useState<EngineLine[]>([]);
  const [error, setError] = useState<string | null>(null);

  const workerRef = useRef<Worker | null>(null);
  const pendingFenRef = useRef<string | null>(null);
  const currentFenRef = useRef<string | null>(null);
  const linesRef = useRef<Map<number, EngineLine>>(new Map());

  // Initialize worker
  useEffect(() => {
    if (!enabled) {
      // Clean up worker when disabled
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
        setIsReady(false);
        setIsAnalyzing(false);
        setCurrentEval(null);
        setBestMove(null);
        setBestLine([]);
        setLines([]);
        linesRef.current.clear();
      }
      return;
    }

    // Create worker
    try {
      console.log('[Stockfish] Creating worker...');
      const worker = new Worker('/stockfish.wasm.js');
      workerRef.current = worker;
      console.log('[Stockfish] Worker created, sending uci command...');

      worker.onmessage = (e: MessageEvent) => {
        const line = e.data;
        console.log('[Stockfish]', line);

        if (line === 'uciok') {
          // Engine is ready, configure it
          console.log('[Stockfish] UCI ready, configuring...');
          worker.postMessage(`setoption name MultiPV value ${multiPv}`);
          worker.postMessage('isready');
        } else if (line === 'readyok') {
          console.log('[Stockfish] Engine ready!');
          setIsReady(true);
          setError(null);
          // If there's a pending analysis, start it
          if (pendingFenRef.current) {
            const fen = pendingFenRef.current;
            pendingFenRef.current = null;
            currentFenRef.current = fen;
            linesRef.current.clear();
            worker.postMessage('ucinewgame');
            worker.postMessage(`position fen ${fen}`);
            worker.postMessage(`go depth ${depth}`);
            setIsAnalyzing(true);
          }
        } else if (line.startsWith('info ')) {
          const info = parseInfoLine(line);
          if (info && info.depth !== undefined && info.pv && info.pv.length > 0) {
            // Stockfish returns score from side-to-move perspective
            // We normalize to white's perspective (positive = white advantage)
            const isBlackToMove = currentFenRef.current ? getSideToMove(currentFenRef.current) === 'b' : false;
            const scoreMultiplier = isBlackToMove ? -1 : 1;

            const normalizedScore = (info.score ?? 0) * scoreMultiplier;
            const normalizedMate = info.mate !== undefined && info.mate !== null
              ? info.mate * scoreMultiplier
              : null;

            const pvIndex = info.multipv ?? 1;

            // Update the line in our map
            const engineLine: EngineLine = {
              multipv: pvIndex,
              depth: info.depth,
              score: normalizedScore,
              mate: normalizedMate,
              pv: info.pv,
            };
            linesRef.current.set(pvIndex, engineLine);

            // Convert map to sorted array and update state
            const sortedLines = Array.from(linesRef.current.values())
              .sort((a, b) => a.multipv - b.multipv);
            setLines(sortedLines);

            // Update best line (multipv 1) as the main eval
            if (pvIndex === 1) {
              setCurrentEval(prev => ({
                depth: info.depth ?? prev?.depth ?? 0,
                score: normalizedScore,
                mate: normalizedMate,
                pv: info.pv ?? prev?.pv ?? [],
                nodes: info.nodes ?? prev?.nodes ?? 0,
                nps: info.nps ?? prev?.nps ?? 0,
                time: info.time ?? prev?.time ?? 0,
              }));
              setBestLine(info.pv);
              setBestMove(info.pv[0]);
            }
          }
        } else if (line.startsWith('bestmove ')) {
          const move = parseBestMove(line);
          if (move) {
            setBestMove(move);
          }
          setIsAnalyzing(false);
        }
      };

      worker.onerror = (e) => {
        console.error('Stockfish worker error:', e);
        setError('Failed to load chess engine');
        setIsReady(false);
      };

      // Initialize UCI protocol
      worker.postMessage('uci');
    } catch (err) {
      console.error('Failed to create Stockfish worker:', err);
      setError('Failed to create chess engine worker');
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, [enabled, depth, multiPv]);

  // Store depth in ref so analyze doesn't need it as dependency
  const depthRef = useRef(depth);
  depthRef.current = depth;

  const isReadyRef = useRef(isReady);
  isReadyRef.current = isReady;

  // Analyze a position - stable reference
  const analyze = useCallback((fen: string) => {
    // Store the FEN for score normalization
    currentFenRef.current = fen;
    // Clear previous lines when starting new analysis
    linesRef.current.clear();
    setLines([]);

    if (!workerRef.current) {
      // Queue the analysis for when ready
      pendingFenRef.current = fen;
      return;
    }

    if (!isReadyRef.current) {
      // Queue the analysis for when ready
      pendingFenRef.current = fen;
      return;
    }

    // Stop any current analysis
    workerRef.current.postMessage('stop');

    // Start new analysis (don't clear eval - let it update progressively)
    workerRef.current.postMessage('ucinewgame');
    workerRef.current.postMessage(`position fen ${fen}`);
    workerRef.current.postMessage(`go depth ${depthRef.current}`);
    setIsAnalyzing(true);
  }, []);

  // Stop analysis
  const stop = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.postMessage('stop');
      setIsAnalyzing(false);
    }
  }, []);

  return {
    isReady,
    isAnalyzing,
    currentEval,
    error,
    bestMove,
    bestLine,
    lines,
    analyze,
    stop,
  };
}
