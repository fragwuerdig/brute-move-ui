# ChessBoard Architecture

## Overview

This document outlines the architecture for a unified ChessBoard component system that supports three modes (live, exploration, analysis) while separating blockchain concerns into a dedicated hook.

---

## Current State

```
Game.tsx
├── BoardCard.tsx        (Live mode - blockchain game)
├── ExplorationBoard.tsx (Exploration mode - local analysis)
├── ActionCard.tsx       (Game actions UI)
└── TurnIndicator.tsx    (Turn/clock display)
```

**Problems:**
- ~70% code duplication between BoardCard and ExplorationBoard
- Blockchain logic mixed into Game.tsx
- No clear separation of concerns
- Adding analysis mode would require a third component

---

## Proposed Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Game.tsx                                │
│  (Orchestration layer - switches between modes, handles UI)     │
└─────────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  TurnIndicator  │  │   ChessBoard    │  │   ActionCard    │
│                 │  │   (unified)     │  │                 │
└─────────────────┘  └─────────────────┘  └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  useChessGame   │
                    │  (local state)  │
                    └─────────────────┘
                              │
            ┌─────────────────┴─────────────────┐
            ▼                                   ▼
   ┌─────────────────┐                ┌─────────────────┐
   │ useOnChainGame  │                │  useStockfish   │
   │ (blockchain)    │                │  (engine)       │
   └─────────────────┘                └─────────────────┘
```

---

## History Model

There are **two types of history** in the system:

### 1. On-Chain History (immutable)
- Source: Contract query `{ history: {} }`
- Contains: All moves actually played on-chain
- Use cases:
  - Navigate backwards in live game (view-only)
  - Export PGN
  - Replay game

### 2. Local History (mutable)
- Source: Local state in `useChessGame`
- Contains: Moves made during exploration/analysis
- Use cases:
  - Undo moves in exploration mode
  - Reset to starting position
  - Track analysis variations

### History Navigation

```
Live Mode:
┌─────────────────────────────────────────────────────────┐
│ On-Chain History: [e2e4, e7e5, g1f3, b8c6, ...]        │
│                                          ▲              │
│                                   currentIndex          │
│                                                         │
│ User can navigate: ◀ ▶ to view past positions          │
│ But can only PLAY from the latest position             │
└─────────────────────────────────────────────────────────┘

Exploration Mode:
┌─────────────────────────────────────────────────────────┐
│ Starting FEN: (copied from on-chain at entry)          │
│                                                         │
│ Local History: [starting, +Nf3, +Nc6, +Bb5, ...]       │
│                                          ▲              │
│                                   currentIndex          │
│                                                         │
│ User can: Undo, Reset, navigate freely, play both      │
└─────────────────────────────────────────────────────────┘

Analysis Mode (future):
┌─────────────────────────────────────────────────────────┐
│ PGN Tree with variations:                              │
│                                                         │
│ 1. e4 e5 2. Nf3 Nc6 3. Bb5 (main line)                │
│              └── 2... d6 (variation 1)                 │
│                   └── 3. d4 (sub-variation)            │
│                                                         │
│ User can: Navigate tree, add variations, run engine    │
└─────────────────────────────────────────────────────────┘
```

---

## Components

### 1. ChessBoard (unified)

Single component handling all three modes.

```typescript
type BoardMode = 'live' | 'exploration' | 'analysis';

interface ChessBoardProps {
  // Core
  mode: BoardMode;
  fen: string;
  orientation?: 'white' | 'black';

  // Visual indicators
  checkSquare?: Square;
  lastMove?: { from: Square; to: Square };

  // Interaction
  disabled?: boolean;
  allowedColor?: 'white' | 'black' | 'both';  // Who can move

  // Callbacks
  onMove?: (from: Square, to: Square, promotion?: string) => boolean;

  // History navigation (live mode - viewing past positions)
  historyIndex?: number;
  historyLength?: number;
  onHistoryNavigate?: (index: number) => void;

  // Exploration/Analysis controls (rendered internally based on mode)
  showControls?: boolean;
  onUndo?: () => void;
  onReset?: () => void;
  onExit?: () => void;
  canUndo?: boolean;

  // Analysis mode
  engineEval?: EngineEvaluation;
}
```

**Mode behaviors:**

| Aspect | live | exploration | analysis |
|--------|------|-------------|----------|
| allowedColor | single | both | both |
| External fen | ✅ | ❌ (internal) | ❌ (internal) |
| Shows controls | ❌ | ✅ | ✅ |
| History source | on-chain | local | local + tree |
| Can navigate history | ✅ (view-only) | ✅ (with undo) | ✅ (tree nav) |
| Engine eval | ❌ | ❌ | ✅ |
| Visual style | gold border | blue border | green border |

---

## Hooks

### 2. useChessGame (local game state with history)

Manages chess game state locally using chess.js. Used by exploration and analysis modes.

```typescript
interface UseChessGameOptions {
  initialFen?: string;
}

interface UseChessGameReturn {
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
  canUndo: boolean;           // historyIndex > 0
  canRedo: boolean;           // historyIndex < history.length - 1

  // Actions
  move: (from: Square, to: Square, promotion?: string) => boolean;
  undo: () => void;           // Go back one move
  redo: () => void;           // Go forward one move (if available)
  reset: () => void;          // Back to initial position
  goToMove: (index: number) => void;  // Jump to specific position
  setPosition: (fen: string) => void; // Set new starting position (clears history)

  // PGN
  pgn: string;
  loadPgn: (pgn: string) => boolean;
}

function useChessGame(options?: UseChessGameOptions): UseChessGameReturn;
```

**History behavior:**
```
Initial: history = [startFen], historyIndex = 0

After move e2e4:
  history = [startFen, fenAfterE4], historyIndex = 1

After move e7e5:
  history = [startFen, fenAfterE4, fenAfterE5], historyIndex = 2

After undo():
  history = [startFen, fenAfterE4, fenAfterE5], historyIndex = 1
  (fen shows position after e4, but e5 is still in history for redo)

After new move d2d4 (while at index 1):
  history = [startFen, fenAfterE4, fenAfterD4], historyIndex = 2
  (e5 branch is discarded - for tree structure, see analysis mode)
```

---

### 3. useOnChainGame (blockchain integration with history)

Handles all blockchain communication for live games.

```typescript
interface UseOnChainGameOptions {
  gameAddress: string;
  playerAddress?: string;
}

interface GameInfo {
  board: string;              // Current FEN
  players: [string, string];  // [white, black]
  turn: 'white' | 'black';
  isFinished: boolean;
  winner: string | null;
  noShow: boolean;
  timeout: boolean;
  fullmoves: number;
  created: number;
  lastMoveTime: number;
  moveTimeout: number;
  gameStartTimeout: number;
  openDrawOffer: string | null;
}

interface UseOnChainGameReturn {
  // State
  gameInfo: GameInfo | null;
  isLoading: boolean;
  error: Error | null;

  // Current position (respects history navigation)
  fen: string;                    // Position at historyIndex
  lastMove: { from: Square; to: Square } | null;

  // Player info
  isMyTurn: boolean;
  myColor: 'white' | 'black' | null;
  canPlay: boolean;               // My turn AND viewing latest position
  timeLeft: { type: 'no-show' | 'turn'; seconds: number };

  // Move state (optimistic updates)
  isPostingMove: boolean;
  pendingMove: string | null;
  pendingFen: string | null;

  // On-chain history navigation
  history: string[];              // UCI moves from contract
  historyFens: string[];          // Computed FENs for each position
  historyIndex: number;           // Current viewing position
  isViewingHistory: boolean;      // historyIndex < history.length

  // History navigation
  goToMove: (index: number) => void;
  goToStart: () => void;
  goToLatest: () => void;
  goBack: () => void;
  goForward: () => void;

  // Actions (only work when viewing latest position)
  postMove: (uci: string, offerDraw?: boolean) => Promise<void>;
  resign: () => Promise<void>;
  acceptDraw: () => Promise<void>;
  claimTimeout: () => Promise<void>;
  claimReward: () => Promise<void>;

  // Refresh
  refresh: () => void;
  refreshHistory: () => Promise<void>;
}

function useOnChainGame(options: UseOnChainGameOptions): UseOnChainGameReturn;
```

**History computation:**
```typescript
// On-chain history is stored as UCI moves
// We compute FENs locally for navigation

const computeHistoryFens = (moves: string[]): string[] => {
  const game = new Chess();
  const fens = [game.fen()]; // Starting position

  for (const uci of moves) {
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promo = uci[4];
    game.move({ from, to, promotion: promo });
    fens.push(game.fen());
  }

  return fens;
};
```

---

### 4. useStockfish (engine integration) - Future

```typescript
interface UseStockfishOptions {
  depth?: number;
  multiPv?: number;  // Number of lines to show
}

interface EngineLine {
  score: number;      // Centipawns (+ = white advantage)
  mate?: number;      // Moves to mate (if applicable)
  pv: string[];       // Principal variation (UCI moves)
  depth: number;
}

interface UseStockfishReturn {
  isReady: boolean;
  isAnalyzing: boolean;
  lines: EngineLine[];

  analyze: (fen: string) => void;
  stop: () => void;
}

function useStockfish(options?: UseStockfishOptions): UseStockfishReturn;
```

---

## Refactored Game.tsx

```typescript
function Game({ gameAddress }: GameProps) {
  const { connectedAddr } = useWallet();
  const [mode, setMode] = useState<'live' | 'exploration'>('live');

  // On-chain game state with history
  const onChain = useOnChainGame({
    gameAddress,
    playerAddress: connectedAddr
  });

  // Local game for exploration (initialized from on-chain position)
  const localGame = useChessGame({
    initialFen: onChain.fen
  });

  // Handle live move (only allowed when viewing latest)
  const handleLiveMove = (from: Square, to: Square, promo?: string) => {
    if (onChain.isViewingHistory) {
      // Jump to latest before allowing move
      onChain.goToLatest();
      return false;
    }
    const uci = from + to + (promo || '');
    onChain.postMove(uci, offerDraw).catch(e => alert(e.message));
    return true;
  };

  // Handle exploration move
  const handleExplorationMove = (from: Square, to: Square, promo?: string) => {
    return localGame.move(from, to, promo);
  };

  // Switch to exploration - sync position from current view
  const enterExploration = () => {
    localGame.setPosition(onChain.fen);
    setMode('exploration');
  };

  return (
    <div className="game-container">
      {mode === 'live' ? (
        <>
          <TurnIndicator
            turn={onChain.gameInfo?.turn}
            players={onChain.gameInfo?.players}
            timeLeft={onChain.timeLeft}
          />

          <ChessBoard
            mode="live"
            fen={onChain.fen}
            orientation={onChain.myColor}
            allowedColor={onChain.myColor}
            disabled={!onChain.canPlay || onChain.isPostingMove}
            checkSquare={onChain.checkSquare}
            lastMove={onChain.lastMove}
            onMove={handleLiveMove}
            // History navigation
            historyIndex={onChain.historyIndex}
            historyLength={onChain.historyFens.length}
            onHistoryNavigate={onChain.goToMove}
          />

          {/* History navigation UI */}
          {onChain.history.length > 0 && (
            <HistoryControls
              canGoBack={onChain.historyIndex > 0}
              canGoForward={onChain.historyIndex < onChain.historyFens.length - 1}
              onBack={onChain.goBack}
              onForward={onChain.goForward}
              onStart={onChain.goToStart}
              onLatest={onChain.goToLatest}
              isViewingHistory={onChain.isViewingHistory}
            />
          )}

          <ActionCard
            disabled={!onChain.canPlay || onChain.isViewingHistory}
            isPostingMove={onChain.isPostingMove}
            onResign={() => onChain.resign()}
            onExplore={enterExploration}
          />
        </>
      ) : (
        <ChessBoard
          mode="exploration"
          fen={localGame.fen}
          orientation={onChain.myColor}
          allowedColor="both"
          checkSquare={localGame.checkSquare}
          lastMove={localGame.lastMove}
          onMove={handleExplorationMove}
          showControls
          onUndo={localGame.undo}
          onReset={localGame.reset}
          onExit={() => setMode('live')}
          canUndo={localGame.canUndo}
        />
      )}
    </div>
  );
}
```

---

## File Structure

```
src/
├── components/
│   ├── ChessBoard/
│   │   ├── ChessBoard.tsx
│   │   ├── ChessBoard.css
│   │   ├── PromotionModal.tsx
│   │   ├── BoardControls.tsx      (Undo/Reset/Exit for exploration)
│   │   └── HistoryControls.tsx    (◀◀ ◀ ▶ ▶▶ for live mode)
│   ├── ActionCard/
│   │   ├── ActionCard.tsx
│   │   └── ActionCard.css
│   └── TurnIndicator/
│       ├── TurnIndicator.tsx
│       └── TurnIndicator.css
├── hooks/
│   ├── useChessGame.ts            (Local chess state + history)
│   ├── useOnChainGame.ts          (Blockchain + history)
│   └── useStockfish.ts            (Engine - future)
├── pages/
│   ├── Game.tsx                   (Live game page)
│   └── Analysis.tsx               (Standalone analysis - future)
└── common/
    └── utils.ts                   (UCI/PGN conversion)
```

---

## Migration Plan

### Phase 1: Extract hooks
1. Create `useChessGame.ts` - local game logic with history
2. Create `useOnChainGame.ts` - blockchain logic + history from Game.tsx
3. Test hooks independently

### Phase 2: Unify ChessBoard
1. Create unified `ChessBoard.tsx`
2. Migrate live mode (from BoardCard)
3. Migrate exploration mode (from ExplorationBoard)
4. Add history navigation UI
5. Delete old components

### Phase 3: Refactor Game.tsx
1. Use new hooks
2. Use unified ChessBoard
3. Simplify orchestration logic

### Phase 4: Analysis mode (future)
1. Add `useStockfish.ts`
2. Add PGN tree navigation
3. Add analysis mode to ChessBoard
4. Create Analysis.tsx page

---

## Benefits

1. **Single source of truth** for board rendering
2. **Clear separation** - UI vs blockchain vs engine
3. **Testable** - hooks can be unit tested
4. **Extensible** - adding analysis mode is just a new hook + mode
5. **Reusable** - ChessBoard can be used in other contexts
6. **Optimistic updates** - better UX when posting moves
7. **History navigation** - view past positions in live games
8. **Unified history model** - consistent UX across modes
