import { useEffect, useState } from 'react';
import { MsgExecuteContract } from '@goblinhunt/cosmes/client';
import type { UnsignedTx } from '@goblinhunt/cosmes/wallet';
import { fetchBankBalance, fetchContractStateSmart, getFactoryAddr } from './Common';
import { useWallet } from './WalletProvider';
import { GlassCard } from './GlassCard';
import { Input } from './Input';
import './Create.css';

type ColorChoice = 'White' | 'Black' | 'Random';

interface ModalState {
    open: boolean;
    closable?: boolean;
    message: string;
    gameId?: string;
    redirect?: string;
}

function Create() {
    const [color, setColor] = useState<ColorChoice>('Random');
    const { connectedAddr, broadcast, chain } = useWallet();
    const [modal, setModal] = useState<ModalState>({ open: false, message: '' });

    const [betAmount, setBetAmount] = useState<number>(0);
    const [minBetAmount, setMinBetAmount] = useState(1);
    const [disabledButton, setDisabledButton] = useState(false);
    const [disabledText, setDisabledText] = useState('');
    const [fee, setFee] = useState(1);
    const [refresh, setRefresh] = useState(0);

    // Fetch fees
    useEffect(() => {
        if (!chain) return;
        const query = { fee: { bet: (betAmount * 1000000).toString() } };
        fetchContractStateSmart(getFactoryAddr(chain), query)
            .then((data) => setFee(parseFloat(data) / 1000000))
            .catch(() => setFee(0));
    }, [betAmount, chain]);

    // Fetch minimum bet
    useEffect(() => {
        const query = { minimum_bet: {} };
        fetchContractStateSmart(getFactoryAddr(chain), query)
            .then((data) => setMinBetAmount(data))
            .catch(() => { });
    }, [chain]);

    // Check balance
    useEffect(() => {
        fetchBankBalance(connectedAddr || "", 'uluna')
            .then((data) => {
                const balance = parseFloat(data);
                if (isNaN(balance) || isNaN(minBetAmount) || isNaN(betAmount)) {
                    setDisabledButton(true);
                    setDisabledText('Invalid value');
                } else if (minBetAmount > balance) {
                    setDisabledButton(true);
                    setDisabledText(`Minimum bet exceeds your balance (${balance.toFixed(2)} LUNC)`);
                } else if (balance < betAmount) {
                    setDisabledButton(true);
                    setDisabledText(`Insufficient balance (${balance.toFixed(2)} LUNC)`);
                } else if (minBetAmount > betAmount) {
                    setDisabledButton(true);
                    setDisabledText(`Minimum bet is ${minBetAmount} LUNC`);
                } else {
                    setDisabledButton(false);
                    setDisabledText('');
                }
            })
            .catch(() => { });
    }, [refresh, betAmount, connectedAddr, minBetAmount]);

    // Refresh every 60s
    useEffect(() => {
        const interval = setInterval(() => setRefresh(prev => prev + 1), 60000);
        return () => clearInterval(interval);
    }, []);

    const handleCreate = () => {
        if (!connectedAddr) return;

        const msg = {
            create_joinable_game: {
                with_color: color === 'Random' ? null : color,
            }
        };
        const bet = `${betAmount + fee}000000`;
        const tx: UnsignedTx = {
            msgs: [
                new MsgExecuteContract({
                    sender: connectedAddr,
                    contract: getFactoryAddr(chain),
                    funds: [{ denom: 'uluna', amount: bet }],
                    msg
                }),
            ],
            memo: "Create a new game",
        };

        setModal({ open: true, message: 'Creating game...', closable: false });

        broadcast(tx)
            .then((result) => {
                const wasmEvents = result.txResponse.events.filter(event => event.type === 'wasm');
                const gameId = wasmEvents[0]?.attributes.find(attr => attr.key === 'game_id')?.value;
                if (gameId) {
                    setModal({
                        open: true,
                        message: 'Game created! Share this ID with your opponent:',
                        gameId,
                        closable: true,
                        redirect: `/join/${gameId}`
                    });
                } else {
                    setModal({ open: true, message: 'Game created but ID not found', closable: true });
                }
            })
            .catch((error) => {
                setModal({ open: true, message: `Failed: ${error.message}`, closable: true });
            });
    };

    const copyGameId = () => {
        if (modal.gameId) {
            navigator.clipboard.writeText(modal.gameId);
        }
    };

    return (
        <div className="create-container">
            {/* Header */}
            <div className="create-header">
                <h1 className="create-header__title">Create Challenge</h1>
                <p className="create-header__subtitle">Set your terms and stake your claim</p>
            </div>

            {/* Main Form */}
            <GlassCard accent>
                {/* Color Selection */}
                <div className="create-section">
                    <h2 className="create-section__title">Choose Your Color</h2>
                    <div className="color-options">
                        {(['White', 'Black', 'Random'] as ColorChoice[]).map((c) => (
                            <button
                                key={c}
                                className={`color-option ${color === c ? 'color-option--selected' : ''}`}
                                onClick={() => setColor(c)}
                            >
                                <div className={`color-option__badge color-option__badge--${c.toLowerCase()}`}>
                                    {c === 'Random' ? '?' : ''}
                                </div>
                                <span className="color-option__label">{c}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="create-divider" />

                {/* Bet Amount */}
                <div className="create-section">
                    <h2 className="create-section__title">Bet Amount</h2>
                    <p className="create-section__desc">
                        Your opponent must match this amount to join the game.
                    </p>
                    <div className="bet-input-wrapper">
                        <Input
                            placeholder="Enter amount..."
                            onChange={(e) => setBetAmount(parseInt(e) || 0)}
                        />
                        <span className="bet-currency">LUNC</span>
                    </div>
                </div>

                {/* Fee Info */}
                <div className="fee-info">
                    <div className="fee-row">
                        <span className="fee-row__label">Platform Fee</span>
                        <span className="fee-row__value">{fee.toFixed(4)} LUNC</span>
                    </div>
                    <div className="fee-row">
                        <span className="fee-row__label">Minimum Bet</span>
                        <span className="fee-row__value">{minBetAmount} LUNC</span>
                    </div>
                    <div className="fee-row">
                        <span className="fee-row__label">Total Required</span>
                        <span className="fee-row__value">{(betAmount + fee).toFixed(4)} LUNC</span>
                    </div>
                </div>

                {/* Error */}
                {disabledText && (
                    <div className="create-error">{disabledText}</div>
                )}

                {/* Submit */}
                <button
                    className="create-btn"
                    disabled={!connectedAddr || disabledButton}
                    onClick={handleCreate}
                >
                    Create Game
                </button>
            </GlassCard>

            {/* Modal */}
            {modal.open && (
                <div className="create-modal-overlay" onClick={() => modal.closable && setModal({ open: false, message: '' })}>
                    <div className="create-modal" onClick={(e) => e.stopPropagation()}>
                        <h3 className="create-modal__title">
                            {modal.gameId ? 'Game Created!' : 'Processing...'}
                        </h3>
                        <p className="create-modal__message">{modal.message}</p>

                        {modal.gameId && (
                            <div
                                className="create-modal__game-id"
                                onClick={copyGameId}
                                title="Click to copy"
                            >
                                {modal.gameId}
                            </div>
                        )}

                        {modal.closable && (
                            <div className="create-modal__actions">
                                <button
                                    className="create-modal__btn create-modal__btn--secondary"
                                    onClick={() => setModal({ open: false, message: '' })}
                                >
                                    Close
                                </button>
                                {modal.redirect && (
                                    <button
                                        className="create-modal__btn create-modal__btn--primary"
                                        onClick={() => window.location.href = modal.redirect!}
                                    >
                                        Go to Game
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default Create;
