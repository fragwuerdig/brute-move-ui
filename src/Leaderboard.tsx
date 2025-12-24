import { addressEllipsis } from './Common';
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
    return (
        <div className="leaderboard">
            <div className="leaderboard__header">
                <h2 className="leaderboard__title">Leaderboard</h2>
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
                                    addressEllipsis(entry.address)
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
