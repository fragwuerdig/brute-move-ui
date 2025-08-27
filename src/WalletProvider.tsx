import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  KeplrController,
  WalletController,
  ConnectedWallet,
  WalletType,
  type ChainInfo,
  type UnsignedTx,
} from "@goblinhunt/cosmes/wallet";
import { createPortal } from "react-dom";
import { ensureChainAddedKeplr } from "./AddTestnet";

const WC_PROJECT_ID = 'e2d195872baa9e9701adee752166fbcf';

const STORAGE_KEY = 'wallet_connected';

type ToastStatus = "pending" | "success" | "error" | null;

const Toast: React.FC<{ status: ToastStatus }> = ({ status }) => {
  if (!status) return null;
  const icon =
    status === "pending"
      ? "⏳"
      : status === "success"
      ? "✅"
      : "❌";

  const message =
    status === "pending"
      ? "Broadcasting..."
      : status === "success"
      ? "Transaction successful"
      : "Transaction failed";

  return createPortal(
    <div
      style={{
        position: "fixed",
        top: 20,
        right: 20,
        padding: "8px 12px",
        backgroundColor: "#333",
        color: "white",
        borderRadius: 6,
        fontSize: 14,
        display: "flex",
        alignItems: "center",
        gap: 8,
        zIndex: 1100,
      }}
    >
      <span>{icon}</span>
      <span>{message}</span>
    </div>,
    document.body,
  );
};

const Modal: React.FC<{ onSelect: (type: WalletType) => void, connecting: boolean }> = ({ onSelect, connecting }) => {
  return createPortal(
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100vw",
      height: "100vh",
      backgroundColor: "rgba(0,0,0,0.6)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1001,
    }}>
      <div style={{
        backgroundColor: "#fff",
        padding: 20,
        borderRadius: 8,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        minWidth: 200,
        textAlign: "center"
      }}>
        {connecting ? (
          <div>Connecting...</div>
        ) : (
          <>
            <h3>Select Wallet</h3>
            <button onClick={() => onSelect(WalletType.EXTENSION)}>Keplr</button>
            <button onClick={() => onSelect(WalletType.WALLETCONNECT)}>WalletConnect</button>
          </>
        )}
      </div>
    </div>,
    document.body
  );
};

export interface WalletContextValue {
  connected: boolean;
  connectedAddr?: string;
  broadcast: (tx: UnsignedTx, feeMultiplier?: number) => ReturnType<ConnectedWallet["broadcastTxSync"]>;
  connect: () => Promise<void>;
  disconnect: () => void;
  chain: ChainInfo<string>;
}

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

export interface WalletProviderProps {
  children: ReactNode;
  chain: ChainInfo<string>;
}

export const WalletProvider: React.FC<WalletProviderProps> = ({
  children,
  chain,
}) => {
  const [controller] = useState<WalletController>(() => new KeplrController(WC_PROJECT_ID));
  const [wallet, setWallet] = useState<ConnectedWallet | undefined>();
  const [toastStatus, setToastStatus] = useState<ToastStatus>(null);
  const [showModal, setShowModal] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const handleSelect = useCallback(async (type: WalletType) => {
    setConnecting(true);
    controller.connect(type, [chain]).then((wallets) => {
      console.log("Wallets after connect: ", wallets);
      localStorage.setItem(STORAGE_KEY, type);
      setWallet(wallets.get(chain.chainId));
      setToastStatus("success");
    }).catch((err) => {
      console.error("Failed to connect wallet: ", err);
      setToastStatus("error");
    }).finally(() => {
      setTimeout(() => setToastStatus(null), 2500);
      setShowModal(false);
      setConnecting(false);
    });
  }, [chain, controller]);

  const connect = useCallback(async () => {
    await ensureChainAddedKeplr();
    setShowModal(true);
  }, []);

  const disconnect = useCallback(() => {
    setWallet(undefined);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  useEffect(() => {
    const storedType = localStorage.getItem(STORAGE_KEY) as WalletType | null;
    if (storedType === WalletType.EXTENSION || storedType === WalletType.WALLETCONNECT) {
      setConnecting(true);
      controller.connect(storedType, [chain])
        .then(wallets => {
          const restored = wallets.get(chain.chainId);
          if (restored) {
            setWallet(restored);
          }
        })
        .catch((err) => {
          console.warn("Failed to auto-reconnect: ", err);
          localStorage.removeItem(STORAGE_KEY);
        })
        .finally(() => {
          setConnecting(false);
        });
    }
  }, [controller, chain]);

  useEffect(() => {
    controller.onAccountChange((wlts) => {
      const updated = wlts.find(w => w.chainId === chain.chainId);
      if (updated) {
        handleSelect(WalletType.EXTENSION);
      }
    });
  }, [controller, chain.chainId, handleSelect]);

  const connected = !!wallet;
  const connectedAddr = wallet?.address;

  const broadcast = useCallback<WalletContextValue["broadcast"]>(
    async (tx, feeMultiplier = 1.4) => {
      if (!wallet) throw new Error("Wallet not connected");
      try {
        setToastStatus("pending");
        const result = await wallet.broadcastTxSync(tx, feeMultiplier);
        setToastStatus("success");
        setTimeout(() => setToastStatus(null), 2000);
        return result;
      } catch (err) {
        setToastStatus("error");
        setTimeout(() => setToastStatus(null), 2500);
        throw err;
      }
    },
    [wallet],
  );

  const value: WalletContextValue = useMemo(
    () => ({ connected, connectedAddr, broadcast, connect, disconnect, chain }),
    [connected, connectedAddr, broadcast, connect, disconnect, chain],
  );

  return (
    <WalletContext.Provider value={value}>
      { toastStatus && <Toast status={toastStatus} /> }
      { (localStorage.getItem(STORAGE_KEY) && !connected) ? <></> : children }
      {showModal && <Modal onSelect={handleSelect} connecting={connecting} />}
    </WalletContext.Provider>
  );
};

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return ctx;
}
