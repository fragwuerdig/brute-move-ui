import { useNavigate } from "react-router-dom";
import { useWallet } from "./WalletProvider";
import { AddressDisplay } from "./components/AddressDisplay";
import { config } from "./config";
import HeaderMenu from "./HeaderMenu";
import Footer from "./Footer";
import pawnLogo from "./assets/pawn.png";
import './Head.css';

const DisconnectIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
);

const WalletIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
        <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
        <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
);

const BellIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
);

function Head({ children }: { children?: React.ReactNode }) {
    const navigate = useNavigate();
    const { connected, connectedAddr, disconnect, connect } = useWallet();

    return (
        <div className="page-wrapper">
            <header className="header">
                <div className="header-inner">
                    <div className="header-logo" onClick={() => navigate('/')}>
                        <img src={pawnLogo} alt="BruteMove" className="header-pawn" />
                        <span className="header-logo-text">
                            Brute<strong>Move!</strong>
                        </span>
                    </div>
                    <div className="header-nav">
                        <HeaderMenu />
                        {connected && connectedAddr ? (
                            <>
                                <a
                                    href={`https://t.me/${config.telegramBotUsername}?start=${connectedAddr}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="header-notifications"
                                    title="Enable notifications"
                                >
                                    <BellIcon />
                                </a>
                                <button className="header-wallet" onClick={disconnect}>
                                    <span className="header-wallet__address"><AddressDisplay address={connectedAddr} /></span>
                                    <DisconnectIcon />
                                </button>
                            </>
                        ) : (
                            <button className="header-connect" onClick={connect}>
                                <WalletIcon />
                                <span>Connect</span>
                            </button>
                        )}
                    </div>
                </div>
            </header>
            <div className="header-spacer" />
            <main className="main-content">
                {children}
            </main>
            <Footer />
        </div>
    );
}

export default Head;
