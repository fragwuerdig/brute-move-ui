import { fetchBankBalance, fetchContractStateSmart, getFactoryAddr, type JoinableGame } from './Common';
import { useWallet } from './WalletProvider';
import { useEffect, useState } from 'react';
import type { UnsignedTx } from '@goblinhunt/cosmes/wallet';
import { MsgExecuteContract } from '@goblinhunt/cosmes/client';
import { useNavigate } from "react-router-dom";
import { STORE_KEY_SAVED_GAMES, type SavedGame } from './Home';
import { GlassCard } from './GlassCard';
import { AddressDisplay } from './components/AddressDisplay';
import './Join.css';

type ColorChoice = 'White' | 'Black' | 'Random';

interface JoinProps {
  game: JoinableGame | null;
}

interface ModalState {
  open: boolean;
  closable?: boolean;
  message: string;
}

function Join({ game }: JoinProps) {
  const { connectedAddr, chain, broadcast, connect, connected } = useWallet();
  const [color, setColor] = useState<ColorChoice>('Random');
  const [modal, setModal] = useState<ModalState>({ open: false, message: '', closable: true });
  const [balance, setBalance] = useState<number | null>(null);
  const [message, setMessage] = useState<string>('');
  const navigate = useNavigate();

  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setRefresh((r) => r + 1), 5000);
    return () => clearTimeout(timer);
  }, [refresh]);

  useEffect(() => {
    if (!game || !chain) return;
    fetchContractStateSmart(getFactoryAddr(chain), { joinable_game: { id: game.id } }, chain)
      .then((data) => {
        if (data?.contract) {
          navigate(`/game/${data.contract}`, { replace: true });
        }
      })
      .catch(() => { });
  }, [connectedAddr, game, chain, navigate, refresh]);

  useEffect(() => {
    if (!connectedAddr || !chain) return;
    fetchBankBalance(connectedAddr || "", 'uluna', chain)
      .then((data) => setBalance(data))
      .catch(() => { });
  }, [connectedAddr, chain]);

  useEffect(() => {
    if (!game || balance === null) return;
    if (game.opponent === connectedAddr) {
      setMessage("This is your own challenge. Wait for an opponent to join.");
      return;
    }
    if (game.recipient && game.recipient !== connectedAddr) {
      setMessage("This challenge is for a specific player. You cannot join.");
      return;
    }
    if (game.opponent_color === 'White' && color === 'White') {
      setMessage("Your opponent chose White. Please select Black or Random.");
      return;
    }
    if (balance < (game.bet + game.fee) / 1000000) {
      setMessage(`Insufficient balance (${balance.toFixed(2)} LUNC)`);
      return;
    }
    setMessage('');
  }, [game, balance, connectedAddr, color]);

  const handleRetract = () => {
    if (!game || !connectedAddr) return;

    const msg = { remove_unaccepted_challenge: { game_id: game.id } };
    const tx: UnsignedTx = {
      msgs: [
        new MsgExecuteContract({
          sender: connectedAddr,
          contract: getFactoryAddr(chain),
          funds: [],
          msg
        }),
      ],
      memo: "Retract challenge",
    };

    setModal({ open: true, message: 'Retracting...', closable: false });
    broadcast(tx)
      .then(() => {
        setModal({ open: true, message: 'Challenge retracted!', closable: true });
        navigate('/');
      })
      .catch((error) => {
        setModal({ open: true, message: `Failed: ${error.message}`, closable: true });
      });
  };

  const handleJoin = () => {
    if (!game || !connectedAddr) return;

    const msg = {
      join_game: {
        id: game.id,
        with_color: color === 'Random' ? null : color,
      }
    };
    const tx: UnsignedTx = {
      msgs: [
        new MsgExecuteContract({
          sender: connectedAddr,
          contract: getFactoryAddr(chain),
          funds: [{ amount: (game.bet + game.fee).toString(), denom: 'uluna' }],
          msg
        }),
      ],
      memo: "Join game",
    };

    setModal({ open: true, message: 'Joining game...', closable: false });
    broadcast(tx)
      .then((result) => {
        const wasmEvents = result.txResponse.events.filter(event => event.type === 'instantiate');
        const gameAddr = wasmEvents[0]?.attributes.find(attr => attr.key === '_contract_address')?.value;

        if (gameAddr) {
          const storedGames = JSON.parse(localStorage.getItem(STORE_KEY_SAVED_GAMES) || "[]") as SavedGame[];
          storedGames.push({ address: gameAddr, name: `Game ${game.id}` });
          localStorage.setItem(STORE_KEY_SAVED_GAMES, JSON.stringify(storedGames));
          navigate(`/game/${gameAddr}`);
        }
      })
      .catch((error) => {
        setModal({ open: true, message: `Failed: ${error.message}`, closable: true });
      });
  };

  const isColorDisabled = (c: ColorChoice) => {
    if (!game) return true;
    if (c === 'White' && game.opponent_color === 'White') return true;
    if (c === 'Black' && game.opponent_color === 'Black') return true;
    if (c === 'Random' && (game.opponent_color === 'White' || game.opponent_color === 'Black')) return true;
    return false;
  };

  if (!game) {
    return (
      <div className="join-loading">
        <span className="join-loading__text">Loading challenge...</span>
      </div>
    );
  }

  return (
    <div className="join-container">
      {/* Header */}
      <div className="join-header">
        <h1 className="join-header__title">Join Challenge</h1>
        <p className="join-header__subtitle">Accept this chess challenge</p>
      </div>

      {/* Main Card */}
      <GlassCard accent>
        {/* Bet Display */}
        <div className="join-bet-display">
          <p className="join-bet-display__label">Stake Amount</p>
          <p className="join-bet-display__value">{(game.bet / 1000000).toFixed(2)} LUNC</p>
        </div>

        {/* Recipient Info */}
        {game.recipient && (
          <>
            <div className="join-divider" />
            <div className="join-recipient-info">
              <p className="join-recipient-info__label">Challenge directed to</p>
              <AddressDisplay address={game.recipient} clickable={false} />
            </div>
          </>
        )}

        <div className="join-divider" />

        {/* Color Selection */}
        <div className="join-section">
          <h2 className="join-section__title">Choose Your Color</h2>
          <div className="join-color-options">
            {(['White', 'Black', 'Random'] as ColorChoice[]).map((c) => (
              <button
                key={c}
                className={`join-color-option ${color === c ? 'join-color-option--selected' : ''} ${isColorDisabled(c) ? 'join-color-option--disabled' : ''}`}
                onClick={() => !isColorDisabled(c) && setColor(c)}
                disabled={isColorDisabled(c)}
              >
                <div className={`join-color-option__badge join-color-option__badge--${c.toLowerCase()}`}>
                  {c === 'Random' ? '?' : ''}
                </div>
                <span className="join-color-option__label">{c}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Fee Info */}
        <div className="join-fee-info">
          <div className="join-fee-row">
            <span className="join-fee-row__label">Platform Fee</span>
            <span className="join-fee-row__value">{(game.fee / 1000000).toFixed(4)} LUNC</span>
          </div>
          <div className="join-fee-row">
            <span className="join-fee-row__label">Total Required</span>
            <span className="join-fee-row__value">{((game.bet + game.fee) / 1000000).toFixed(4)} LUNC</span>
          </div>
        </div>

        {/* Error */}
        {message && (
          <div className="join-error">{message}</div>
        )}

        {/* Actions */}
        <div className="join-actions">
          {connected ? (
            <>
              <button
                className="join-btn join-btn--danger"
                disabled={connectedAddr !== game.opponent}
                onClick={handleRetract}
              >
                Retract
              </button>
              <button
                className="join-btn join-btn--primary"
                disabled={!connectedAddr || !!message}
                onClick={handleJoin}
              >
                Join Game
              </button>
            </>
          ) : (
            <button
              className="join-btn join-btn--primary"
              onClick={connect}
              style={{ flex: 1 }}
            >
              Connect to Join
            </button>
          )}
        </div>
      </GlassCard>

      {/* Modal */}
      {modal.open && (
        <div className="join-modal-overlay" onClick={() => modal.closable && setModal({ open: false, message: '' })}>
          <div className="join-modal" onClick={(e) => e.stopPropagation()}>
            <p className="join-modal__message">{modal.message}</p>
            {modal.closable && (
              <button
                className="join-modal__btn"
                onClick={() => setModal({ open: false, message: '' })}
              >
                OK
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Join;
