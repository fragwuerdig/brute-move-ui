import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Leaderboard from './Leaderboard';
import { useWallet } from './WalletProvider';
import { fetchContractStateSmart, getLeaderboardAddr } from './Common';
import './LeaderboardPage.css';

interface LeaderboardEntry {
    address: string;
    elo: number;
}

const PER_PAGE = 25;

const BackIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="19" y1="12" x2="5" y2="12" />
        <polyline points="12 19 5 12 12 5" />
    </svg>
);

function LeaderboardPage() {
    const navigate = useNavigate();
    const { connectedAddr, chain } = useWallet();
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);

    const fetchPage = async (pageNum: number, append: boolean = false) => {
        try {
            if (append) {
                setLoadingMore(true);
            } else {
                setLoading(true);
            }
            setError(null);

            const data: [string, number][] = await fetchContractStateSmart(
                getLeaderboardAddr(chain),
                { leaderboard: { page: pageNum, per_page: PER_PAGE } },
                chain
            );

            const mapped = data.map(([address, elo]) => ({ address, elo }));

            if (append) {
                setEntries(prev => [...prev, ...mapped]);
            } else {
                setEntries(mapped);
            }

            setHasMore(mapped.length === PER_PAGE);
            setPage(pageNum);
        } catch (err) {
            console.error('Failed to fetch leaderboard:', err);
            setError('Failed to load leaderboard');
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        fetchPage(0);
    }, [chain]);

    const handleLoadMore = () => {
        if (!loadingMore && hasMore) {
            fetchPage(page + 1, true);
        }
    };

    return (
        <div className="leaderboard-page">
            <div className="leaderboard-page__header">
                <button className="leaderboard-page__back" onClick={() => navigate('/')}>
                    <BackIcon />
                    Back
                </button>
            </div>
            {loading ? (
                <div className="leaderboard-page__loading">Loading leaderboard...</div>
            ) : error ? (
                <div className="leaderboard-page__error">{error}</div>
            ) : (
                <>
                    <Leaderboard entries={entries} currentUser={connectedAddr} />
                    {hasMore && (
                        <button
                            className="leaderboard-page__load-more"
                            onClick={handleLoadMore}
                            disabled={loadingMore}
                        >
                            {loadingMore ? 'Loading...' : 'Load More'}
                        </button>
                    )}
                </>
            )}
        </div>
    );
}

export default LeaderboardPage;
