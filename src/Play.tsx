import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchContractStateSmart, getFactoryAddr, type JoinableGame } from './Common';
import { useWallet } from './WalletProvider';
import { GlassCard } from './GlassCard';
import { AddressDisplay } from './components/AddressDisplay';
import './Play.css';

type PeriodOption = {
    label: string;
    value: number | null; // null = all time
};

const PERIOD_OPTIONS: PeriodOption[] = [
    { label: '24 hours', value: 60 * 60 * 24 },
    { label: '7 days', value: 60 * 60 * 24 * 7 },
    { label: '30 days', value: 60 * 60 * 24 * 30 },
    { label: 'All time', value: 60 * 60 * 24 * 365 * 10 }, // 10 years as "all time"
];

function Play() {
    const navigate = useNavigate();
    const { chain, connectedAddr, connect, connected } = useWallet();
    const [games, setGames] = useState<JoinableGame[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [period, setPeriod] = useState<number | null>(PERIOD_OPTIONS[0].value);

    useEffect(() => {
        if (!chain) return;

        setLoading(true);
        setError(null);

        const query = {
            joinable_games: {
                limit: 20,
                ...(period !== null && { period })
            }
        };

        fetchContractStateSmart(getFactoryAddr(chain), query, chain)
            .then((data: JoinableGame[]) => {
                // Filter out:
                // - games created by the current user
                // - games that already have a contract assigned (already joined)
                // - games with a recipient (directed challenges) unless we are the recipient
                const availableGames = data.filter(game =>
                    game.opponent !== connectedAddr &&
                    !game.contract &&
                    (!game.recipient || game.recipient === connectedAddr)
                );
                setGames(availableGames);
            })
            .catch((err) => {
                console.error('Failed to fetch joinable games:', err);
                setError('Failed to load games');
            })
            .finally(() => {
                setLoading(false);
            });
    }, [chain, connectedAddr, period]);

    const handleJoinGame = (gameId: string) => {
        navigate(`/join/${gameId}`);
    };

    const formatBet = (bet: number) => {
        return (bet / 1_000_000).toFixed(2);
    };

    const formatTime = (timestamp: number) => {
        const now = Math.floor(Date.now() / 1000);
        const diff = now - timestamp;

        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
    };

    return (
        <div className="play-container">
            <div className="play-header">
                <h1 className="play-header__title">Quick Play</h1>
                <p className="play-header__subtitle">Find an open game and jump right in</p>
                <div className="play-period-filter">
                    {PERIOD_OPTIONS.map((option) => (
                        <button
                            key={option.label}
                            className={`play-period-btn ${period === option.value ? 'play-period-btn--active' : ''}`}
                            onClick={() => setPeriod(option.value)}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>

            <GlassCard accent>
                <div className="play-content">
                    {loading && (
                        <div className="play-loading">
                            <p>Searching for games...</p>
                        </div>
                    )}

                    {error && (
                        <div className="play-error">
                            <p>{error}</p>
                        </div>
                    )}

                    {!loading && !error && games.length === 0 && (
                        <div className="play-empty">
                            <p className="play-empty__title">No open games</p>
                            <p className="play-empty__desc">Be the first to create one!</p>
                            {connected ? (
                                <button
                                    className="play-btn play-btn--create"
                                    onClick={() => navigate('/create')}
                                >
                                    Create Game
                                </button>
                            ) : (
                                <button
                                    className="play-btn play-btn--create"
                                    onClick={connect}
                                >
                                    Connect to Create
                                </button>
                            )}
                        </div>
                    )}

                    {!loading && !error && games.length > 0 && (
                        <div className="play-games">
                            <h2 className="play-games__title">Available Games</h2>
                            <div className="play-games__list">
                                {games.map((game) => (
                                    <div key={game.id} className="play-game">
                                        <div className="play-game__info">
                                            <div className="play-game__challenger">
                                                <span className="play-game__label">by</span>
                                                <AddressDisplay address={game.opponent} />
                                            </div>
                                            <div className="play-game__bet">
                                                <span className="play-game__bet-value">{formatBet(game.bet)}</span>
                                                <span className="play-game__bet-label">LUNC</span>
                                            </div>
                                            <div className="play-game__details">
                                                <span className="play-game__color">
                                                    Play as {game.opponent_color === 'White' ? 'Black' : game.opponent_color === 'Black' ? 'White' : 'Random'}
                                                </span>
                                                <span className="play-game__time">{formatTime(game.create_time)}</span>
                                            </div>
                                        </div>
                                        {connected ? (
                                            <button
                                                className="play-btn play-btn--join"
                                                onClick={() => handleJoinGame(game.id)}
                                            >
                                                Join
                                            </button>
                                        ) : (
                                            <button
                                                className="play-btn play-btn--join"
                                                onClick={connect}
                                            >
                                                Connect
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </GlassCard>
        </div>
    );
}

export default Play;
