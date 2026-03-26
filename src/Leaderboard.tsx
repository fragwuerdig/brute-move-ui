import { AddressDisplay } from './components/AddressDisplay';
import { useGameMode } from './GameModeContext';
import './Leaderboard.css';

interface LeaderboardEntry {
    address: string;
    elo: number;
}

interface LeaderboardProps {
    entries: LeaderboardEntry[];
    currentUser?: string;
}

function Leaderboard({ entries, currentUser }: LeaderboardProps) {
    const { mode } = useGameMode();
    return (
        <div className="leaderboard">
            <div className="leaderboard__header">
                <h2 className="leaderboard__title">
                    Leaderboard
                    <span className={`mode-badge mode-badge--${mode}`}>{mode}</span>
                </h2>
            </div>
            <div className="leaderboard__table">
                <div className="leaderboard__row leaderboard__row--header">
                    <span className="leaderboard__cell leaderboard__cell--rank">#</span>
                    <span className="leaderboard__cell leaderboard__cell--address">Player</span>
                    <span className="leaderboard__cell leaderboard__cell--elo">ELO</span>
                </div>
                {entries.map((entry, index) => {
                    const rank = index + 1;
                    const isCurrentUser = currentUser === entry.address;
                    const isTopThree = rank <= 3;

                    return (
                        <div
                            key={entry.address}
                            className={`leaderboard__row ${isCurrentUser ? 'leaderboard__row--current' : ''} ${isTopThree ? `leaderboard__row--top${rank}` : ''}`}
                        >
                            <span className={`leaderboard__cell leaderboard__cell--rank ${isTopThree ? `leaderboard__rank--${rank}` : ''}`}>
                                {isTopThree ? (
                                    <span className="leaderboard__medal">{rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}</span>
                                ) : rank}
                            </span>
                            <span className="leaderboard__cell leaderboard__cell--address">
                                {isCurrentUser ? (
                                    <span className="leaderboard__you">You</span>
                                ) : (
                                    <AddressDisplay address={entry.address} />
                                )}
                            </span>
                            <span className="leaderboard__cell leaderboard__cell--elo">
                                {entry.elo.toLocaleString()}
                            </span>
                        </div>
                    );
                })}
                {entries.length === 0 && (
                    <div className="leaderboard__empty">
                        No players yet
                    </div>
                )}
            </div>
        </div>
    );
}

export default Leaderboard;
