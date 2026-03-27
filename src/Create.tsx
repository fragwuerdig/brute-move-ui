import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MsgExecuteContract } from '@goblinhunt/cosmes/client';
import type { UnsignedTx } from '@goblinhunt/cosmes/wallet';
import { fetchBankBalance, fetchContractStateSmart, getFactoryAddr, addressEllipsis, isModeAvailable } from './Common';
import { useWallet } from './WalletProvider';
import { useGameMode } from './GameModeContext';
import { useNameService, type Profile } from './hooks';
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
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [color, setColor] = useState<ColorChoice>('Random');
    const { connectedAddr, broadcast, chain, connect, connected } = useWallet();
    const { mode, setMode } = useGameMode();
    const liveAvailable = chain ? isModeAvailable(chain, 'live') : false;
    const { resolveAddress, searchByPrefix } = useNameService();
    const [modal, setModal] = useState<ModalState>({ open: false, message: '' });

    const [betAmount, setBetAmount] = useState<number>(0);
    const [minBetAmount, setMinBetAmount] = useState(1);
    const [disabledButton, setDisabledButton] = useState(false);
    const [disabledText, setDisabledText] = useState('');
    const [feeUluna, setFeeUluna] = useState(0);
    const [refresh, setRefresh] = useState(0);
    const [selectedTimePreset, setSelectedTimePreset] = useState<number | null>(null);

    // Recipient (direct invite)
    const [recipient, setRecipient] = useState<string>('');
    const [recipientInput, setRecipientInput] = useState<string>('');
    const [recipientDisplay, setRecipientDisplay] = useState<string | null>(null);
    const [searchResults, setSearchResults] = useState<Profile[]>([]);
    const [showSearchDropdown, setShowSearchDropdown] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const timePresets = useMemo(() => {
        if (mode === 'live') {
            return [
                { label: '30 min', value: 30 },
                { label: '60 min', value: 60 },
                { label: '90 min', value: 90 },
                { label: '2 hrs', value: 120 },
            ];
        }
        return [
            { label: '12 h', value: 12 },
            { label: '24 h', value: 24 },
            { label: '48 h', value: 48 },
            { label: '72 h', value: 72 },
        ];
    }, [mode]);

    const moveTimeoutSeconds = useMemo(() => {
        if (selectedTimePreset === null) return undefined;
        if (mode === 'live') {
            return Math.floor(selectedTimePreset * 60);
        }
        return Math.floor(selectedTimePreset * 3600);
    }, [selectedTimePreset, mode]);

    // Initialize recipient from URL parameter
    useEffect(() => {
        const recipientParam = searchParams.get('recipient');
        if (recipientParam) {
            setRecipient(recipientParam);
            setRecipientInput(recipientParam);
        }
    }, [searchParams]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setShowSearchDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Search for profiles when input changes (debounced)
    useEffect(() => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        // If input looks like an address, don't search
        if (recipientInput.startsWith('terra1') || recipientInput.length < 2) {
            setSearchResults([]);
            setShowSearchDropdown(false);
            return;
        }

        setIsSearching(true);
        searchTimeoutRef.current = setTimeout(async () => {
            const results = await searchByPrefix(recipientInput, 5);
            setSearchResults(results);
            setShowSearchDropdown(results.length > 0);
            setIsSearching(false);
        }, 300);

        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [recipientInput, searchByPrefix]);

    // Handle selecting a profile from search results
    const handleSelectProfile = (profile: Profile) => {
        setRecipient(profile.address);
        setRecipientInput(profile.display_name);
        setRecipientDisplay(profile.display_name);
        setShowSearchDropdown(false);
        setSearchResults([]);
    };

    // Handle input change
    const handleRecipientInputChange = (value: string) => {
        setRecipientInput(value);
        // If it looks like an address, set it directly
        if (value.startsWith('terra1')) {
            setRecipient(value);
            setRecipientDisplay(null);
        } else if (!value) {
            setRecipient('');
            setRecipientDisplay(null);
        }
    };

    // Resolve recipient display name when address is set directly
    useEffect(() => {
        if (!recipient || recipient.length < 10 || !recipient.startsWith('terra1')) {
            return;
        }

        // Only resolve if we don't already have a display name
        if (recipientDisplay) return;

        resolveAddress(recipient).then((profile) => {
            if (profile) {
                setRecipientDisplay(profile.display_name);
                setRecipientInput(profile.display_name);
            }
        });
    }, [recipient, recipientDisplay, resolveAddress]);

    // Fetch fees (stored in uluna to avoid floating point issues)
    useEffect(() => {
        if (!chain) return;
        const betUluna = betAmount * 1000000;
        const query = { fee: { bet: betUluna.toString() } };
        fetchContractStateSmart(getFactoryAddr(chain, mode), query, chain)
            .then((data) => setFeeUluna(parseInt(data) || 0))
            .catch(() => setFeeUluna(0));
    }, [betAmount, chain, mode]);

    // Fetch minimum bet
    useEffect(() => {
        const query = { minimum_bet: {} };
        fetchContractStateSmart(getFactoryAddr(chain, mode), query, chain)
            .then((data) => setMinBetAmount(data))
            .catch(() => { });
    }, [chain, mode]);

    // Check balance
    useEffect(() => {
        fetchBankBalance(connectedAddr || "", 'uluna', chain)
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
        const betUluna = betAmount * 1000000;
        const createMsg: Record<string, any> = {
            create_joinable_game: {
                bet: betUluna.toString(),
                with_color: color === 'Random' ? null : color,
                recipient: recipient || null,
            }
        };
        if (moveTimeoutSeconds !== undefined) {
            createMsg.create_joinable_game.move_timeout = moveTimeoutSeconds;
        }
        const fundsAmount = (betUluna + feeUluna).toString();
        const tx: UnsignedTx = {
            msgs: [
                new MsgExecuteContract({
                    sender: connectedAddr,
                    contract: getFactoryAddr(chain, mode),
                    funds: [{ denom: 'uluna', amount: fundsAmount }],
                    msg: createMsg
                }),
            ],
            memo: recipient ? "Challenge a player" : "Create a new game",
        };

        setModal({ open: true, message: 'Creating game...', closable: false });

        broadcast(tx)
            .then((result) => {
                const wasmEvents = result.txResponse.events.filter(event => event.type === 'wasm');
                const gameId = wasmEvents[0]?.attributes.find(attr => attr.key === 'game_id')?.value;
                if (gameId) {
                    const message = recipient
                        ? `Challenge sent to ${recipientDisplay || addressEllipsis(recipient)}!`
                        : 'Game created! Share this ID with your opponent:';
                    setModal({
                        open: true,
                        message,
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

    // Not connected - show connect prompt
    if (!connected) {
        return (
            <div className="create-container">
                <div className="create-header">
                <h1 className="create-header__title">
                    Create Challenge
                    <span className={`mode-badge mode-badge--${mode}`}>{mode}</span>
                </h1>
                <p className="create-header__subtitle">Set your terms and stake your claim</p>
            </div>
                <GlassCard accent>
                    <div className="create-section" style={{ textAlign: 'center', padding: '40px 20px' }}>
                        <h2 className="create-section__title">Connect Wallet</h2>
                        <p className="create-section__desc" style={{ marginBottom: '24px' }}>
                            Connect your wallet to create a game challenge.
                        </p>
                        <button className="create-btn" onClick={connect}>
                            Connect Wallet
                        </button>
                    </div>
                </GlassCard>
            </div>
        );
    }

    return (
        <div className="create-container">
            {/* Header */}
            <div className="create-header">
                <h1 className="create-header__title">
                    Create Challenge
                    <span className={`mode-badge mode-badge--${mode}`}>{mode}</span>
                </h1>
                <p className="create-header__subtitle">Set your terms and stake your claim</p>
            </div>

            {/* Main Form */}
            <GlassCard accent>
                {/* Mode Selector */}
                <div className="create-section">
                    <h2 className="create-section__title">Mode</h2>
                    <p className="create-section__desc">
                        {mode === 'live'
                            ? 'Live games use a running clock with increment.'
                            : 'Daily games reset the timer after each move.'}
                    </p>
                    <div className="mode-selector">
                        <button
                            type="button"
                            className={`mode-option ${mode === 'daily' ? 'mode-option--active' : ''}`}
                            onClick={() => setMode('daily')}
                        >
                            Daily
                        </button>
                        <button
                            type="button"
                            className={`mode-option ${mode === 'live' ? 'mode-option--active' : ''}`}
                            onClick={() => setMode('live')}
                            disabled={!liveAvailable}
                        >
                            Live
                        </button>
                    </div>
                </div>

                <div className="create-divider" />

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

                <div className="create-divider" />

                {/* Time Control */}
                <div className="create-section">
                    <h2 className="create-section__title">
                        {mode === 'live' ? 'Initial Time' : 'Move Timeout'}
                        <span className="create-section__optional"> (Optional)</span>
                    </h2>
                    <p className="create-section__desc">
                        {mode === 'live'
                            ? 'Pick the initial time per player. Increment uses the live default.'
                            : 'Pick the per-move timeout. Leave unselected to use default.'}
                    </p>
                    <div className="time-presets">
                        {timePresets.map((preset) => (
                            <button
                                key={preset.label}
                                type="button"
                                className={`time-preset ${selectedTimePreset === preset.value ? 'time-preset--active' : ''}`}
                                onClick={() => setSelectedTimePreset(
                                    selectedTimePreset === preset.value ? null : preset.value
                                )}
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="create-divider" />

                {/* Recipient (Direct Invite) */}
                <div className="create-section">
                    <h2 className="create-section__title">Challenge Player <span className="create-section__optional">(Optional)</span></h2>
                    <p className="create-section__desc">
                        Search by username or enter a terra1... address.
                    </p>
                    <div className="recipient-input-wrapper" ref={dropdownRef}>
                        <input
                            type="text"
                            className="recipient-input"
                            placeholder="Username or terra1... address"
                            value={recipientInput}
                            onChange={(e) => handleRecipientInputChange(e.target.value)}
                            onFocus={() => searchResults.length > 0 && setShowSearchDropdown(true)}
                        />
                        {isSearching && (
                            <span className="recipient-searching">...</span>
                        )}
                        {recipientInput && !isSearching && (
                            <button
                                type="button"
                                className="recipient-clear"
                                onClick={() => {
                                    setRecipient('');
                                    setRecipientInput('');
                                    setRecipientDisplay(null);
                                    setSearchResults([]);
                                }}
                                title="Clear"
                            >
                                &times;
                            </button>
                        )}
                        {showSearchDropdown && searchResults.length > 0 && (
                            <div className="recipient-dropdown">
                                {searchResults.map((profile) => (
                                    <button
                                        key={profile.address}
                                        type="button"
                                        className="recipient-dropdown__item"
                                        onClick={() => handleSelectProfile(profile)}
                                    >
                                        {profile.image ? (
                                            <img
                                                src={`data:image/jpeg;base64,${profile.image}`}
                                                alt=""
                                                className="recipient-dropdown__avatar"
                                            />
                                        ) : (
                                            <div className="recipient-dropdown__avatar recipient-dropdown__avatar--empty" />
                                        )}
                                        <div className="recipient-dropdown__info">
                                            <span className="recipient-dropdown__name">{profile.display_name}</span>
                                            <span className="recipient-dropdown__address">{addressEllipsis(profile.address)}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    {recipient && recipientDisplay && (
                        <div className="recipient-resolved">
                            Challenging: <strong>{recipientDisplay}</strong>
                        </div>
                    )}
                </div>

                {/* Fee Info */}
                <div className="fee-info">
                    <div className="fee-row">
                        <span className="fee-row__label">Platform Fee</span>
                        <span className="fee-row__value">{(feeUluna / 1000000).toFixed(4)} LUNC</span>
                    </div>
                    <div className="fee-row">
                        <span className="fee-row__label">Minimum Bet</span>
                        <span className="fee-row__value">{minBetAmount} LUNC</span>
                    </div>
                    <div className="fee-row">
                        <span className="fee-row__label">Total Required</span>
                        <span className="fee-row__value">{(betAmount + feeUluna / 1000000).toFixed(4)} LUNC</span>
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
                                        onClick={() => navigate(modal.redirect!)}
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
