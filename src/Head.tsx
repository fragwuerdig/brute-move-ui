import { useNavigate } from "react-router-dom";
import { useWallet } from "./WalletProvider";
import { addressEllipsis } from "./Common";
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

function Head({ children }: { children?: React.ReactNode }) {
    const navigate = useNavigate();
    const { connected, connectedAddr, disconnect } = useWallet();

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
                        {connected && connectedAddr && (
                            <button className="header-wallet" onClick={disconnect}>
                                <span className="header-wallet__address">{addressEllipsis(connectedAddr)}</span>
                                <DisconnectIcon />
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
