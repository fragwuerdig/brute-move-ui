import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNameService, getProfileFromCache, subscribeToProfileUpdates } from '../hooks';
import { addressEllipsis } from '../Common';
import './AddressDisplay.css';

interface AddressDisplayProps {
    address: string;
    className?: string;
    showAddress?: boolean; // If true, show address in tooltip even when name is available
    clickable?: boolean; // If true, clicking navigates to profile (default: true)
}

export function AddressDisplay({ address, className, showAddress = true, clickable = true }: AddressDisplayProps) {
    const navigate = useNavigate();
    const { resolveAddress } = useNameService();
    const [displayName, setDisplayName] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Check cache first (synchronous)
        const cached = getProfileFromCache(address);
        if (cached !== undefined) {
            setDisplayName(cached?.display_name ?? null);
            return;
        }

        // Resolve if not in cache
        setLoading(true);
        resolveAddress(address).then((profile) => {
            setDisplayName(profile?.display_name ?? null);
            setLoading(false);
        });
    }, [address, resolveAddress]);

    // Subscribe to profile updates for this address
    useEffect(() => {
        const unsubscribe = subscribeToProfileUpdates((updatedAddress, profile) => {
            if (updatedAddress === address) {
                setDisplayName(profile?.display_name ?? null);
            }
        });
        return unsubscribe;
    }, [address]);

    const shortAddr = addressEllipsis(address);

    const handleClick = (e: React.MouseEvent) => {
        if (clickable) {
            e.stopPropagation();
            navigate(`/profile/${address}`);
        }
    };

    const clickableClass = clickable ? 'address-display--clickable' : '';

    if (loading) {
        return (
            <span
                className={`address-display address-display--loading ${clickableClass} ${className || ''}`}
                onClick={handleClick}
            >
                {shortAddr}
            </span>
        );
    }

    if (displayName) {
        return (
            <span
                className={`address-display address-display--named ${clickableClass} ${className || ''}`}
                title={showAddress ? address : undefined}
                onClick={handleClick}
            >
                {displayName}
            </span>
        );
    }

    return (
        <span
            className={`address-display ${clickableClass} ${className || ''}`}
            title={address}
            onClick={handleClick}
        >
            {shortAddr}
        </span>
    );
}

export default AddressDisplay;
