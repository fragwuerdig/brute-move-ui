# Stockfish Game Analysis - Architecture Proposal

## Overview

This document outlines the architecture for integrating Stockfish chess engine analysis into the Brute Move UI. The goal is to allow players to:

1. **Review games** with engine evaluation and move quality indicators
2. **Explore alternatives** by playing different moves and seeing how the evaluation changes
3. **Learn from mistakes** by understanding what the best moves were

---

## Key Design Decision: Extend Exploration Mode

Rather than creating a separate "analysis" variant, we'll **extend the existing exploration mode** in `Game.tsx` with optional Stockfish integration. This approach:

- Reuses the existing `useChessGame` hook infrastructure (undo/redo, history, position management)
- Avoids duplicating exploration UI/logic
- Allows gradual enhancement - exploration works without engine, engine enhances it
- Keeps the codebase simpler

### Current Exploration Mode Infrastructure

The existing `useChessGame` hook (`src/hooks/useChessGame.ts`) already provides:

```typescript
interface ChessGameState {
  fen: string;
  history: string[];           // Array of FENs (all positions)
  moveHistory: string[];       // Array of UCI moves
  historyIndex: number;        // Current position in history
  canUndo: boolean;
  canRedo: boolean;

  // Actions
  move: (from, to, promotion?) => boolean;
  undo: () => void;
  redo: () => void;
  reset: () => void;
  goToMove: (index: number) => void;
  setPosition: (fen: string) => void;
}
```

When users click "Explore" in `Game.tsx`, they enter exploration mode which uses `localGame` from `useChessGame`. The engine integration adds:

1. **New `useStockfish` hook** - manages engine lifecycle and communication
2. **`EvaluationBar` component** - shows position evaluation alongside the board
3. **Analysis toggle** - user can enable/disable engine while exploring
4. **Best move indicator** - optional arrow showing engine's suggestion

### How It Works Together

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Game.tsx (exploration mode)                   │
│                                                                      │
│  ┌──────────────────┐    ┌──────────────────────────────────────┐  │
│  │   useChessGame   │    │          useStockfish                │  │
│  │   (localGame)    │    │   (optional, user-activated)         │  │
│  │                  │    │                                      │  │
│  │  • fen           │───▶│  analyze(fen) when position changes  │  │
│  │  • move()        │    │                                      │  │
│  │  • undo()        │    │  Returns:                            │  │
│  │  • redo()        │    │  • currentEval                       │  │
│  │  • history       │    │  • bestMove                          │  │
│  └──────────────────┘    │  • bestLine                          │  │
│                          └──────────────────────────────────────┘  │
│                                        │                            │
│                                        ▼                            │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                      UI Components                            │  │
│  │  • EvaluationBar (shows eval beside board)                   │  │
│  │  • Best move arrow (optional overlay on ChessBoard)          │  │
│  │  • Engine info panel (depth, nodes/sec)                      │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Client-Side WASM Approach

Use Stockfish compiled to WebAssembly running entirely in the browser.

**Pros:**

- No server costs
- Works offline
- No latency from network requests
- Privacy (analysis stays local)

**Cons:**

- Limited by client device performance
- Initial WASM download (~2-5MB)
- Mobile devices may struggle with deep analysis

**Recommended Library:**

- [lila-stockfish-web](https://github.com/nicfv/Stockfish) - Lichess's optimized WASM build

---

## Implementation

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Game.tsx                              │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐   │
│  │ ChessBoard  │  │ ActionCard   │  │ AnalysisPanel     │   │
│  │             │  │ [Analyze]    │  │ - Evaluation bar  │   │
│  │             │  │              │  │ - Best moves      │   │
│  │             │  │              │  │ - Move quality    │   │
│  └─────────────┘  └──────────────┘  └───────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   useStockfish Hook                          │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ - Initialize WASM worker                             │    │
│  │ - Send UCI commands                                  │    │
│  │ - Parse engine output                                │    │
│  │ - Manage analysis state                              │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Web Worker (stockfish.worker.ts)                │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Stockfish WASM Engine                                │    │
│  │ - Runs in separate thread                            │    │
│  │ - Non-blocking UI                                    │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### File Structure

```
src/
├── hooks/
│   └── useStockfish.ts          # Main hook for Stockfish integration
├── workers/
│   └── stockfish.worker.ts      # Web Worker wrapper
├── components/
│   ├── AnalysisPanel.tsx        # UI for displaying analysis
│   ├── AnalysisPanel.css
│   ├── EvaluationBar.tsx        # Visual eval bar (-10 to +10)
│   └── MoveQualityBadge.tsx     # Brilliant/Great/Good/Inaccuracy/Mistake/Blunder
├── utils/
│   └── stockfishParser.ts       # Parse UCI output to structured data
└── types/
    └── analysis.ts              # TypeScript interfaces
```

### Core Interfaces

```typescript
// src/types/analysis.ts

export interface EngineEvaluation {
  depth: number;
  score: number;           // In centipawns (100 = 1 pawn advantage)
  mate: number | null;     // Moves to mate (positive = white wins)
  pv: string[];            // Principal variation (best line)
  nodes: number;
  nps: number;             // Nodes per second
  time: number;            // Time spent in ms
}

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

export type MoveQuality =
  | 'brilliant'    // Better than engine's best move (rare)
  | 'great'        // Top 2 engine moves
  | 'good'         // Within 0.3 pawns of best
  | 'book'         // Opening book move
  | 'inaccuracy'   // 0.3-1.0 pawn loss
  | 'mistake'      // 1.0-3.0 pawn loss
  | 'blunder';     // >3.0 pawn loss or missed mate

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
```

### useStockfish Hook

```typescript
// src/hooks/useStockfish.ts

export interface UseStockfishOptions {
  depth?: number;          // Analysis depth (default: 18)
  multiPv?: number;        // Number of lines to calculate (default: 3)
  threads?: number;        // CPU threads (default: navigator.hardwareConcurrency / 2)
}

export interface UseStockfishReturn {
  // State
  isReady: boolean;
  isAnalyzing: boolean;
  currentEval: EngineEvaluation | null;

  // Actions
  analyze: (fen: string) => void;
  analyzeGame: (moves: string[]) => Promise<GameAnalysis>;
  stop: () => void;

  // Best move for current position
  bestMove: string | null;
  bestLine: string[];
}

export function useStockfish(options?: UseStockfishOptions): UseStockfishReturn {
  // Implementation
}
```

### Web Worker Implementation

```typescript
// src/workers/stockfish.worker.ts

import wasmUrl from 'stockfish/stockfish.wasm?url';

let stockfish: any = null;

self.onmessage = async (e: MessageEvent) => {
  const { type, payload } = e.data;

  switch (type) {
    case 'init':
      // Initialize Stockfish WASM
      stockfish = await Stockfish();
      stockfish.addMessageListener((line: string) => {
        self.postMessage({ type: 'output', payload: line });
      });
      stockfish.postMessage('uci');
      break;

    case 'command':
      stockfish?.postMessage(payload);
      break;

    case 'analyze':
      const { fen, depth, multiPv } = payload;
      stockfish?.postMessage('stop');
      stockfish?.postMessage('ucinewgame');
      stockfish?.postMessage(`position fen ${fen}`);
      stockfish?.postMessage(`setoption name MultiPV value ${multiPv}`);
      stockfish?.postMessage(`go depth ${depth}`);
      break;
  }
};
```

### UI Components

#### AnalysisPanel

```tsx
// src/components/AnalysisPanel.tsx

interface AnalysisPanelProps {
  fen: string;
  history: string[];
  onMoveClick?: (index: number) => void;
}

export function AnalysisPanel({ fen, history, onMoveClick }: AnalysisPanelProps) {
  const {
    isReady,
    isAnalyzing,
    currentEval,
    bestLine,
    analyzeGame
  } = useStockfish({ depth: 18, multiPv: 3 });

  const [gameAnalysis, setGameAnalysis] = useState<GameAnalysis | null>(null);

  const handleAnalyzeGame = async () => {
    const analysis = await analyzeGame(history);
    setGameAnalysis(analysis);
  };

  return (
    <div className="analysis-panel">
      <EvaluationBar value={currentEval?.score || 0} mate={currentEval?.mate} />

      <div className="analysis-panel__info">
        <span>Depth: {currentEval?.depth || 0}</span>
        <span>{((currentEval?.nps || 0) / 1000000).toFixed(1)}M nodes/s</span>
      </div>

      <div className="analysis-panel__lines">
        {bestLine.map((move, i) => (
          <span key={i} className="analysis-move">{move}</span>
        ))}
      </div>

      <button
        onClick={handleAnalyzeGame}
        disabled={!isReady || isAnalyzing}
      >
        {isAnalyzing ? 'Analyzing...' : 'Analyze Game'}
      </button>

      {gameAnalysis && (
        <div className="analysis-panel__summary">
          <h3>Game Summary</h3>
          <div className="accuracy">
            <span>White: {gameAnalysis.accuracy.white}%</span>
            <span>Black: {gameAnalysis.accuracy.black}%</span>
          </div>
        </div>
      )}
    </div>
  );
}
```

#### EvaluationBar

```tsx
// src/components/EvaluationBar.tsx

interface EvaluationBarProps {
  value: number;      // Centipawns
  mate: number | null;
}

export function EvaluationBar({ value, mate }: EvaluationBarProps) {
  // Convert centipawns to percentage (capped at ±10 pawns)
  const cappedValue = Math.max(-1000, Math.min(1000, value));
  const percentage = 50 + (cappedValue / 20); // ±10 pawns = 0-100%

  const displayValue = mate
    ? `M${Math.abs(mate)}`
    : (value / 100).toFixed(1);

  return (
    <div className="eval-bar">
      <div
        className="eval-bar__white"
        style={{ height: `${percentage}%` }}
      />
      <span className="eval-bar__value">{displayValue}</span>
    </div>
  );
}
```

### Integration with Game.tsx

The key insight is that exploration mode already exists. We just add engine analysis on top:

```tsx
// In Game.tsx - extending exploration mode with engine

function Game({ gameAddress, variant }: GameProps) {
  const [mode, setMode] = useState<'live' | 'exploration'>('live');
  const [engineEnabled, setEngineEnabled] = useState(false);

  // Existing exploration hook
  const localGame = useChessGame({ initialFen: onChain.fen });

  // NEW: Optional engine analysis (only loads when enabled)
  const engine = useStockfish({
    enabled: engineEnabled && mode === 'exploration',
    depth: 18,
  });

  // Re-analyze when exploration position changes
  useEffect(() => {
    if (engineEnabled && mode === 'exploration') {
      engine.analyze(localGame.fen);
    }
  }, [localGame.fen, engineEnabled, mode]);

  const isExploration = mode === 'exploration';

  return (
    <div className="game-container">
      <div className="game-board-section">
        {/* Show eval bar when engine is active */}
        {engineEnabled && isExploration && (
          <EvaluationBar
            value={engine.currentEval?.score || 0}
            mate={engine.currentEval?.mate}
          />
        )}

        <ChessBoard
          fen={isExploration ? localGame.fen : onChain.fen}
          onMove={isExploration ? handleExplorationMove : handleLiveMove}
          // ... existing props ...

          {/* NEW: Show best move arrow when engine active */}
          bestMoveArrow={engineEnabled ? engine.bestMove : undefined}
        />
      </div>

      <div className="game-sidebar">
        {/* Engine toggle in exploration mode */}
        {isExploration && (
          <button onClick={() => setEngineEnabled(!engineEnabled)}>
            {engineEnabled ? 'Disable Engine' : 'Enable Engine'}
          </button>
        )}

        {/* Engine info when active */}
        {engineEnabled && engine.currentEval && (
          <div className="engine-info">
            <span>Depth: {engine.currentEval.depth}</span>
            <div className="best-line">
              {engine.bestLine.map((move, i) => (
                <span key={i}>{move}</span>
              ))}
            </div>
          </div>
        )}

        {/* Existing controls */}
        <ActionCard ... />
      </div>
    </div>
  );
}
```

### User Flow

1. User opens a game (live or finished)
2. Clicks "Explore" button → enters exploration mode (existing functionality)
3. In exploration mode, clicks "Enable Engine" → Stockfish WASM loads
4. User can now:
   - Play alternative moves (existing `localGame.move()`)
   - See real-time evaluation update as they explore
   - Undo/redo moves (existing `localGame.undo()/redo()`)
   - Reset to original position (existing `localGame.reset()`)
   - Toggle engine off to save battery/CPU

### Visual Indicators

When engine is enabled in exploration mode:

1. **Evaluation bar** - Vertical bar showing who's winning (white/black)
2. **Best move arrow** - Arrow showing engine's recommended move
3. **Engine info panel** - Depth, nodes/sec, best continuation line

### Keyboard Shortcuts (Exploration Mode)

| Key         | Action                    |
| ----------- | ------------------------- |
| `←` / `→`   | Undo/redo exploration     |
| `Home`      | Reset to original         |
| `Escape`    | Exit exploration mode     |
| `Space`     | Play engine's best move   |
| `E`         | Toggle engine on/off      |

### Installation

```bash
# Install Stockfish WASM
npm install stockfish

# Or use a specific WASM build
npm install @pairjacks/stockfish-web
```

### Vite Configuration

```typescript
// vite.config.ts
export default defineConfig({
  // ... existing config ...
  worker: {
    format: 'es',
  },
  optimizeDeps: {
    exclude: ['stockfish'],
  },
});
```

---

## Implementation Phases

### Phase 1: Basic Engine Integration

- [ ] Set up Web Worker with Stockfish WASM
- [ ] Create `useStockfish` hook with lazy loading
- [ ] Add "Enable Engine" toggle to exploration mode UI
- [ ] Display `EvaluationBar` component beside board
- [ ] Show best move arrow on ChessBoard

### Phase 2: Enhanced Exploration UI

- [ ] Add engine info panel (depth, nodes/sec)
- [ ] Display best continuation line
- [ ] Add keyboard shortcut for playing best move (Space)
- [ ] Add keyboard shortcut for toggling engine (E)

### Phase 3: Move Quality Analysis (Optional)

- [ ] Analyze individual moves for quality
- [ ] Calculate move quality (brilliant/blunder/etc.)
- [ ] Show move annotations in move history list
- [ ] Calculate accuracy percentages per player

### Phase 4: Polish

- [ ] Performance optimizations (throttle analysis during rapid navigation)
- [ ] Mobile-friendly depth limits
- [ ] Cache position evaluations
- [ ] Export analysis to PGN with annotations

---

## Performance Considerations

1. **Lazy Loading**: Only load Stockfish WASM when user requests analysis
2. **Worker Pool**: Consider multiple workers for batch analysis
3. **Depth Limits**: Mobile devices should use lower depth (12-14)
4. **Caching**: Cache position evaluations to avoid re-analysis
5. **Throttling**: Debounce position changes during history navigation

---

## Alternative: Lichess Cloud Analysis API

If server-side analysis is preferred without maintaining infrastructure:

```typescript
// Use Lichess cloud eval API (free, rate-limited)
async function getLichessEval(fen: string): Promise<EngineEvaluation> {
  const response = await fetch(
    `https://lichess.org/api/cloud-eval?fen=${encodeURIComponent(fen)}&multiPv=3`
  );
  return response.json();
}
```

**Limitations:**
- Rate limited (anonymous: 30 req/min)
- Only cached positions available
- Requires internet connection
