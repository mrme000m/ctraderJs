import { EventEmitter } from "events";
import { CTraderAuthParameters, CTraderTokenInfo } from "#CTraderConnectionParameters";
import { CTraderAuth } from "#auth/CTraderAuth";
import { GenericObject } from "#utilities/GenericObject";
import { CTraderConnection } from "./CTraderConnection";

/**
 * Enhanced cTrader Connection class with latest API features
 * Supports both TCP and WebSocket connections, enhanced authentication, and token refresh
 */
export class CTraderConnectionV2 extends EventEmitter {
    private readonly host: string;
    private readonly port: number;
    private readonly useWebSocket: boolean;
    private readonly maxRequestsPerSecond: number;
    private readonly heartbeatInterval: number;

    private auth?: CTraderAuth;
    private tokenInfo?: CTraderTokenInfo;
    private heartbeatTimer?: NodeJS.Timeout;
    private isConnected: boolean = false;
    private connection?: CTraderConnection;

    constructor(options: {
        host: string;
        port: number;
        useWebSocket?: boolean;
        maxRequestsPerSecond?: number;
        heartbeatInterval?: number;
    }) {
        super();

        this.host = options.host;
        this.port = options.port;
        this.useWebSocket = options.useWebSocket ?? false;
        this.maxRequestsPerSecond = options.maxRequestsPerSecond ?? 40;
        this.heartbeatInterval = options.heartbeatInterval ?? 25000;
    }

    /**
     * Initialize authentication with client credentials
     */
    public initializeAuth(authParams: CTraderAuthParameters): void {
        this.auth = new CTraderAuth(
            authParams.clientId,
            authParams.clientSecret
        );
    }

    /**
     * Get authentication URL for OAuth2 flow
     */
    public getAuthUri(scope: 'trading' | 'accounts' = 'trading'): string {
        if (!this.auth) {
            throw new Error('Authentication not initialized. Call initializeAuth() first.');
        }
        return this.auth.getAuthUri(scope);
    }

    /**
     * Exchange authorization code for access token
     */
    public async exchangeCodeForToken(authCode: string): Promise<CTraderTokenInfo> {
        if (!this.auth) {
            throw new Error('Authentication not initialized. Call initializeAuth() first.');
        }
        
        this.tokenInfo = await this.auth.getToken(authCode);
        return this.tokenInfo;
    }

    /**
     * Refresh access token using refresh token
     */
    public async refreshToken(): Promise<CTraderTokenInfo> {
        if (!this.auth || !this.tokenInfo?.refreshToken) {
            throw new Error('No refresh token available. Authentication required first.');
        }
        
        this.tokenInfo = await this.auth.refreshToken(this.tokenInfo.refreshToken);
        return this.tokenInfo;
    }

    /**
     * Connect to cTrader Open API
     */
    public async connect(): Promise<void> {
        try {
            if (this.useWebSocket) {
                await this.connectWebSocket();
            } else {
                await this.connectTcp();
            }

            this.isConnected = true;
            this.startHeartbeat();
            this.emit('connected');
        } catch (error) {
            this.emit('error', error);
            throw error;
        }
    }

    // Command methods are implemented later in the file (deduplicated).

    /**
     * Disconnect from the API
     */
    public disconnect(): void {
        this.stopHeartbeat();
        this.isConnected = false;
        this.emit('disconnected');
    }

    /**
     * Send application authentication request
     */
    public async authenticateApplication(clientId: string, clientSecret: string): Promise<GenericObject> {
        const authReq = {
            clientId,
            clientSecret
        };
        
        return this.sendCommand('ProtoOAApplicationAuthReq', authReq);
    }

    /**
     * Send account authentication request
     */
    public async authenticateAccount(ctidTraderAccountId: number, accessToken: string): Promise<GenericObject> {
        const accountAuthReq = {
            ctidTraderAccountId,
            accessToken
        };
        
        return this.sendCommand('ProtoOAAccountAuthReq', accountAuthReq);
    }

    /**
     * Send a command to the API
     */
    public async sendCommand(payloadType: string | number, data?: GenericObject): Promise<GenericObject> {
        if (!this.isConnected) {
            throw new Error('Not connected to the API');
        }

        // Implementation would depend on the specific transport layer
        // This is a placeholder for the command sending logic
        const command = {
            payloadType,
            data: data || {},
            timestamp: Date.now()
        };

        this.emit('commandSent', command);
        return Promise.resolve(command);
    }

    /**
     * Get trader account information
     */
    public async getTraderInfo(ctidTraderAccountId: number): Promise<GenericObject> {
        const request = {
            ctidTraderAccountId
        };

        return this.sendCommand('ProtoOATraderReq', request);
    }

    /**
     * Get symbols list for a trading account
     */
    public async getSymbolsList(ctidTraderAccountId: number, includeArchivedSymbols: boolean = false): Promise<GenericObject> {
        const request = {
            ctidTraderAccountId,
            includeArchivedSymbols
        };

        return this.sendCommand('ProtoOASymbolsListReq', request);
    }

    /**
     * Get symbol by ID
     */
    public async getSymbolById(ctidTraderAccountId: number, symbolIds: number[]): Promise<GenericObject> {
        const request = {
            ctidTraderAccountId,
            symbolId: symbolIds
        };

        return this.sendCommand('ProtoOASymbolByIdReq', request);
    }

    /**
     * Get account reconciliation (positions and orders)
     */
    public async reconcile(ctidTraderAccountId: number, returnProtectionOrders: boolean = false): Promise<GenericObject> {
        const request = {
            ctidTraderAccountId,
            returnProtectionOrders
        };

        return this.sendCommand('ProtoOAReconcileReq', request);
    }

    /**
     * Get deals list
     */
    public async getDealsList(
        ctidTraderAccountId: number,
        fromTimestamp: number,
        toTimestamp: number,
        maxRows?: number
    ): Promise<GenericObject> {
        const request = {
            ctidTraderAccountId,
            fromTimestamp,
            toTimestamp,
            maxRows
        };

        return this.sendCommand('ProtoOADealListReq', request);
    }

    /**
     * Get orders list
     */
    public async getOrdersList(
        ctidTraderAccountId: number,
        fromTimestamp?: number,
        toTimestamp?: number
    ): Promise<GenericObject> {
        const request = {
            ctidTraderAccountId,
            fromTimestamp,
            toTimestamp
        };

        return this.sendCommand('ProtoOAOrderListReq', request);
    }

    /**
     * Get expected margin for a trade
     */
    public async getExpectedMargin(
        ctidTraderAccountId: number,
        symbolId: number,
        volumes: number[]
    ): Promise<GenericObject> {
        const request = {
            ctidTraderAccountId,
            symbolId,
            volume: volumes
        };

        return this.sendCommand('ProtoOAExpectedMarginReq', request);
    }

    /**
     * Get cash flow history (deposits and withdrawals)
     */
    public async getCashFlowHistory(
        ctidTraderAccountId: number,
        fromTimestamp: number,
        toTimestamp: number
    ): Promise<GenericObject> {
        const request = {
            ctidTraderAccountId,
            fromTimestamp,
            toTimestamp
        };

        return this.sendCommand('ProtoOACashFlowHistoryListReq', request);
    }

    /**
     * Subscribe to spot events (prices)
     */
    public async subscribeSpots(
        ctidTraderAccountId: number,
        symbolIds: number[],
        subscribeToSpotTimestamp: boolean = false
    ): Promise<GenericObject> {
        const request = {
            ctidTraderAccountId,
            symbolId: symbolIds,
            subscribeToSpotTimestamp
        };

        return this.sendCommand('ProtoOASubscribeSpotsReq', request);
    }

    /**
     * Unsubscribe from spot events
     */
    public async unsubscribeSpots(ctidTraderAccountId: number, symbolIds: number[]): Promise<GenericObject> {
        const request = {
            ctidTraderAccountId,
            symbolId: symbolIds
        };

        return this.sendCommand('ProtoOAUnsubscribeSpotsReq', request);
    }

    /**
     * Get trend bars (historical data)
     */
    public async getTrendbars(
        ctidTraderAccountId: number,
        symbolId: number,
        period: number,
        fromTimestamp: number,
        toTimestamp: number,
        count?: number
    ): Promise<GenericObject> {
        const request = {
            ctidTraderAccountId,
            symbolId,
            period,
            fromTimestamp,
            toTimestamp,
            count
        };

        return this.sendCommand('ProtoOAGetTrendbarsReq', request);
    }

    /**
     * Get tick data
     */
    public async getTickData(
        ctidTraderAccountId: number,
        symbolId: number,
        type: number,
        fromTimestamp: number,
        toTimestamp: number
    ): Promise<GenericObject> {
        const request = {
            ctidTraderAccountId,
            symbolId,
            type,
            fromTimestamp,
            toTimestamp
        };

        return this.sendCommand('ProtoOAGetTickDataReq', request);
    }

    /**
     * Get dynamic leverage by ID
     */
    public async getDynamicLeverageById(ctidTraderAccountId: number, leverageId: number): Promise<GenericObject> {
        const request = {
            ctidTraderAccountId,
            leverageId
        };

        return this.sendCommand('ProtoOAGetDynamicLeverageByIDReq', request);
    }

    /**
     * Get deals by position ID
     */
    public async getDealsByPositionId(
        ctidTraderAccountId: number,
        positionId: number,
        fromTimestamp?: number,
        toTimestamp?: number
    ): Promise<GenericObject> {
        const request = {
            ctidTraderAccountId,
            positionId,
            fromTimestamp,
            toTimestamp
        };

        return this.sendCommand('ProtoOADealListByPositionIdReq', request);
    }

    /**
     * Get order details
     */
    public async getOrderDetails(ctidTraderAccountId: number, orderId: number): Promise<GenericObject> {
        const request = {
            ctidTraderAccountId,
            orderId
        };

        return this.sendCommand('ProtoOAOrderDetailsReq', request);
    }

    /**
     * Get orders by position ID
     */
    public async getOrdersByPositionId(
        ctidTraderAccountId: number,
        positionId: number,
        fromTimestamp?: number,
        toTimestamp?: number
    ): Promise<GenericObject> {
        const request = {
            ctidTraderAccountId,
            positionId,
            fromTimestamp,
            toTimestamp
        };

        return this.sendCommand('ProtoOAOrderListByPositionIdReq', request);
    }

    /**
     * Get deal offset list
     */
    public async getDealOffsetList(ctidTraderAccountId: number, dealId: number): Promise<GenericObject> {
        const request = {
            ctidTraderAccountId,
            dealId
        };

        return this.sendCommand('ProtoOADealOffsetListReq', request);
    }

    /**
     * Get position unrealized PnL
     */
    public async getPositionUnrealizedPnL(ctidTraderAccountId: number): Promise<GenericObject> {
        const request = {
            ctidTraderAccountId
        };

        return this.sendCommand('ProtoOAGetPositionUnrealizedPnLReq', request);
    }

    /**
     * Get margin call list
     */
    public async getMarginCallList(ctidTraderAccountId: number): Promise<GenericObject> {
        const request = {
            ctidTraderAccountId
        };

        return this.sendCommand('ProtoOAMarginCallListReq', request);
    }

    /**
     * Update margin call
     */
    public async updateMarginCall(ctidTraderAccountId: number, marginCall: GenericObject): Promise<GenericObject> {
        const request = {
            ctidTraderAccountId,
            marginCall
        };

        return this.sendCommand('ProtoOAMarginCallUpdateReq', request);
    }

    /**
     * Logout from trading account
     */
    public async logoutAccount(ctidTraderAccountId: number): Promise<GenericObject> {
        const request = {
            ctidTraderAccountId
        };

        return this.sendCommand('ProtoOAAccountLogoutReq', request);
    }

    /**
     * Send heartbeat to keep connection alive
     */
    public sendHeartbeat(): void {
        if (this.isConnected) {
            this.sendCommand('ProtoHeartbeatEvent');
            this.emit('heartbeatSent');
        }
    }

    /**
     * Get access token profile information
     */
    public static async getAccessTokenProfile(accessToken: string): Promise<GenericObject> {
        const response = await fetch(`https://api.spotware.com/connect/profile?access_token=${accessToken}`);
        return response.json();
    }

    /**
     * Get access token accounts
     */
    public static async getAccessTokenAccounts(accessToken: string): Promise<GenericObject[]> {
        const response = await fetch(`https://api.spotware.com/connect/tradingaccounts?access_token=${accessToken}`);
        const data = await response.json();
        return Array.isArray(data) ? data : [];
    }

    private async connectWebSocket(): Promise<void> {
        // WebSocket connection implementation
        // This would use the CTraderWebSocket class
        console.log(`Connecting to WebSocket at ${this.host}:${this.port}`);
    }

    private async connectTcp(): Promise<void> {
        // TCP connection implementation
        // This would use the existing CTraderSocket class
        console.log(`Connecting to TCP at ${this.host}:${this.port}`);
    }

    private startHeartbeat(): void {
        this.heartbeatTimer = setInterval(() => {
            this.sendHeartbeat();
        }, this.heartbeatInterval);
    }

    private stopHeartbeat(): void {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = undefined;
        }
    }

    /**
     * Get connection status
     */
    public get connectionStatus(): {
        isConnected: boolean;
        useWebSocket: boolean;
        hasValidToken: boolean;
    } {
        return {
            isConnected: this.isConnected,
            useWebSocket: this.useWebSocket,
            hasValidToken: !!this.tokenInfo?.accessToken
        };
    }
}