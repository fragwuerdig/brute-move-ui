import React, { useState, useEffect } from 'react';
import { GlassCard } from './GlassCard';
import './TurnIndicator.css';
import { addressEllipsis } from './Common';

interface TurnIndicatorProps {
    players: string[];
    player?: string;
    variant?: 'default' | 'compact';
    activeTurn?: 'white' | 'black';
    secLeft?: number;
    timeoutVariant: 'no-show' | 'turn';
    gameTimedOut?: 'no-show' | 'turn';
    gameFinished?: boolean;
    winner?: 'white' | 'black' | undefined;
}

const TurnIndicator: React.FC<TurnIndicatorProps> = ({
    activeTurn,
    secLeft,
    timeoutVariant,
    players,
    player,
    gameTimedOut,
    gameFinished,
    winner
}) => {
    const [seconds, setSeconds] = useState(secLeft || 0);
    const [formattedTime, setFormattedTime] = useState('00:00');

    useEffect(() => {
        setSeconds(secLeft || 0);
    }, [secLeft]);

    useEffect(() => {
        if (seconds <= 0) return;
        const timer = setInterval(() => {
            setSeconds(prev => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(timer);
    }, [seconds]);

    useEffect(() => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        setFormattedTime(
            `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
        );
    }, [seconds]);

    const getTimerClass = () => {
        if (gameFinished) return 'timer-badge--finished';
        if (gameTimedOut) return 'timer-badge--timeout';
        if (seconds <= 30) return 'timer-badge--danger';
        if (seconds <= 120) return 'timer-badge--warning';
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
            time: formattedTime
        };
    };

    const getPlayerName = (index: number) => {
        if (players.length <= index) return '???';
        if (players[index] === player) return 'You';
        return addressEllipsis(players[index]);
    };

    const isYou = (index: number) => players.length > index && players[index] === player;

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
                    </div>

                    <span className="vs-divider">vs</span>

                    {/* Black Player */}
                    <div className="player-info player-info--reverse">
                        <div className={`player-badge player-badge--black ${activeTurn === 'black' && !gameFinished ? 'player-badge--active' : ''}`} />
                        <span className={`player-name ${activeTurn === 'black' ? 'player-name--active' : ''} ${isYou(1) ? 'player-name--you' : ''}`}>
                            {getPlayerName(1)}
                        </span>
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
