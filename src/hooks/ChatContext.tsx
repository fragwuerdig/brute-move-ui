import React, { createContext, useContext, type ReactNode } from 'react';
import { useChatService, type ChatServiceState, type UseChatServiceOptions } from './useChatService';

// Extended state that includes address info for the UI
export interface ChatContextValue extends ChatServiceState {
    myAddress: string | undefined;
    peerAddress: string | undefined;
}

// Create context with undefined as default (must be used within provider)
const ChatContext = createContext<ChatContextValue | undefined>(undefined);

export interface ChatProviderProps extends UseChatServiceOptions {
    children: ReactNode;
}

/**
 * ChatProvider maintains the chat WebSocket connection at a higher level
 * in the component tree, so it persists across UI state changes like
 * entering/exiting exploration mode.
 */
export function ChatProvider({
    children,
    myAddress,
    peerAddress,
    chainId,
    enabled,
}: ChatProviderProps) {
    const chatService = useChatService({
        myAddress,
        peerAddress,
        chainId,
        enabled,
    });

    const contextValue: ChatContextValue = {
        ...chatService,
        myAddress,
        peerAddress,
    };

    return (
        <ChatContext.Provider value={contextValue}>
            {children}
        </ChatContext.Provider>
    );
}

/**
 * Hook to access chat service from the ChatProvider context.
 * Must be used within a ChatProvider.
 */
export function useChatContext(): ChatContextValue {
    const context = useContext(ChatContext);
    if (context === undefined) {
        throw new Error('useChatContext must be used within a ChatProvider');
    }
    return context;
}

export { ChatContext };
