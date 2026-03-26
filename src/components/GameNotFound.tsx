import { GlassCard } from '../GlassCard';
import './GameNotFound.css';

interface GameNotFoundProps {
  title?: string;
  subtitle?: string;
}

export function GameNotFound({
  title = 'Game not found.',
  subtitle = 'This game contract is invalid, unavailable, or not a valid BruteMove! game.',
}: GameNotFoundProps) {
  return (
    <div className="game-not-found">
      <GlassCard accent>
        <div className="game-not-found__content">
          <p className="game-not-found__title">{title}</p>
          <img src="/broken.png" alt="Broken king piece" className="game-not-found__image" />
          <p className="game-not-found__subtitle">{subtitle}</p>
        </div>
      </GlassCard>
    </div>
  );
}
