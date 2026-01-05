import { GlassCard } from "./GlassCard";
import './ActionCard.css';

interface ActionCardProps {
    offerDraw?: boolean;
    variant?: 'compact' | 'default';
    disabled?: boolean;
    onChange?: (value: boolean) => void;
    onRetreatClicked?: () => void;
    onShareClicked?: () => void;
    onSettleClicked?: () => void;
    onClaimRewardClicked?: () => void;
    onExploreClicked?: () => void;
    showSettle?: boolean;
    showClaimReward?: boolean;
}

// Share icon SVG
const ShareIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
);

// Explore icon SVG (compass)
const ExploreIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
);

export function ActionCard({
    offerDraw,
    disabled,
    onChange,
    onRetreatClicked,
    onShareClicked,
    onSettleClicked,
    onClaimRewardClicked,
    onExploreClicked,
    showSettle,
    showClaimReward
}: ActionCardProps) {
    return (
        <div className="action-bar">
            <GlassCard>
                {/* Draw Offer Toggle */}
                <div className="draw-toggle">
                    <button
                        className={`toggle-switch ${offerDraw ? 'toggle-switch--active' : ''} ${disabled ? 'toggle-switch--disabled' : ''}`}
                        onClick={() => !disabled && onChange?.(!offerDraw)}
                        disabled={disabled}
                        aria-label="Toggle draw offer"
                    />
                    <span
                        className={`draw-toggle__label ${offerDraw ? 'draw-toggle__label--active' : ''}`}
                        onClick={() => !disabled && onChange?.(!offerDraw)}
                    >
                        Offer Draw
                    </span>
                </div>

                {/* Action Buttons */}
                <div className="action-buttons">
                    <button
                        className="action-btn action-btn--danger"
                        disabled={disabled}
                        onClick={onRetreatClicked}
                    >
                        Resign
                    </button>

                    {showSettle && (
                        <button
                            className="action-btn action-btn--primary"
                            onClick={onSettleClicked}
                        >
                            Settle
                        </button>
                    )}

                    {showClaimReward && (
                        <button
                            className="action-btn action-btn--success"
                            onClick={onClaimRewardClicked}
                        >
                            Claim Reward
                        </button>
                    )}

                    <button
                        className="action-btn action-btn--ghost"
                        onClick={onExploreClicked}
                        aria-label="Explore position"
                    >
                        <ExploreIcon />
                    </button>

                    <button
                        className="action-btn action-btn--ghost"
                        onClick={onShareClicked}
                        aria-label="Share game"
                    >
                        <ShareIcon />
                    </button>
                </div>
            </GlassCard>
        </div>
    );
}
