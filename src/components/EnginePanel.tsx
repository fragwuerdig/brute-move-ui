import { useMemo } from 'react';
import type { EngineLine, MoveQuality } from '../types/analysis';
import { uciLinesToSan, formatSanLine, uciToSan } from '../Common';
import './EnginePanel.css';

interface EnginePanelProps {
  enabled: boolean;
  isReady: boolean;
  isAnalyzing: boolean;
  lines: EngineLine[];
  depth: number;
  fen: string;
  error?: string | null;
  onToggle: () => void;
  // Move quality info (optional - for showing quality of last played move)
  lastMove?: {
    uci: string;
    prevFen: string;
    prevEval: number | null;  // Eval before the move (from white's perspective)
    currEval: number | null;  // Eval after the move
    bestMove: string | null;  // What engine suggested as best
  };
}

// Format evaluation score for display
function formatEval(score: number, mate: number | null): string {
  if (mate !== null) {
    return mate > 0 ? `M${mate}` : `M${mate}`;
  }
  const pawns = score / 100;
  return pawns >= 0 ? `+${pawns.toFixed(1)}` : pawns.toFixed(1);
}

// Get color class based on evaluation
function getEvalClass(score: number, mate: number | null): string {
  if (mate !== null) {
    return mate > 0 ? 'engine-line__eval--winning' : 'engine-line__eval--losing';
  }
  if (score > 100) return 'engine-line__eval--winning';
  if (score < -100) return 'engine-line__eval--losing';
  return 'engine-line__eval--equal';
}

// Determine move quality based on eval change
function getMoveQuality(
  prevEval: number | null,
  currEval: number | null,
  playedMove: string,
  bestMove: string | null,
  isWhiteMove: boolean
): MoveQuality | null {
  // If the played move was the best move
  if (bestMove && playedMove === bestMove) {
    return 'great';
  }

  if (prevEval === null || currEval === null) {
    return null;
  }

  // Calculate eval change from the moving player's perspective
  // If white moved: positive change is good, negative is bad
  // If black moved: negative change is good (white's eval went down), positive is bad
  const evalChange = isWhiteMove
    ? (currEval - prevEval)  // White wants eval to go up
    : (prevEval - currEval); // Black wants eval to go down (from white's perspective)

  // Thresholds in centipawns
  if (evalChange >= -10) return 'great';      // Within 0.1 pawn of best
  if (evalChange >= -30) return 'good';       // Within 0.3 pawns
  if (evalChange >= -100) return 'inaccuracy'; // 0.3-1.0 pawn loss
  if (evalChange >= -300) return 'mistake';    // 1.0-3.0 pawn loss
  return 'blunder';                            // >3.0 pawn loss
}

// Get display info for move quality
function getQualityInfo(quality: MoveQuality): { label: string; className: string } {
  switch (quality) {
    case 'brilliant':
      return { label: 'Brilliant', className: 'move-quality--brilliant' };
    case 'great':
      return { label: 'Best', className: 'move-quality--great' };
    case 'good':
      return { label: 'Good', className: 'move-quality--good' };
    case 'book':
      return { label: 'Book', className: 'move-quality--book' };
    case 'inaccuracy':
      return { label: 'Inaccuracy', className: 'move-quality--inaccuracy' };
    case 'mistake':
      return { label: 'Mistake', className: 'move-quality--mistake' };
    case 'blunder':
      return { label: 'Blunder', className: 'move-quality--blunder' };
  }
}

export function EnginePanel({
  enabled,
  isReady,
  isAnalyzing,
  lines,
  depth,
  fen,
  error,
  onToggle,
  lastMove,
}: EnginePanelProps) {
  // Convert UCI lines to SAN notation
  const sanLines = useMemo(() => {
    return lines.map(line => {
      const sanMoves = uciLinesToSan(fen, line.pv, 8);
      const formatted = formatSanLine(fen, sanMoves);
      return {
        ...line,
        sanMoves,
        formatted,
      };
    });
  }, [lines, fen]);

  // Calculate move quality for last move
  const moveQualityInfo = useMemo(() => {
    if (!lastMove || !lastMove.prevFen) return null;

    // Determine if it was white's move (by looking at who moves in prevFen)
    const parts = lastMove.prevFen.split(' ');
    const isWhiteMove = parts[1] === 'w';

    const quality = getMoveQuality(
      lastMove.prevEval,
      lastMove.currEval,
      lastMove.uci,
      lastMove.bestMove,
      isWhiteMove
    );

    if (!quality) return null;

    const sanMove = uciToSan(lastMove.prevFen, lastMove.uci);
    const bestSan = lastMove.bestMove ? uciToSan(lastMove.prevFen, lastMove.bestMove) : null;
    const info = getQualityInfo(quality);

    return {
      quality,
      sanMove,
      bestSan,
      wasBest: lastMove.uci === lastMove.bestMove,
      ...info,
    };
  }, [lastMove]);

  return (
    <div className="engine-panel">
      <button
        className={`engine-panel__toggle ${enabled ? 'engine-panel__toggle--active' : ''}`}
        onClick={onToggle}
      >
        {enabled ? (isReady ? 'Engine On' : 'Loading...') : 'Enable Engine'}
      </button>

      {/* Content container with fixed height */}
      {enabled && (
        <div className="engine-panel__content">
          {/* Move Quality Badge */}
          {moveQualityInfo && (
            <div className={`move-quality ${moveQualityInfo.className}`}>
              <div className="move-quality__header">
                <span className="move-quality__badge">{moveQualityInfo.label}</span>
                <span className="move-quality__move">{moveQualityInfo.sanMove}</span>
              </div>
              {!moveQualityInfo.wasBest && moveQualityInfo.bestSan && (
                <div className="move-quality__best">
                  Best was <strong>{moveQualityInfo.bestSan}</strong>
                </div>
              )}
            </div>
          )}

          {sanLines.length > 0 ? (
            <div className="engine-panel__lines">
              <div className="engine-panel__header">
                <span className="engine-panel__depth">Depth {depth}</span>
                {isAnalyzing && <span className="engine-panel__analyzing" />}
              </div>

              {sanLines.map((line, index) => (
                <div key={index} className="engine-line">
                  <div className={`engine-line__eval ${getEvalClass(line.score, line.mate)}`}>
                    {formatEval(line.score, line.mate)}
                  </div>
                  <div className="engine-line__moves">
                    {line.formatted || line.pv.slice(0, 5).join(' ')}
                  </div>
                </div>
              ))}
            </div>
          ) : isReady ? (
            <div className="engine-panel__loading">
              Analyzing...
            </div>
          ) : null}
        </div>
      )}

      {error && (
        <div className="engine-panel__error">{error}</div>
      )}
    </div>
  );
}
