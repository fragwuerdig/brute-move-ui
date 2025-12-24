import { useNavigate } from "react-router-dom";
import './Head.css';

function Head({ children }: { children?: React.ReactNode }) {
    const navigate = useNavigate();

    return (
        <>
            <header className="header">
                <div className="header-inner">
                    <div className="header-logo" onClick={() => navigate('/')}>
                        <span className="header-logo-text">
                            Brute<strong>Move!</strong>
                        </span>
                    </div>
                    <div className="header-badge">
                        On-Chain
                    </div>
                </div>
            </header>
            <div className="header-spacer" />
            <main className="main-content">
                {children}
            </main>
        </>
    );
}

export default Head;
