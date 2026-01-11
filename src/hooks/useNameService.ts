import { useState, useEffect, useCallback, useRef } from 'react';
import { MsgExecuteContract } from '@goblinhunt/cosmes/client';
import type { UnsignedTx } from '@goblinhunt/cosmes/wallet';
import { useWallet } from '../WalletProvider';
import { fetchContractStateSmart, getNameServiceAddr } from '../Common';

export interface Profile {
    address: string;
    name: string;
    display_name: string;
    bio: string | null;
    image: string | null; // base64 encoded
}

// Global cache for resolved profiles (persists across component mounts)
const profileCache = new Map<string, Profile | null>();
const pendingRequests = new Map<string, Promise<Profile | null>>();

// Event emitter for profile updates
type ProfileUpdateListener = (address: string, profile: Profile | null) => void;
const profileUpdateListeners = new Set<ProfileUpdateListener>();

export function subscribeToProfileUpdates(listener: ProfileUpdateListener): () => void {
    profileUpdateListeners.add(listener);
    return () => profileUpdateListeners.delete(listener);
}

function notifyProfileUpdate(address: string, profile: Profile | null) {
    profileUpdateListeners.forEach(listener => listener(address, profile));
}

export interface UseNameServiceOptions {
    // Optional: addresses to resolve on mount
    addresses?: string[];
}

export interface NameServiceState {
    // My profile
    myProfile: Profile | null;
    isLoadingMyProfile: boolean;

    // Profile mutations
    isSaving: boolean;
    isDeleting: boolean;
    saveError: string | null;

    // Actions
    setProfile: (name: string, bio?: string, image?: string) => Promise<boolean>;
    deleteProfile: () => Promise<boolean>;
    refreshMyProfile: () => Promise<void>;

    // Resolve addresses to profiles
    resolveAddress: (address: string) => Promise<Profile | null>;
    resolveAddresses: (addresses: string[]) => Promise<Map<string, Profile | null>>;
    getDisplayName: (address: string) => string | null;

    // Check name availability
    isNameAvailable: (name: string) => Promise<boolean>;

    // Search by name prefix
    searchByPrefix: (prefix: string, limit?: number) => Promise<Profile[]>;
}

export function useNameService(options?: UseNameServiceOptions): NameServiceState {
    const { connectedAddr, broadcast, chain } = useWallet();

    const [myProfile, setMyProfile] = useState<Profile | null>(null);
    const [isLoadingMyProfile, setIsLoadingMyProfile] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    // Track resolved profiles for re-renders
    const [resolvedProfiles, setResolvedProfiles] = useState<Map<string, Profile | null>>(new Map());
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    // Fetch profile by address (with caching)
    const fetchProfile = useCallback(async (address: string): Promise<Profile | null> => {
        if (!chain) return null;

        const nsAddr = getNameServiceAddr(chain);
        if (!nsAddr) return null;

        // Check cache first
        if (profileCache.has(address)) {
            return profileCache.get(address) ?? null;
        }

        // Check if request is already pending
        if (pendingRequests.has(address)) {
            return pendingRequests.get(address)!;
        }

        // Create new request
        const request = (async () => {
            try {
                const result = await fetchContractStateSmart(
                    nsAddr,
                    { profile_by_address: { address } },
                    chain
                );
                const profile = result as Profile | null;
                profileCache.set(address, profile);
                return profile;
            } catch (err) {
                console.error('Error fetching profile:', err);
                profileCache.set(address, null);
                return null;
            } finally {
                pendingRequests.delete(address);
            }
        })();

        pendingRequests.set(address, request);
        return request;
    }, [chain]);

    // Fetch my profile
    const refreshMyProfile = useCallback(async () => {
        if (!connectedAddr || !chain) {
            setMyProfile(null);
            return;
        }

        setIsLoadingMyProfile(true);
        try {
            // Clear cache for own address to get fresh data
            profileCache.delete(connectedAddr);
            const profile = await fetchProfile(connectedAddr);
            if (mountedRef.current) {
                setMyProfile(profile);
            }
        } finally {
            if (mountedRef.current) {
                setIsLoadingMyProfile(false);
            }
        }
    }, [connectedAddr, chain, fetchProfile]);

    // Load my profile on connect
    useEffect(() => {
        refreshMyProfile();
    }, [refreshMyProfile]);

    // Resolve addresses on mount
    useEffect(() => {
        if (options?.addresses && options.addresses.length > 0) {
            resolveAddresses(options.addresses);
        }
    }, [options?.addresses]);

    // Resolve single address
    const resolveAddress = useCallback(async (address: string): Promise<Profile | null> => {
        const profile = await fetchProfile(address);
        if (mountedRef.current) {
            setResolvedProfiles(prev => new Map(prev).set(address, profile));
        }
        return profile;
    }, [fetchProfile]);

    // Resolve multiple addresses
    const resolveAddresses = useCallback(async (addresses: string[]): Promise<Map<string, Profile | null>> => {
        const results = new Map<string, Profile | null>();

        await Promise.all(addresses.map(async (addr) => {
            const profile = await fetchProfile(addr);
            results.set(addr, profile);
        }));

        if (mountedRef.current) {
            setResolvedProfiles(prev => {
                const newMap = new Map(prev);
                results.forEach((profile, addr) => newMap.set(addr, profile));
                return newMap;
            });
        }

        return results;
    }, [fetchProfile]);

    // Get display name from cache (synchronous)
    const getDisplayName = useCallback((address: string): string | null => {
        const cached = profileCache.get(address) || resolvedProfiles.get(address);
        return cached?.display_name ?? null;
    }, [resolvedProfiles]);

    // Check name availability
    const isNameAvailable = useCallback(async (name: string): Promise<boolean> => {
        if (!chain) return false;

        const nsAddr = getNameServiceAddr(chain);
        if (!nsAddr) return false;

        try {
            const result = await fetchContractStateSmart(
                nsAddr,
                { is_name_available: { name } },
                chain
            );
            return result as boolean;
        } catch (err) {
            console.error('Error checking name availability:', err);
            return false;
        }
    }, [chain]);

    // Search by name prefix
    const searchByPrefix = useCallback(async (prefix: string, limit?: number): Promise<Profile[]> => {
        if (!chain || !prefix) return [];

        const nsAddr = getNameServiceAddr(chain);
        if (!nsAddr) return [];

        try {
            const result = await fetchContractStateSmart(
                nsAddr,
                { search_by_prefix: { prefix, limit: limit || 10 } },
                chain
            );
            return (result as Profile[]) || [];
        } catch (err) {
            console.error('Error searching profiles:', err);
            return [];
        }
    }, [chain]);

    // Set profile
    const setProfileFn = useCallback(async (
        name: string,
        bio?: string,
        image?: string
    ): Promise<boolean> => {
        if (!connectedAddr || !chain) return false;

        const nsAddr = getNameServiceAddr(chain);
        if (!nsAddr) return false;

        setIsSaving(true);
        setSaveError(null);

        try {
            const msg: Record<string, unknown> = {
                set_profile: {
                    name,
                    bio: bio || null,
                    image: image || null,
                }
            };

            const tx: UnsignedTx = {
                msgs: [new MsgExecuteContract({
                    sender: connectedAddr,
                    contract: nsAddr,
                    funds: [],
                    msg
                })],
            };

            await broadcast(tx);

            // Create the expected profile object immediately
            const newProfile: Profile = {
                address: connectedAddr,
                name: name.toLowerCase(),
                display_name: name,
                bio: bio || null,
                image: image || null,
            };

            // Update cache immediately with the new profile
            profileCache.set(connectedAddr, newProfile);
            setMyProfile(newProfile);

            // Notify all listeners about the profile update immediately
            notifyProfileUpdate(connectedAddr, newProfile);

            // Also refresh from chain in background to ensure consistency
            setTimeout(() => {
                profileCache.delete(connectedAddr);
                refreshMyProfile();
            }, 2000);

            return true;
        } catch (err) {
            console.error('Error setting profile:', err);
            setSaveError(err instanceof Error ? err.message : 'Failed to save profile');
            return false;
        } finally {
            if (mountedRef.current) {
                setIsSaving(false);
            }
        }
    }, [connectedAddr, chain, broadcast, refreshMyProfile]);

    // Delete profile
    const deleteProfile = useCallback(async (): Promise<boolean> => {
        if (!connectedAddr || !chain) return false;

        const nsAddr = getNameServiceAddr(chain);
        if (!nsAddr) return false;

        setIsDeleting(true);
        setSaveError(null);

        try {
            const msg = { delete_profile: {} };

            const tx: UnsignedTx = {
                msgs: [new MsgExecuteContract({
                    sender: connectedAddr,
                    contract: nsAddr,
                    funds: [],
                    msg
                })],
            };

            await broadcast(tx);

            // Clear cache and refresh
            profileCache.delete(connectedAddr);
            setMyProfile(null);

            // Notify all listeners about the profile deletion
            notifyProfileUpdate(connectedAddr, null);

            return true;
        } catch (err) {
            console.error('Error deleting profile:', err);
            setSaveError(err instanceof Error ? err.message : 'Failed to delete profile');
            return false;
        } finally {
            if (mountedRef.current) {
                setIsDeleting(false);
            }
        }
    }, [connectedAddr, chain, broadcast]);

    return {
        myProfile,
        isLoadingMyProfile,
        isSaving,
        isDeleting,
        saveError,
        setProfile: setProfileFn,
        deleteProfile,
        refreshMyProfile,
        resolveAddress,
        resolveAddresses,
        getDisplayName,
        isNameAvailable,
        searchByPrefix,
    };
}

// Export cache utilities for testing/debugging
export function clearProfileCache() {
    profileCache.clear();
}

export function getProfileFromCache(address: string): Profile | null | undefined {
    return profileCache.get(address);
}
