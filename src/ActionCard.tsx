import { useState } from "react";
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
    canClaimReward?: boolean;
}

// Checkmark circle icon SVG (settle/finalize)
const SettleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M9 12l2 2 4-4" />
    </svg>
);

// Flag icon SVG (resign)
const FlagIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
        <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
);

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

// Dollar/Reward icon SVG
const RewardIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
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
    showClaimReward,
    canClaimReward = true
}: ActionCardProps) {
    const [showResignModal, setShowResignModal] = useState(false);
    const [showSettleModal, setShowSettleModal] = useState(false);
    const [showClaimModal, setShowClaimModal] = useState(false);

    const handleResignClick = () => {
        setShowResignModal(true);
    };

    const handleResignConfirm = () => {
        setShowResignModal(false);
        onRetreatClicked?.();
    };

    const handleSettleClick = () => {
        setShowSettleModal(true);
    };

    const handleSettleConfirm = () => {
        setShowSettleModal(false);
        onSettleClicked?.();
    };

    const handleClaimClick = () => {
        setShowClaimModal(true);
    };

    const handleClaimConfirm = () => {
        setShowClaimModal(false);
        onClaimRewardClicked?.();
    };

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
                        <span className="draw-toggle__label--full">Offer Draw</span>
                        <span className="draw-toggle__label--short">Draw?</span>
                    </span>
                </div>

                {/* Action Buttons */}
                <div className="action-buttons">
                    {!showClaimReward && (
                        showSettle ? (
                            <button
                                className="action-btn action-btn--primary"
                                onClick={handleSettleClick}
                                aria-label="Settle"
                            >
                                <SettleIcon />
                            </button>
                        ) : (
                            <button
                                className="action-btn action-btn--danger-icon"
                                disabled={disabled}
                                onClick={handleResignClick}
                                aria-label="Resign"
                            >
                                <FlagIcon />
                            </button>
                        )
                    )}

                    {showClaimReward && (
                        <button
                            className={`action-btn ${canClaimReward ? 'action-btn--success' : 'action-btn--ghost'}`}
                            onClick={canClaimReward ? handleClaimClick : undefined}
                            disabled={!canClaimReward}
                            aria-label="Claim Reward"
                        >
                            <RewardIcon />
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

            {/* Resign Confirmation Modal */}
            {showResignModal && (
                <div className="action-modal-overlay" onClick={() => setShowResignModal(false)}>
                    <div className="action-modal" onClick={(e) => e.stopPropagation()}>
                        <h3 className="action-modal__title">Resign Game?</h3>
                        <p className="action-modal__message">
                            Are you sure you want to resign? This will forfeit the game and your opponent will win.
                        </p>
                        <div className="action-modal__actions">
                            <button
                                className="action-modal__btn action-modal__btn--secondary"
                                onClick={() => setShowResignModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="action-modal__btn action-modal__btn--danger"
                                onClick={handleResignConfirm}
                            >
                                Resign
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Settle Confirmation Modal */}
            {showSettleModal && (
                <div className="action-modal-overlay" onClick={() => setShowSettleModal(false)}>
                    <div className="action-modal" onClick={(e) => e.stopPropagation()}>
                        <h3 className="action-modal__title">Settle Game?</h3>
                        <p className="action-modal__message">
                            This will finalize the game on-chain. The player who timed out will lose and their opponent will be declared the winner.
                        </p>
                        <div className="action-modal__actions">
                            <button
                                className="action-modal__btn action-modal__btn--secondary"
                                onClick={() => setShowSettleModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="action-modal__btn action-modal__btn--primary"
                                onClick={handleSettleConfirm}
                            >
                                Settle
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Claim Reward Confirmation Modal */}
            {showClaimModal && (
                <div className="action-modal-overlay" onClick={() => setShowClaimModal(false)}>
                    <div className="action-modal" onClick={(e) => e.stopPropagation()}>
                        <h3 className="action-modal__title">Claim Reward?</h3>
                        <p className="action-modal__message">
                            This will transfer your winnings from the game to your wallet.
                        </p>
                        <div className="action-modal__actions">
                            <button
                                className="action-modal__btn action-modal__btn--secondary"
                                onClick={() => setShowClaimModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="action-modal__btn action-modal__btn--success"
                                onClick={handleClaimConfirm}
                            >
                                Claim
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
