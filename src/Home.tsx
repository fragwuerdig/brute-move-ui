import React, { useEffect, useState } from 'react';
import { useNavigate } from "react-router-dom";
import { fetchContractStateSmart, getFactoryAddr, type JoinableGame } from './Common';
import { useWallet } from './WalletProvider';
import { GlassCard } from './GlassCard';
import { Input } from './Input';
import './Home.css';

export interface SavedGame {
    address: string;
    name: string;
}

export const STORE_KEY_SAVED_GAMES = "savedGames";

// Icons
const PlusIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
);

const ArrowRightIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="5" y1="12" x2="19" y2="12" />
        <polyline points="12 5 19 12 12 19" />
    </svg>
);

const Home: React.FC = () => {
    const navigate = useNavigate();
    const { chain } = useWallet();

    const [gameIdSearch, setGameIdSearch] = useState<string>("");
    const [joinableGameId, setJoinableGameId] = useState<string>("");
    const [isSearching, setIsSearching] = useState<boolean>(false);
    const [isValidGame, setIsValidGame] = useState<boolean>(false);

    const handleSearch = (searchTerm: string) => {
        setGameIdSearch(searchTerm);

        if (!searchTerm.trim()) {
            setIsValidGame(false);
            setJoinableGameId("");
            return;
        }

        setIsSearching(true);
        fetchContractStateSmart(getFactoryAddr(chain), { joinable_game: { id: searchTerm.toLowerCase() } }, chain)
            .then((data: JoinableGame) => {
                if (data && data.id) {
                    setIsValidGame(true);
                    setJoinableGameId(data.id);
                } else {
                    setIsValidGame(false);
                    setJoinableGameId("");
                }
            })
            .catch(() => {
                setIsValidGame(false);
                setJoinableGameId("");
            })
            .finally(() => {
                setIsSearching(false);
            });
    };

    useEffect(() => {
        // Load any saved state if needed
    }, []);

    return (
        <div className="home-container">
            {/* Hero */}
            <div className="home-hero">
                <h1 className="home-hero__title">Play Chess On-Chain</h1>
                <p className="home-hero__subtitle">Stake, play, and win on Terra Classic</p>
            </div>

            {/* Quick Play Card */}
            <GlassCard accent className="home-quickplay">
                <div className="home-quickplay__content">
                    <h2 className="home-quickplay__title">Quick Play</h2>
                    <p className="home-quickplay__desc">Find an open game and jump right in</p>
                    <div className="home-quickplay__buttons">
                        <button className="home-btn home-btn--play" onClick={() => navigate('/play')}>
                            Play
                        </button>
                        <button className="home-btn home-btn--secondary" onClick={() => navigate('/games')}>
                            Games
                        </button>
                    </div>
                </div>
            </GlassCard>

            {/* Main Card */}
            <GlassCard accent>
                <div className="home-search">
                    <h2 className="home-search__title">Join a Game</h2>
                    <div className="home-search__row">
                        <div className="home-search__input">
                            <Input
                                placeholder="Enter Game ID..."
                                value={gameIdSearch}
                                onChange={handleSearch}
                            />
                        </div>
                    </div>
                </div>

                <div className="home-actions">
                    <button
                        className="home-btn home-btn--secondary"
                        onClick={() => navigate('/create')}
                    >
                        <PlusIcon />
                        Create Game
                    </button>
                    <button
                        className="home-btn home-btn--primary"
                        onClick={() => navigate(`/join/${joinableGameId}`)}
                        disabled={!isValidGame || isSearching}
                    >
                        Join Game
                        <ArrowRightIcon />
                    </button>
                </div>
            </GlassCard>

            {/* Features */}
            <div className="home-divider">
                <div className="home-divider__line" />
                <span className="home-divider__text">Why BruteMove?</span>
                <div className="home-divider__line" />
            </div>

            <div className="home-features">
                <div className="home-feature">
                    <div className="home-feature__icon">&#9813;</div>
                    <h3 className="home-feature__title">On-Chain</h3>
                    <p className="home-feature__desc">All moves verified on blockchain</p>
                </div>
                <div className="home-feature">
                    <div className="home-feature__icon">&#128176;</div>
                    <h3 className="home-feature__title">Stake & Win</h3>
                    <p className="home-feature__desc">Bet LUNC on your games</p>
                </div>
                <div className="home-feature">
                    <div className="home-feature__icon">&#128274;</div>
                    <h3 className="home-feature__title">Trustless</h3>
                    <p className="home-feature__desc">Smart contract escrow</p>
                </div>
                <div className="home-feature">
                    <div className="home-feature__icon">&#9889;</div>
                    <h3 className="home-feature__title">Fast</h3>
                    <p className="home-feature__desc">Quick settlement times</p>
                </div>
            </div>
        </div>
    );
};

export default Home;
