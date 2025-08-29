

import React from 'react';
import './LightCard.css';

export function LightCard({ children, sx }: { children: React.ReactNode; sx?: React.CSSProperties }) {
    return (
        <div className="light-card" style={sx}>
            {children}
        </div>
    );
}