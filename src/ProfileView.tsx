import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWallet } from './WalletProvider';
import { useNameService, type Profile } from './hooks';
import { GlassCard } from './GlassCard';
import { addressEllipsis } from './Common';
import './ProfileView.css';

function ProfileView() {
    const { address } = useParams<{ address: string }>();
    const navigate = useNavigate();
    const { connectedAddr } = useWallet();
    const { resolveAddress } = useNameService();

    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Redirect to own profile page if viewing self
    useEffect(() => {
        if (address && connectedAddr && address === connectedAddr) {
            navigate('/profile', { replace: true });
        }
    }, [address, connectedAddr, navigate]);

    // Fetch profile
    useEffect(() => {
        if (!address) {
            setError('No address provided');
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        resolveAddress(address)
            .then((p) => {
                setProfile(p);
                setLoading(false);
            })
            .catch((err) => {
                console.error('Error fetching profile:', err);
                setError('Failed to load profile');
                setLoading(false);
            });
    }, [address, resolveAddress]);

    if (!address) {
        return (
            <div className="profile-view">
                <GlassCard accent>
                    <div className="profile-view__content">
                        <p className="profile-view__error">No address provided</p>
                        <button className="profile-view__back" onClick={() => navigate(-1)}>
                            Back
                        </button>
                    </div>
                </GlassCard>
            </div>
        );
    }

    return (
        <div className="profile-view">
            <GlassCard accent>
                <div className="profile-view__content">
                    {loading ? (
                        <div className="profile-view__loading">Loading profile...</div>
                    ) : error ? (
                        <div className="profile-view__error">{error}</div>
                    ) : profile ? (
                        <>
                            {profile.image ? (
                                <img
                                    src={`data:image/jpeg;base64,${profile.image}`}
                                    alt={profile.display_name}
                                    className="profile-view__image"
                                />
                            ) : (
                                <div className="profile-view__image-placeholder">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                        <circle cx="12" cy="7" r="4" />
                                    </svg>
                                </div>
                            )}
                            <h1 className="profile-view__name">{profile.display_name}</h1>
                            <p className="profile-view__address">{addressEllipsis(address)}</p>
                            {profile.bio && (
                                <div className="profile-view__bio">
                                    <p>{profile.bio}</p>
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            <div className="profile-view__image-placeholder">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                    <circle cx="12" cy="7" r="4" />
                                </svg>
                            </div>
                            <h1 className="profile-view__name">{addressEllipsis(address)}</h1>
                            <p className="profile-view__no-profile">This player has not set up a profile yet.</p>
                        </>
                    )}

                    <div className="profile-view__actions">
                        {connectedAddr && (
                            <button
                                className="profile-view__btn profile-view__btn--primary"
                                onClick={() => navigate(`/create?recipient=${address}`)}
                            >
                                Challenge
                            </button>
                        )}
                        <button
                            className="profile-view__btn profile-view__btn--secondary"
                            onClick={() => navigate(-1)}
                        >
                            Back
                        </button>
                    </div>
                </div>
            </GlassCard>
        </div>
    );
}

export default ProfileView;
