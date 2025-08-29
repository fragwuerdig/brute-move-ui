
import React, { useState } from 'react';
import { LightCard } from './LightCard';
import { Divider } from '@mui/material';
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

const TurnIndicator: React.FC<TurnIndicatorProps> = ({ variant, activeTurn, secLeft, timeoutVariant, players, player, gameTimedOut, gameFinished, winner }) => {

    const [seconds, setSeconds] = useState(secLeft || 0);
    const [formattedTime, setFormattedTime] = useState('00:00');

    React.useEffect(() => {
        setSeconds(secLeft || 0);
    }, [secLeft]);

    React.useEffect(() => {
        if (seconds <= 0) return;
        const timer = setInterval(() => {
            setSeconds(prev => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(timer);
    }, [seconds]);

    React.useEffect(() => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        setFormattedTime(
            `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
        );
    }, [seconds]);

    const getGameClockIndicator = (
        gameFinished?: boolean, winner?: 'white' | 'black' | undefined,
        gameTimedOut?: 'no-show' | 'turn' | undefined,
        timeoutVariant?: 'no-show' | 'turn' | undefined
    ): any => {
        if (gameFinished) {
            if (winner === 'white') return (<div className='timer'><p>Game Over - White Wins!</p></div>);
            else if (winner === 'black') return (<div className='timer'><p>Game Over - Black Wins!</p></div>);
            else return (<div className='timer'><p>Game Over - Draw!</p></div>);
        }
        if (gameTimedOut) {
            if (gameTimedOut === 'no-show') return (<div className='timer'><p>Timeout No-Show</p></div>);
            else if (gameTimedOut === 'turn') return (<div className='timer'><p>Timeout Move</p></div>);
        }
        return (<div className='timer'><p>{timeoutVariant === 'no-show' ? 'No-Show:' : 'Move:'} {formattedTime}</p></div>);
    }

    return (
        <div className={`${variant}`}>
            <LightCard>
                <div className='player-label-container'>
                    <div className={`white-batch ${activeTurn === 'white' ? ' active-turn' : ''}`}></div>
                    <div>{players.length > 0 ? ( players[0] === player ? 'You' : addressEllipsis(players[0]) ) : ( '???' )}</div>
                </div>
                <Divider sx={{ margin: 1 }} />
                <div className='player-label-container'>
                    <div className={`black-batch ${activeTurn === 'black' ? ' active-turn' : ''}`}></div>
                    <div>{players.length > 1 ? ( players[1] === player ? 'You' : addressEllipsis(players[1]) ) : '???'}</div>
                </div>
                { getGameClockIndicator( gameFinished, winner, gameTimedOut, timeoutVariant ) }
            </LightCard>
        </div>
    );
};

export default TurnIndicator;