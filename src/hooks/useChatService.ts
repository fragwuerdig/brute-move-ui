import { useState, useEffect, useCallback, useRef } from 'react';
import { config } from '../config';

export interface ChatMessage {
    id: string;
    sender: string;
    recipient: string;
    body: string;
    created_at: string;
}

export interface UseChatServiceOptions {
    /** The current user's terra address */
    myAddress: string | undefined;
    /** The peer's terra address (opponent) */
    peerAddress: string | undefined;
    /** Chain ID for Keplr signing */
    chainId: string;
    /** Whether chat should be enabled */
    enabled: boolean;
}

export interface ChatServiceState {
    /** Connection and auth status */
    status: 'disconnected' | 'authenticating' | 'connecting' | 'connected' | 'error';
    /** Error message if any */
    error: string | null;
    /** List of messages in the conversation */
    messages: ChatMessage[];
    /** Whether we're loading history */
    loadingHistory: boolean;
    /** Send a message to the peer */
    sendMessage: (body: string) => void;
    /** Connect to chat (must be called explicitly) */
    connect: () => void;
    /** Manually reconnect */
    reconnect: () => void;
    /** Disconnect chat */
    disconnect: () => void;
}

interface ChallengeResponse {
    challenge_id: string;
    challenge: string;
    expires: string;
}

interface VerifyResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    user_id: string;
}

// Build the user ID format used by the chat server
function buildUserId(terraAddr: string): string {
    return `@${terraAddr}:${config.chat.domain}`;
}

export function useChatService({
    myAddress,
    peerAddress,
    chainId,
    enabled,
}: UseChatServiceOptions): ChatServiceState {
    const [status, setStatus] = useState<ChatServiceState['status']>('disconnected');
    const [error, setError] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    const wsRef = useRef<WebSocket | null>(null);
    const tokenRef = useRef<string | null>(null);
    const reconnectTimeoutRef = useRef<number | null>(null);
    const isAuthenticatingRef = useRef(false);

    // Memoized peer user ID
    const peerUserId = peerAddress ? buildUserId(peerAddress) : null;
    const myUserId = myAddress ? buildUserId(myAddress) : null;

    // Fetch challenge from auth server
    const fetchChallenge = useCallback(async (terraAddr: string): Promise<ChallengeResponse> => {
        const response = await fetch(`${config.chat.authUrl}/auth/challenge`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ terra_addr: terraAddr }),
        });

        if (!response.ok) {
            throw new Error(`Challenge request failed: ${response.status}`);
        }

        return response.json();
    }, []);

    // Sign challenge with Keplr
    const signChallenge = useCallback(async (
        terraAddr: string,
        challenge: string,
        chainId: string
    ): Promise<{ signature: string; publicKey: string }> => {
        if (!window.keplr) {
            throw new Error('Keplr wallet not found');
        }

        // Enable the chain first
        await window.keplr.enable(chainId);

        // Sign the challenge as arbitrary data using signArbitrary
        const signResponse = await window.keplr.signArbitrary(chainId, terraAddr, challenge);

        return {
            signature: signResponse.signature,
            publicKey: signResponse.pub_key.value,
        };
    }, []);

    // Verify signature and get JWT
    const verifySignature = useCallback(async (
        challengeId: string,
        terraAddr: string,
        signature: string,
        publicKey: string
    ): Promise<VerifyResponse> => {
        const response = await fetch(`${config.chat.authUrl}/auth/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                challenge_id: challengeId,
                terra_addr: terraAddr,
                signature,
                public_key: publicKey,
            }),
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || `Verification failed: ${response.status}`);
        }

        return response.json();
    }, []);

    // Fetch message history
    const fetchHistory = useCallback(async (token: string, peer: string): Promise<ChatMessage[]> => {
        const response = await fetch(
            `${config.chat.chatUrl}/messages?peer=${encodeURIComponent(peer)}&limit=50`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            }
        );

        if (!response.ok) {
            throw new Error(`Failed to fetch history: ${response.status}`);
        }

        const data = await response.json();
        return data.messages || [];
    }, []);

    // Connect WebSocket
    const connectWebSocket = useCallback((token: string) => {
        if (wsRef.current) {
            wsRef.current.close();
        }

        setStatus('connecting');

        const ws = new WebSocket(`${config.chat.wsUrl}/connect?token=${encodeURIComponent(token)}`);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log('[Chat] WebSocket opened');
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                if (data.type === 'ready') {
                    console.log('[Chat] Connected as', data.user_id);
                    setStatus('connected');
                    setError(null);
                    isAuthenticatingRef.current = false;
                } else if (data.type === 'dm' && data.message) {
                    // Incoming message
                    const msg: ChatMessage = data.message;
                    setMessages((prev) => {
                        // Avoid duplicates
                        if (prev.some((m) => m.id === msg.id)) {
                            return prev;
                        }
                        return [...prev, msg];
                    });
                } else if (data.type === 'ack') {
                    // Message acknowledged - could update UI if needed
                    console.log('[Chat] Message acked:', data.msg_id);
                } else if (data.type === 'error') {
                    console.error('[Chat] Server error:', data.error);
                    if (data.error === 'unauthorized') {
                        setStatus('disconnected');
                        tokenRef.current = null;
                    }
                }
            } catch (err) {
                console.error('[Chat] Failed to parse message:', err);
            }
        };

        ws.onerror = (event) => {
            console.error('[Chat] WebSocket error:', event);
            setError('Connection error');
        };

        ws.onclose = (event) => {
            console.log('[Chat] WebSocket closed:', event.code, event.reason);
            wsRef.current = null;
            setStatus('disconnected');
            // Don't auto-reconnect - user must explicitly connect
        };
    }, []);

    // Full authentication flow
    const authenticate = useCallback(async () => {
        if (!myAddress || !chainId) {
            return;
        }

        // Prevent double-authentication (React StrictMode or race conditions)
        if (isAuthenticatingRef.current) {
            console.log('[Chat] Authentication already in progress, skipping');
            return;
        }
        isAuthenticatingRef.current = true;

        setStatus('authenticating');
        setError(null);

        try {
            // Step 1: Get challenge
            const challengeData = await fetchChallenge(myAddress);

            // Step 2: Sign with Keplr
            const { signature, publicKey } = await signChallenge(
                myAddress,
                challengeData.challenge,
                chainId
            );

            // Step 3: Verify and get token
            const verifyData = await verifySignature(
                challengeData.challenge_id,
                myAddress,
                signature,
                publicKey
            );

            tokenRef.current = verifyData.access_token;

            // Step 4: Connect WebSocket
            connectWebSocket(verifyData.access_token);

            // Step 5: Fetch history
            if (peerUserId) {
                setLoadingHistory(true);
                try {
                    const history = await fetchHistory(verifyData.access_token, peerUserId);
                    setMessages(history);
                } catch (err) {
                    console.error('[Chat] Failed to fetch history:', err);
                } finally {
                    setLoadingHistory(false);
                }
            }
        } catch (err) {
            console.error('[Chat] Authentication failed:', err);
            setError(err instanceof Error ? err.message : 'Authentication failed');
            setStatus('error');
            isAuthenticatingRef.current = false;
        }
    }, [myAddress, chainId, peerUserId, fetchChallenge, signChallenge, verifySignature, connectWebSocket, fetchHistory]);

    // Send message
    const sendMessage = useCallback((body: string) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
            console.error('[Chat] Cannot send: not connected');
            return;
        }

        if (!peerUserId) {
            console.error('[Chat] Cannot send: no peer');
            return;
        }

        const msgId = crypto.randomUUID();
        const message = {
            type: 'dm',
            to: peerUserId,
            body,
            msg_id: msgId,
        };

        wsRef.current.send(JSON.stringify(message));

        // Optimistically add the message
        if (myUserId) {
            const optimisticMsg: ChatMessage = {
                id: msgId,
                sender: myUserId,
                recipient: peerUserId,
                body,
                created_at: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, optimisticMsg]);
        }
    }, [peerUserId, myUserId]);

    // Reconnect
    const reconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }
        if (tokenRef.current) {
            connectWebSocket(tokenRef.current);
        } else {
            authenticate();
        }
    }, [authenticate, connectWebSocket]);

    // Disconnect
    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        tokenRef.current = null;
        isAuthenticatingRef.current = false;
        setStatus('disconnected');
        setMessages([]);
    }, []);

    // Connect function - must be called explicitly by user
    const connect = useCallback(() => {
        if (!enabled || !myAddress || !peerAddress) {
            return;
        }
        if (tokenRef.current) {
            connectWebSocket(tokenRef.current);
        } else {
            authenticate();
        }
    }, [enabled, myAddress, peerAddress, authenticate, connectWebSocket]);

    // Effect: cleanup on unmount or disable
    useEffect(() => {
        if (!enabled) {
            disconnect();
        }

        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [enabled, disconnect]);

    // Effect: disconnect when user address changes (wallet switch)
    const prevMyAddressRef = useRef(myAddress);
    useEffect(() => {
        if (prevMyAddressRef.current && prevMyAddressRef.current !== myAddress) {
            console.log('[Chat] User address changed, disconnecting');
            disconnect();
        }
        prevMyAddressRef.current = myAddress;
    }, [myAddress, disconnect]);

    // Effect: fetch history when peer changes and we're connected
    useEffect(() => {
        if (status === 'connected' && tokenRef.current && peerUserId) {
            setLoadingHistory(true);
            setMessages([]);
            fetchHistory(tokenRef.current, peerUserId)
                .then(setMessages)
                .catch((err) => console.error('[Chat] Failed to fetch history:', err))
                .finally(() => setLoadingHistory(false));
        }
    }, [peerUserId, status, fetchHistory]);

    return {
        status,
        error,
        messages,
        loadingHistory,
        sendMessage,
        connect,
        reconnect,
        disconnect,
    };
}

// Type declaration for Keplr
declare global {
    interface Window {
        keplr?: {
            enable: (chainId: string) => Promise<void>;
            getKey: (chainId: string) => Promise<{
                name: string;
                algo: string;
                pubKey: Uint8Array;
                address: Uint8Array;
                bech32Address: string;
                isNanoLedger: boolean;
            }>;
            signArbitrary: (
                chainId: string,
                signer: string,
                data: string
            ) => Promise<{
                signature: string;
                pub_key: {
                    type: string;
                    value: string;
                };
            }>;
        };
    }
}
