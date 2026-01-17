import React, { useState, useRef, useEffect } from 'react';
import { useChatContext } from '../hooks/ChatContext';
import type { ChatMessage } from '../hooks/useChatService';
import { addressEllipsis } from '../Common';
import './ChatPanel.css';

interface ChatPanelProps {
    /** Optional display name for the peer */
    peerDisplayName?: string;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
    peerDisplayName,
}) => {
    const [inputValue, setInputValue] = useState('');
    const [isExpanded, setIsExpanded] = useState(true);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showQuickPhrases, setShowQuickPhrases] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const emojiPickerRef = useRef<HTMLDivElement>(null);
    const quickPhrasesRef = useRef<HTMLDivElement>(null);

    // Common emojis for chess games
    const emojis = ['👍', '👎', '😀', '😂', '🤔', '😮', '😅', '🙈', '🔥', '💪', '👏', '🎉', '♟️', '👑', '💀', '😈', '💥'];

    // Quick phrases for chess games
    const quickPhrases = [
        { text: 'Good luck!', emoji: '🍀' },
        { text: 'Good game!', emoji: '🤝' },
        { text: 'Well played!', emoji: '👏' },
        { text: 'Nice move!', emoji: '👍' },
        { text: 'Wow!', emoji: '😮' },
        { text: 'Oops!', emoji: '😅' },
        { text: 'Thanks!', emoji: '🙏' },
        { text: 'Rematch?', emoji: '🔄' },
        { text: 'Check!', emoji: '♟️' },
        { text: 'Checkmate!', emoji: '👑' },
    ];

    // Get chat from context (connection is maintained by ChatProvider)
    const { myAddress, peerAddress, ...chat } = useChatContext();

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, [chat.messages]);

    // Close pickers when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
                setShowEmojiPicker(false);
            }
            if (quickPhrasesRef.current && !quickPhrasesRef.current.contains(event.target as Node)) {
                setShowQuickPhrases(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = inputValue.trim();
        if (!trimmed) return;

        chat.sendMessage(trimmed);
        setInputValue('');
        inputRef.current?.focus();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    const handleEmojiClick = (emoji: string) => {
        setInputValue(prev => prev + emoji);
        setShowEmojiPicker(false);
        inputRef.current?.focus();
    };

    const handleQuickPhrase = (phrase: string) => {
        if (chat.status === 'connected') {
            chat.sendMessage(phrase);
        }
        setShowQuickPhrases(false);
    };

    // Extract address from user ID for display
    const extractAddress = (userId: string): string => {
        const match = userId.match(/^@(terra1[0-9a-z]+):/);
        return match ? match[1] : userId;
    };

    const formatTime = (isoString: string): string => {
        const date = new Date(isoString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const isMyMessage = (msg: ChatMessage): boolean => {
        const senderAddr = extractAddress(msg.sender);
        return senderAddr === myAddress;
    };

    const renderStatusIndicator = () => {
        switch (chat.status) {
            case 'connected':
                return <span className="chat-status chat-status--connected">●</span>;
            case 'connecting':
            case 'authenticating':
                return <span className="chat-status chat-status--connecting">●</span>;
            case 'error':
                return (
                    <span
                        className="chat-status chat-status--error"
                        title={chat.error || 'Connection error'}
                        onClick={chat.reconnect}
                        style={{ cursor: 'pointer' }}
                    >
                        ● Retry
                    </span>
                );
            default:
                return <span className="chat-status chat-status--disconnected">●</span>;
        }
    };

    const peerLabel = peerDisplayName || (peerAddress ? addressEllipsis(peerAddress) : 'Opponent');

    const isDisconnected = chat.status === 'disconnected';
    const isConnecting = chat.status === 'authenticating' || chat.status === 'connecting';

    return (
        <div className={`chat-panel ${isExpanded ? 'chat-panel--expanded' : 'chat-panel--collapsed'}`}>
            <div
                className="chat-panel__header"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="chat-panel__header-left">
                    {renderStatusIndicator()}
                    <span className="chat-panel__title">Chat with {peerLabel}</span>
                </div>
                <div className="chat-panel__header-right">
                    {chat.status === 'connected' && (
                        <button
                            className="chat-panel__disconnect-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                chat.disconnect();
                            }}
                            title="Disconnect chat"
                        >
                            ✕
                        </button>
                    )}
                    <button
                        className="chat-panel__toggle"
                        aria-label={isExpanded ? 'Collapse chat' : 'Expand chat'}
                    >
                        {isExpanded ? '▼' : '▲'}
                    </button>
                </div>
            </div>

            {isExpanded && (
                <>
                    {isDisconnected ? (
                        <div className="chat-panel__connect-prompt">
                            <div className="chat-panel__connect-content">
                                <span className="chat-panel__connect-icon">💬</span>
                                <p className="chat-panel__connect-text">
                                    Chat with your opponent during the game
                                </p>
                                <button
                                    className="chat-panel__connect-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        chat.connect();
                                    }}
                                >
                                    Connect Chat
                                </button>
                            </div>
                        </div>
                    ) : isConnecting ? (
                        <div className="chat-panel__connect-prompt">
                            <div className="chat-panel__connect-content">
                                <span className="chat-panel__connect-icon chat-panel__connect-icon--loading">⏳</span>
                                <p className="chat-panel__connect-text">
                                    Connecting to chat...
                                </p>
                            </div>
                        </div>
                    ) : chat.status === 'error' ? (
                        <div className="chat-panel__connect-prompt">
                            <div className="chat-panel__connect-content">
                                <span className="chat-panel__connect-icon">⚠️</span>
                                <p className="chat-panel__connect-text chat-panel__connect-text--error">
                                    {chat.error || 'Connection failed'}
                                </p>
                                <button
                                    className="chat-panel__connect-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        chat.connect();
                                    }}
                                >
                                    Try Again
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="chat-panel__messages">
                                {chat.loadingHistory && (
                                    <div className="chat-panel__loading">Loading messages...</div>
                                )}

                                {chat.messages.length === 0 && !chat.loadingHistory && (
                                    <div className="chat-panel__empty">
                                        No messages yet. Say hello!
                                    </div>
                                )}

                                {chat.messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={`chat-message ${isMyMessage(msg) ? 'chat-message--mine' : 'chat-message--theirs'}`}
                                    >
                                        <div className="chat-message__bubble">
                                            <span className="chat-message__text">{msg.body}</span>
                                            <span className="chat-message__time">{formatTime(msg.created_at)}</span>
                                        </div>
                                    </div>
                                ))}

                                <div ref={messagesEndRef} />
                            </div>

                            <form className="chat-panel__input-area" onSubmit={handleSubmit}>
                                <div className="chat-panel__toolbar">
                                    <div className="chat-panel__picker-container" ref={emojiPickerRef}>
                                        <button
                                            type="button"
                                            className="chat-panel__toolbar-btn"
                                            onClick={() => {
                                                setShowEmojiPicker(!showEmojiPicker);
                                                setShowQuickPhrases(false);
                                            }}
                                            disabled={chat.status !== 'connected'}
                                            title="Add emoji"
                                        >
                                            😀
                                        </button>
                                        {showEmojiPicker && (
                                            <div className="chat-panel__emoji-picker">
                                                {emojis.map((emoji) => (
                                                    <button
                                                        key={emoji}
                                                        type="button"
                                                        className="chat-panel__emoji-btn"
                                                        onClick={() => handleEmojiClick(emoji)}
                                                    >
                                                        {emoji}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="chat-panel__picker-container" ref={quickPhrasesRef}>
                                        <button
                                            type="button"
                                            className="chat-panel__toolbar-btn"
                                            onClick={() => {
                                                setShowQuickPhrases(!showQuickPhrases);
                                                setShowEmojiPicker(false);
                                            }}
                                            disabled={chat.status !== 'connected'}
                                            title="Quick phrases"
                                        >
                                            💬
                                        </button>
                                        {showQuickPhrases && (
                                            <div className="chat-panel__quick-phrases">
                                                {quickPhrases.map((phrase) => (
                                                    <button
                                                        key={phrase.text}
                                                        type="button"
                                                        className="chat-panel__phrase-btn"
                                                        onClick={() => handleQuickPhrase(`${phrase.emoji} ${phrase.text}`)}
                                                    >
                                                        <span className="chat-panel__phrase-emoji">{phrase.emoji}</span>
                                                        <span className="chat-panel__phrase-text">{phrase.text}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <input
                                    ref={inputRef}
                                    type="text"
                                    className="chat-panel__input"
                                    placeholder="Type a message..."
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    maxLength={1000}
                                />
                                <button
                                    type="submit"
                                    className="chat-panel__send-btn"
                                    disabled={!inputValue.trim()}
                                >
                                    Send
                                </button>
                            </form>
                        </>
                    )}
                </>
            )}
        </div>
    );
};

export default ChatPanel;
