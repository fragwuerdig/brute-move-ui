import React from 'react';
import './GlassCard.css';

interface GlassCardProps {
    children: React.ReactNode;
    className?: string;
    accent?: boolean;
    style?: React.CSSProperties;
}

export function GlassCard({ children, className = '', accent = false, style }: GlassCardProps) {
    const cardClass = `glass-card ${accent ? 'glass-card--accent' : ''} ${className}`.trim();

    return (
        <div className={cardClass} style={style}>
            {children}
        </div>
    );
}
