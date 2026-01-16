// App configuration

export const config = {
    // Telegram notification bot username (without @)
    telegramBotUsername: 'brutemovebot',

    // Chat server configuration
    chat: {
        // Auth service base URL (REST API)
        authUrl: import.meta.env.VITE_CHAT_AUTH_URL || 'http://localhost:8080',
        // Chat service base URL (REST API for history)
        chatUrl: import.meta.env.VITE_CHAT_API_URL || 'http://localhost:8081',
        // Chat WebSocket URL
        wsUrl: import.meta.env.VITE_CHAT_WS_URL || 'ws://localhost:8081',
        // Chat domain (must match server CHAT_DOMAIN)
        domain: import.meta.env.VITE_CHAT_DOMAIN || 'chat.example.org',
    },
};
