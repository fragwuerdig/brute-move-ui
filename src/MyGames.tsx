import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchContractStateSmart, getGameDbAddr, getFactoryAddr, addressEllipsis, type JoinableGame } from './Common';
import { useWallet } from './WalletProvider';
import { GlassCard } from './GlassCard';
import { MsgExecuteContract } from '@goblinhunt/cosmes/client';
import type { UnsignedTx } from '@goblinhunt/cosmes/wallet';
import './MyGames.css';

// Game record from gamedb
interface GameRecord {
    id: number;
    game_address: string;
    factory_address: string;
    player_white: string;
    player_black: string;
    is_ongoing: boolean;
    creation_time: number;
    winner: string | null;
}

function MyGames() {
    const navigate = useNavigate();
    const { chain, connectedAddr, broadcast } = useWallet();

    const [myOngoingGames, setMyOngoingGames] = useState<GameRecord[]>([]);
    const [myFinishedGames, setMyFinishedGames] = useState<GameRecord[]>([]);
    const [otherOngoingGames, setOtherOngoingGames] = useState<GameRecord[]>([]);
    const [myChallenges, setMyChallenges] = useState<JoinableGame[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [cancellingId, setCancellingId] = useState<string | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    useEffect(() => {
        if (!chain || !connectedAddr) return;

        const fetchGames = async () => {
            setLoading(true);
            setError(null);

            try {
                const gameDbAddr = getGameDbAddr(chain);
                const factoryAddr = getFactoryAddr(chain);

                // Fetch user's ongoing games
                const myOngoing = await fetchContractStateSmart(
                    gameDbAddr,
                    { games_by_player: { player: connectedAddr, is_ongoing: true, limit: 50 } },
                    chain
                );

                // Fetch user's finished games
                const myFinished = await fetchContractStateSmart(
                    gameDbAddr,
                    { games_by_player: { player: connectedAddr, is_ongoing: false, limit: 20 } },
                    chain
                );

                // Fetch other ongoing games (by factory)
                const otherGames = await fetchContractStateSmart(
                    gameDbAddr,
                    { games_by_factory: { factory: factoryAddr, is_ongoing: true, limit: 20 } },
                    chain
                );

                // Fetch user's open challenges (joinable games)
                const allJoinable = await fetchContractStateSmart(
                    factoryAddr,
                    { joinable_games: { limit: 50, period: 60 * 60 * 24 * 30 } },
                    chain
                );
                const myOpenChallenges = (Array.isArray(allJoinable) ? allJoinable : []).filter(
                    (game: JoinableGame) => game.opponent === connectedAddr && !game.contract
                );

                setMyOngoingGames(Array.isArray(myOngoing) ? myOngoing : []);
                setMyFinishedGames(Array.isArray(myFinished) ? myFinished : []);
                setMyChallenges(myOpenChallenges);

                // Filter out user's own games from "other" list
                const filteredOther = (Array.isArray(otherGames) ? otherGames : []).filter(
                    (game: GameRecord) => game.player_white !== connectedAddr && game.player_black !== connectedAddr
                );
                setOtherOngoingGames(filteredOther);

            } catch (err) {
                console.error('Failed to fetch games:', err);
                setError('Failed to load games');
            } finally {
                setLoading(false);
            }
        };

        fetchGames();
    }, [chain, connectedAddr, refreshTrigger]);

    const handleOpenGame = (gameAddress: string) => {
        navigate(`/games/${gameAddress}`);
    };

    const handleCancelChallenge = async (gameId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!connectedAddr || cancellingId) return;

        setCancellingId(gameId);
        try {
            const msg = { remove_unaccepted_challenge: { game_id: gameId } };
            const tx: UnsignedTx = {
                msgs: [
                    new MsgExecuteContract({
                        sender: connectedAddr,
                        contract: getFactoryAddr(chain),
                        funds: [],
                        msg
                    }),
                ],
            };
            await broadcast(tx);
            setRefreshTrigger(prev => prev + 1);
        } catch (err) {
            console.error('Failed to cancel challenge:', err);
            alert('Failed to cancel challenge');
        } finally {
            setCancellingId(null);
        }
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

    const getOpponent = (game: GameRecord): string => {
        if (game.player_white === connectedAddr) {
            return addressEllipsis(game.player_black);
        }
        return addressEllipsis(game.player_white);
    };

    const getMyColor = (game: GameRecord): 'white' | 'black' => {
        return game.player_white === connectedAddr ? 'white' : 'black';
    };

    const getResultText = (game: GameRecord): string => {
        if (!game.winner) return 'Draw';
        if (game.winner === connectedAddr) return 'Won';
        return 'Lost';
    };

    const getResultClass = (game: GameRecord): string => {
        if (!game.winner) return 'mygames-result--draw';
        if (game.winner === connectedAddr) return 'mygames-result--won';
        return 'mygames-result--lost';
    };

    return (
        <div className="mygames-container">
            <div className="mygames-header">
                <h1 className="mygames-header__title">My Games</h1>
                <p className="mygames-header__subtitle">Track your ongoing and past games</p>
            </div>

            {loading && (
                <GlassCard accent>
                    <div className="mygames-loading">
                        <p>Loading games...</p>
                    </div>
                </GlassCard>
            )}

            {error && (
                <GlassCard accent>
                    <div className="mygames-error">
                        <p>{error}</p>
                    </div>
                </GlassCard>
            )}

            {!loading && !error && (
                <>
                    {/* Your Open Challenges */}
                    {myChallenges.length > 0 && (
                        <GlassCard accent>
                            <div className="mygames-section">
                                <h2 className="mygames-section__title">
                                    Your Open Challenges
                                </h2>
                                <p className="mygames-section__desc">Waiting for an opponent to join</p>
                                <div className="mygames-list">
                                    {myChallenges.map((challenge) => (
                                        <div
                                            key={challenge.id}
                                            className="mygames-game mygames-game--challenge"
                                            onClick={() => navigate(`/join/${challenge.id}`)}
                                        >
                                            <div className="mygames-game__color">
                                                <span className={`mygames-dot mygames-dot--${challenge.opponent_color?.toLowerCase() || 'white'}`} />
                                            </div>
                                            <div className="mygames-game__info">
                                                <span className="mygames-game__bet">{formatBet(challenge.bet)} LUNC</span>
                                                <span className="mygames-game__time">{formatTime(challenge.create_time)}</span>
                                            </div>
                                            <button
                                                className="mygames-cancel-btn"
                                                onClick={(e) => handleCancelChallenge(challenge.id, e)}
                                                disabled={cancellingId === challenge.id}
                                            >
                                                {cancellingId === challenge.id ? '...' : 'Cancel'}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </GlassCard>
                    )}

                    {/* My Ongoing Games */}
                    <GlassCard accent>
                        <div className="mygames-section">
                            <h2 className="mygames-section__title">
                                Ongoing Games
                            </h2>
                            {myOngoingGames.length === 0 ? (
                                <div className="mygames-empty">
                                    <p>No ongoing games</p>
                                    <button
                                        className="mygames-btn mygames-btn--create"
                                        onClick={() => navigate('/play')}
                                    >
                                        Find a Game
                                    </button>
                                </div>
                            ) : (
                                <div className="mygames-list">
                                    {myOngoingGames.map((game) => (
                                        <div
                                            key={game.id}
                                            className="mygames-game mygames-game--ongoing"
                                            onClick={() => handleOpenGame(game.game_address)}
                                        >
                                            <div className="mygames-game__color">
                                                <span className={`mygames-dot mygames-dot--${getMyColor(game)}`} />
                                            </div>
                                            <div className="mygames-game__info">
                                                <span className="mygames-game__opponent">vs {getOpponent(game)}</span>
                                                <span className="mygames-game__time">{formatTime(game.creation_time)}</span>
                                            </div>
                                            <div className="mygames-game__action">
                                                <span className="mygames-arrow">→</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </GlassCard>

                    {/* Game History */}
                    <GlassCard accent>
                        <div className="mygames-section">
                            <h2 className="mygames-section__title">
                                Game History
                            </h2>
                            {myFinishedGames.length === 0 ? (
                                <div className="mygames-empty">
                                    <p>No completed games yet</p>
                                </div>
                            ) : (
                                <div className="mygames-list">
                                    {myFinishedGames.map((game) => (
                                        <div
                                            key={game.id}
                                            className="mygames-game mygames-game--finished"
                                            onClick={() => handleOpenGame(game.game_address)}
                                        >
                                            <div className="mygames-game__color">
                                                <span className={`mygames-dot mygames-dot--${getMyColor(game)}`} />
                                            </div>
                                            <div className="mygames-game__info">
                                                <span className="mygames-game__opponent">vs {getOpponent(game)}</span>
                                                <span className="mygames-game__time">{formatTime(game.creation_time)}</span>
                                            </div>
                                            <div className={`mygames-result ${getResultClass(game)}`}>
                                                {getResultText(game)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </GlassCard>

                    {/* Live Games (spectate) */}
                    <GlassCard accent>
                        <div className="mygames-section">
                            <h2 className="mygames-section__title">
                                Live Games
                            </h2>
                            <p className="mygames-section__desc">Watch ongoing games from other players</p>
                            {otherOngoingGames.length === 0 ? (
                                <div className="mygames-empty">
                                    <p>No live games right now</p>
                                </div>
                            ) : (
                                <div className="mygames-list">
                                    {otherOngoingGames.map((game) => (
                                        <div
                                            key={game.id}
                                            className="mygames-game mygames-game--spectate"
                                            onClick={() => handleOpenGame(game.game_address)}
                                        >
                                            <div className="mygames-game__players">
                                                <span className="mygames-dot mygames-dot--white" />
                                                <span className="mygames-vs">vs</span>
                                                <span className="mygames-dot mygames-dot--black" />
                                            </div>
                                            <div className="mygames-game__info">
                                                <span className="mygames-game__matchup">
                                                    {addressEllipsis(game.player_white)} vs {addressEllipsis(game.player_black)}
                                                </span>
                                                <span className="mygames-game__time">{formatTime(game.creation_time)}</span>
                                            </div>
                                            <div className="mygames-game__action">
                                                <span className="mygames-watch">Watch</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </GlassCard>
                </>
            )}
        </div>
    );
}

export default MyGames;
