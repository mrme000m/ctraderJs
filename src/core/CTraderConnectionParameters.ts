export type CTraderConnectionParameters = {
    host: string;
    port: number;
    useWebSocket?: boolean;
    maxRequestsPerSecond?: number;
    heartbeatInterval?: number;
};

export type CTraderAuthParameters = {
    clientId: string;
    clientSecret: string;
    accessToken?: string;
    scope?: 'trading' | 'accounts';
};

export type CTraderTokenInfo = {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    scope: string;
};
