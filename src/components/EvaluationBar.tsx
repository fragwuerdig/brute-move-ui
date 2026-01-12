import './EvaluationBar.css';

interface EvaluationBarProps {
  value: number;        // Centipawns (positive = white advantage)
  mate?: number | null; // Moves to mate (positive = white wins)
  orientation?: 'white' | 'black'; // Board orientation
}

export function EvaluationBar({ value, mate, orientation = 'white' }: EvaluationBarProps) {
  // Convert centipawns to percentage (capped at ±10 pawns)
  // 0 = 50%, +1000cp = 100%, -1000cp = 0%
  const cappedValue = Math.max(-1000, Math.min(1000, value));
  let percentage = 50 + (cappedValue / 20); // ±1000cp maps to 0-100%

  // For mate, show near 100% or 0%
  if (mate !== null && mate !== undefined) {
    percentage = mate > 0 ? 95 + Math.min(5, 5 / Math.abs(mate)) : 5 - Math.min(5, 5 / Math.abs(mate));
  }

  // If board is flipped (black orientation), flip the bar too
  if (orientation === 'black') {
    percentage = 100 - percentage;
  }

  // Format display value
  let displayValue: string;
  if (mate !== null && mate !== undefined) {
    displayValue = `M${Math.abs(mate)}`;
  } else {
    const pawns = value / 100;
    displayValue = pawns >= 0 ? `+${pawns.toFixed(1)}` : pawns.toFixed(1);
  }

  // Determine if white or black is winning for text color
  const whiteWinning = mate ? mate > 0 : value > 0;

  // CSS custom properties for both vertical and horizontal layouts
  const barStyle = {
    '--white-pct': `${percentage}%`,
    '--black-pct': `${100 - percentage}%`,
  } as React.CSSProperties;

  return (
    <div className="eval-bar" style={barStyle}>
      <div
        className="eval-bar__fill eval-bar__fill--white"
        style={{ height: `${percentage}%` }}
      />
      <div
        className="eval-bar__fill eval-bar__fill--black"
        style={{ height: `${100 - percentage}%` }}
      />
      <span className={`eval-bar__value ${whiteWinning ? 'eval-bar__value--white' : 'eval-bar__value--black'}`}>
        {displayValue}
      </span>
    </div>
  );
}
