import React, { useState, useEffect } from 'react';
import { GlassCard } from './GlassCard';
import { AddressDisplay } from './components/AddressDisplay';
import './TurnIndicator.css';

interface TurnIndicatorProps {
    players: string[];
    player?: string;
    variant?: 'default' | 'compact';
    activeTurn?: 'white' | 'black';
    secLeft?: number;
    remainingTimes?: [number, number];
    timeoutVariant: 'no-show' | 'turn';
    gameTimedOut?: 'no-show' | 'turn';
    gameFinished?: boolean;
    winner?: 'white' | 'black' | undefined;
}

const TurnIndicator: React.FC<TurnIndicatorProps> = ({
    activeTurn,
    secLeft,
    remainingTimes,
    timeoutVariant,
    players,
    player,
    gameTimedOut,
    gameFinished,
    winner
}) => {
    const [seconds, setSeconds] = useState(secLeft || 0);
    const [playerSeconds, setPlayerSeconds] = useState<[number, number]>(remainingTimes || [0, 0]);

    const formatClock = (totalSeconds: number): string => {
        const safe = Math.max(0, totalSeconds);
        const days = Math.floor(safe / 86400);
        const rest = safe % 86400;
        const hours = Math.floor(rest / 3600);
        const mins = Math.floor((rest % 3600) / 60);
        const secs = rest % 60;

        if (days > 0) {
            return `${days}d ${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
        }
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    useEffect(() => {
        setSeconds(secLeft || 0);
    }, [secLeft]);

    useEffect(() => {
        if (remainingTimes) {
            setPlayerSeconds([remainingTimes[0], remainingTimes[1]]);
        }
    }, [remainingTimes]);

    useEffect(() => {
        if (seconds <= 0) return;
        const timer = setInterval(() => {
            setSeconds(prev => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(timer);
    }, [seconds]);

    useEffect(() => {
        if (gameFinished || gameTimedOut || timeoutVariant === 'no-show') return;
        if (!activeTurn) return;

        const timer = setInterval(() => {
            setPlayerSeconds(prev => {
                const idx = activeTurn === 'white' ? 0 : 1;
                const next: [number, number] = [prev[0], prev[1]];
                next[idx] = Math.max(0, next[idx] - 1);
                return next;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [activeTurn, gameFinished, gameTimedOut, timeoutVariant]);

    const getTimerClass = () => {
        if (gameFinished) return 'timer-badge--finished';
        if (gameTimedOut) return 'timer-badge--timeout';
        if (seconds <= 60) return 'timer-badge--danger';
        if (seconds <= 300) return 'timer-badge--warning';
        return '';
    };

    const getTimerContent = () => {
        if (gameFinished) {
            if (winner === 'white') return { label: 'Winner', time: 'White' };
            if (winner === 'black') return { label: 'Winner', time: 'Black' };
            return { label: 'Result', time: 'Draw' };
        }
        if (gameTimedOut) {
            return {
                label: 'Timeout',
                time: gameTimedOut === 'no-show' ? 'No-Show' : 'Move'
            };
        }
        return {
            label: timeoutVariant === 'no-show' ? 'No-Show' : 'Move',
            time: formatClock(seconds)
        };
    };

    const getPlayerName = (index: number): React.ReactNode => {
        if (players.length <= index) return '???';
        if (players[index] === player) return 'You';
        return <AddressDisplay address={players[index]} />;
    };

    const isYou = (index: number) => players.length > index && players[index] === player;
    const showPlayerClocks = timeoutVariant !== 'no-show' && !gameFinished && !gameTimedOut;
    const getPlayerClockClass = (index: number) => {
        const s = playerSeconds[index] || 0;
        if (s <= 60) return 'player-time--danger';
        if (s <= 300) return 'player-time--warning';
        return '';
    };

    const timerContent = getTimerContent();

    return (
        <div className="turn-indicator">
            <GlassCard>
                <div className="players-container">
                    {/* White Player */}
                    <div className="player-info">
                        <div className={`player-badge player-badge--white ${activeTurn === 'white' && !gameFinished ? 'player-badge--active' : ''}`} />
                        <span className={`player-name ${activeTurn === 'white' ? 'player-name--active' : ''} ${isYou(0) ? 'player-name--you' : ''}`}>
                            {getPlayerName(0)}
                        </span>
                        {showPlayerClocks && (
                            <span className={`player-time ${getPlayerClockClass(0)}`}>
                                {formatClock(playerSeconds[0] || 0)}
                            </span>
                        )}
                    </div>

                    <span className="vs-divider">vs</span>

                    {/* Black Player */}
                    <div className="player-info player-info--reverse">
                        <div className={`player-badge player-badge--black ${activeTurn === 'black' && !gameFinished ? 'player-badge--active' : ''}`} />
                        <span className={`player-name ${activeTurn === 'black' ? 'player-name--active' : ''} ${isYou(1) ? 'player-name--you' : ''}`}>
                            {getPlayerName(1)}
                        </span>
                        {showPlayerClocks && (
                            <span className={`player-time ${getPlayerClockClass(1)}`}>
                                {formatClock(playerSeconds[1] || 0)}
                            </span>
                        )}
                    </div>
                </div>

                {/* Timer */}
                <div className={`timer-badge ${getTimerClass()}`}>
                    <span className="timer-badge__label">{timerContent.label}</span>
                    <span className="timer-badge__time">{timerContent.time}</span>
                </div>
            </GlassCard>
        </div>
    );
};

export default TurnIndicator;
