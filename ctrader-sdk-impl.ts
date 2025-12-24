// ============================================================================
// cTrader OpenAPI TypeScript SDK - Complete Implementation
// ============================================================================
// This is a production-ready SDK for trading with cTrader Open API
// It abstracts Protocol Buffers complexity with intuitive TypeScript APIs

// ============================================================================
// 1. TYPE DEFINITIONS
// ============================================================================

export enum Environment {
  DEMO = 'demo',
  LIVE = 'live'
}

export enum OrderSide {
  BUY = 'BUY',
  SELL = 'SELL'
}

export enum OrderType {
  MARKET = 'MARKET',
  LIMIT = 'LIMIT',
  STOP = 'STOP',
  STOP_LIMIT = 'STOP_LIMIT',
  MARKET_RANGE = 'MARKET_RANGE'
}

export enum Timeframe {
  M1 = 'M1',
  M5 = 'M5',
  M15 = 'M15',
  M30 = 'M30',
  H1 = 'H1',
  H4 = 'H4',
  D1 = 'D1',
  W1 = 'W1',
  MN = 'MN'
}

export interface CTraderConfig {
  clientId: string;
  clientSecret: string;
  environment: Environment;
  host?: string;
  port?: number;
  protocol?: 'websocket' | 'tcp';
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  timeout?: number;
  rateLimit?: {
    realTime: number;
    historical: number;
  };
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface AccountInfo {
  ctidTraderAccountId: number;
  balance: number;
  equity: number;
  unrealizedPnl: number;
  marginLevel: number;
  usedMargin: number;
  availableMargin: number;
  marginRequired: number;
  leverage: number;
  currency: string;
  accountType: string;
  limitedRisk: boolean;
}

export interface TraderProfile {
  ctid: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  country?: string;
}

export interface Symbol {
  symbolId: number;
  name: string;
  displayName: string;
  description: string;
  assetId: number;
  assetClass: string;
  enabled: boolean;
  baseAssetId: number;
  quoteAssetId: number;
  digits: number;
  pipPosition: number;
  minVolume: number;
  maxVolume: number;
  stepVolume: number;
  spreadRaw: number;
  spreadPercentage: number;
  minCommission: number;
  commissionPerLot: number;
  timezone: string;
  sessionStart: number;
  sessionEnd: number;
}

export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Position {
  positionId: number;
  symbol: string;
  symbolId: number;
  volume: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  realizedPnl: number;
  side: OrderSide;
  openTime: Date;
  modifyTime?: Date;
  stopLoss?: number;
  takeProfit?: number;
  trailingStop?: boolean;
  trailingDistance?: number;
  guaranteedStopLoss?: boolean;
}

export interface PendingOrder {
  orderId: number;
  symbol: string;
  symbolId: number;
  volume: number;
  orderPrice: number;
  side: OrderSide;
  orderType: OrderType;
  createTime: Date;
  modifyTime?: Date;
  expirationTime?: Date;
  stopLoss?: number;
  takeProfit?: number;
  label?: string;
  comment?: string;
}

export interface PlaceOrderParams {
  symbol: string;
  symbolId?: number;
  volume: number;
  side: OrderSide;
  orderType?: OrderType;
  stopLoss?: number;
  takeProfit?: number;
  slippage?: number;
  expiration?: Date;
  label?: string;
  comment?: string;
  orderPrice?: number; // For limit/stop orders
}

export interface Deal {
  dealId: number;
  orderId?: number;
  positionId?: number;
  symbol: string;
  symbolId: number;
  volume: number;
  dealPrice: number;
  dealTime: Date;
  side: OrderSide;
  commission: number;
  pnl: number;
  pnlInAccountCurrency: number;
}

export interface Spot {
  symbolId: number;
  symbol: string;
  bid: number;
  ask: number;
  bidVolume: number;
  askVolume: number;
  timestamp: number;
}

export interface DepthQuote {
  symbolId: number;
  symbol: string;
  bids: Array<{ price: number; volume: number }>;
  asks: Array<{ price: number; volume: number }>;
}

export interface MarginCallLevel {
  threshold: number;
  isEnabled: boolean;
}

// ============================================================================
// 2. ERROR CLASSES
// ============================================================================

export class CTraderError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = 'CTraderError';
  }
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends CTraderError {
  constructor(message: string) {
    super('AUTH_ERROR', message);
    this.name = 'AuthenticationError';
  }
}

export class RateLimitError extends CTraderError {
  constructor(message: string) {
    super('RATE_LIMIT', message);
    this.name = 'RateLimitError';
  }
}

// ============================================================================
// 3. RATE LIMITING
// ============================================================================

class RateLimiter {
  private realTimeQueue: Promise<void> = Promise.resolve();
  private historicalQueue: Promise<void> = Promise.resolve();

  constructor(
    private realTimeLimit: number = 50,
    private historicalLimit: number = 5
  ) {}

  async executeRealTime<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.realTimeQueue = this.realTimeQueue.then(async () => {
        const delay = (1000 / this.realTimeLimit);
        const start = Date.now();

        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }

        const elapsed = Date.now() - start;
        await new Promise(r => setTimeout(r, Math.max(0, delay - elapsed)));
      });
    });
  }

  async executeHistorical<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.historicalQueue = this.historicalQueue.then(async () => {
        const delay = (1000 / this.historicalLimit);
        const start = Date.now();

        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }

        const elapsed = Date.now() - start;
        await new Promise(r => setTimeout(r, Math.max(0, delay - elapsed)));
      });
    });
  }
}

// ============================================================================
// 4. MESSAGE HANDLER & PROTOCOL ABSTRACTION
// ============================================================================

interface PendingRequest {
  resolve: (data: any) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}

class MessageHandler {
  private onMessageCallback?: (message: any) => void;
  private sender?: (payload: any) => Promise<any>;

  setOnMessage(callback: (message: any) => void) {
    this.onMessageCallback = callback;
  }

  setSender(fn: (payload: any) => Promise<any>) {
    this.sender = fn;
  }

  async sendMessage(payload: any, timeout: number = 5000): Promise<any> {
    if (!this.sender) throw new NetworkError('No sender configured for MessageHandler');

    const clientMsgId = Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    const payloadWithId = { ...payload, clientMsgId };

    return new Promise((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        reject(new NetworkError(`Request timeout after ${timeout}ms`));
      }, timeout);

      // Send via the configured sender which should return a Promise resolving to the response
      this.sender!(payloadWithId).then((response) => {
        clearTimeout(timeoutHandle);
        // The server can return error payloads using `errorCode`/`description` (or `error`).
        if (response && (response.error || response.errorCode || response.description)) {
          const code = response.errorCode || response.error || 'UNKNOWN';
          const message = response.description ?? response.error ?? JSON.stringify(response);
          reject(new CTraderError(String(code), String(message)));
        } else {
          resolve(response);
        }
      }).catch((err) => {
        clearTimeout(timeoutHandle);
        // If the sender rejected with a structured CTraderError, forward it
        if (err instanceof CTraderError) return reject(err);
        // If the sender rejected with a server error payload, convert it to CTraderError
        if (err && (err.errorCode || err.error || err.description)) {
          const code = err.errorCode || err.error || 'UNKNOWN';
          const message = err.description ?? err.error ?? JSON.stringify(err);
          return reject(new CTraderError(String(code), String(message)));
        }
        reject(new NetworkError(String(err)));
      });
    });
  }

  handleIncomingMessage(message: any) {
    if (this.onMessageCallback) {
      this.onMessageCallback(message);
    }
    // Push messages are handled via `setOnMessage` and the CTraderConnection listeners that emit events
  }
}

// ============================================================================
// 5. MAIN CLIENT CLASS
// ============================================================================

export class CTraderClient {
  private config: Required<CTraderConfig>;
  private ws?: WebSocket;
  private connection?: any; // instance of src/core/CTraderConnection
  private messageHandler = new MessageHandler();
  private rateLimiter: RateLimiter;
  private reconnectAttempts = 0;
  private currentAccountId?: number;
  private connectionPromise?: Promise<void>;

  // Symbol cache (short TTL to avoid repeated requests)
  private symbolCache?: { ts: number; symbols: Symbol[] };

  // Cache latest spot events by symbolId so callers can read immediately after subscribing
  private lastSpotBySymbol = new Map<number, Spot>();

  // Event handlers
  private eventHandlers = new Map<string, Set<Function>>();

  constructor(config: CTraderConfig) {
    this.config = {
      protocol: 'websocket',
      port: config.protocol === 'tcp' ? 5036 : 5035,
      host: config.environment === 'live'
        ? 'live.ctraderapi.com'
        : 'demo.ctraderapi.com',
      autoReconnect: true,
      maxReconnectAttempts: 5,
      reconnectDelay: 1000,
      timeout: 5000,
      rateLimit: {
        realTime: 50,
        historical: 5
      },
      ...config
    };

    this.rateLimiter = new RateLimiter(
      this.config.rateLimit.realTime,
      this.config.rateLimit.historical
    );

    this.setupMessageHandling();
  }

  private setupMessageHandling() {
    // Raw message hook for consumers
    this.messageHandler.setOnMessage((message) => {
      this.emit('raw-message', message);
    });

    // Default sender until a connection is established
    this.messageHandler.setSender(async (payload: any) => {
      throw new NetworkError('Not connected');
    });
  }

  // ========================================================================
  // CONNECTION & AUTHENTICATION
  // ========================================================================

  async connect(): Promise<void> {
    if (this.connectionPromise) return this.connectionPromise;

    this.connectionPromise = this.doConnect();
    return this.connectionPromise;
  }

  private async doConnect(): Promise<void> {
    try {
      // Use the protobuf-capable connection implementation
      this.connection = new (require('./src/core/CTraderConnection').CTraderConnection)({ host: this.config.host, port: this.config.port });

      // Map a set of well-known push events from payload type -> friendly event name
      const mappings: Array<{ names: string[]; event: string; fieldName?: string }> = [
        { names: ['ProtoOASpotEvent'], event: 'spot', fieldName: 'spotEvent' },
        { names: ['ProtoOAExecutionEvent'], event: 'execution', fieldName: 'executionEvent' },
        { names: ['ProtoOAOrderError'], event: 'order-error', fieldName: 'orderError' },
        { names: ['ProtoOAMarginChangedEvent'], event: 'margin-changed', fieldName: 'marginChanged' },
        { names: ['ProtoOATrailingSLChangedEvent'], event: 'trailing-sl-changed', fieldName: 'trailingSLChanged' },
        { names: ['ProtoOADepthEvent'], event: 'depth', fieldName: 'depthEvent' },
        { names: ['ProtoOASymbolChangedEvent'], event: 'symbol-changed', fieldName: 'symbolChanged' },
        { names: ['ProtoOATraderUpdatedEvent'], event: 'trader-updated', fieldName: 'traderUpdated' },
        { names: ['ProtoOAMarginCallTriggeredEvent'], event: 'margin-call', fieldName: 'marginCallTriggered' }
      ];

      for (const mapEntry of mappings) {
        for (const name of mapEntry.names) {
          try {
            const pt = this.connection.getPayloadTypeByName(name);
            this.connection.on(pt.toString(), (payload: any) => {
              // Normalize certain push events for DX (avoid Long/NaN issues)
              let emitted = payload;

              if (mapEntry.event === 'spot') {
                emitted = {
                  symbolId: toNumber(payload.symbolId),
                  symbol: payload.symbol || payload.name || payload.displayName || payload.instrumentName,
                  bid: normalizePrice(payload.bid),
                  ask: normalizePrice(payload.ask),
                  bidVolume: toNumber(payload.bidVolume),
                  askVolume: toNumber(payload.askVolume),
                  timestamp: toNumber(payload.timestamp) || Date.now()
                };
              }

              this.emit(mapEntry.event, emitted);

              // Cache last spot per symbolId for immediate reads
              if (mapEntry.event === 'spot' && typeof emitted?.symbolId === 'number') {
                try { this.lastSpotBySymbol.set(emitted.symbolId, emitted); } catch (e) {}
              }

              // Mirror old raw message shape for backwards compatibility
              const raw: any = {};
              if (mapEntry.fieldName) raw[mapEntry.fieldName] = payload;
              this.emit('raw-message', raw);
            });
            break;
          } catch (e) {
            // Try next candidate name
          }
        }
      }

      // Bind sender to use the connection's sendCommand (returns decoded payload)
      this.messageHandler.setSender(async (payload: any) => {
        if (!this.connection) throw new NetworkError('Not connected');
        const { type, clientMsgId, ...data } = payload;
        // sendCommand will encode/decode protobufs and return the response payload
        const response = await this.connection.sendCommand(type, data);
        return response;
      });

      await this.connection.open();

      this.reconnectAttempts = 0;
      this.emit('connected');
    } catch (error) {
      this.emit('error', error instanceof Error ? error : new NetworkError(String(error)));
      // Propagate error for connect() callers
      throw error;
    }
  }

  private handleDisconnection() {
    if (this.config.autoReconnect && this.reconnectAttempts < this.config.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

      setTimeout(() => {
        this.connectionPromise = undefined;
        this.connect().catch(err => this.emit('reconnect-failed', err));
      }, delay);
    }
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      try {
        // Call close if available on the underlying connection (best-effort)
        if (typeof (this.connection as any).close === 'function') {
          await (this.connection as any).close();
        }
      } catch (_) {
        // ignore
      }
      this.connection = undefined;
    }

    if (this.ws) {
      try { this.ws.close(); } catch (_) {}
      this.ws = undefined;
    }

    this.currentAccountId = undefined;
    this.connectionPromise = undefined;
  }

  async applicationAuth(): Promise<AuthTokens> {
    return this.rateLimiter.executeRealTime(async () => {
      const response = await this.messageHandler.sendMessage({
        type: 'ProtoOAApplicationAuthReq',
        clientId: this.config.clientId,
        clientSecret: this.config.clientSecret
      }, this.config.timeout);

      if (response.error) {
        throw new AuthenticationError(response.error);
      }

      return {
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        expiresIn: response.expiresIn,
        tokenType: response.tokenType
      };
    });
  }

  async accountAuth(ctidTraderAccountId: number, accessToken: string): Promise<void> {
    return this.rateLimiter.executeRealTime(async () => {
      const response = await this.messageHandler.sendMessage({
        type: 'ProtoOAAccountAuthReq',
        ctidTraderAccountId,
        accessToken
      }, this.config.timeout);

      if (response.error) {
        throw new AuthenticationError(response.error);
      }

      this.currentAccountId = ctidTraderAccountId;
    });
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    return this.rateLimiter.executeRealTime(async () => {
      const response = await this.messageHandler.sendMessage({
        type: 'ProtoOARefreshTokenReq',
        refreshToken
      }, this.config.timeout);

      if (response.error) {
        throw new AuthenticationError(response.error);
      }

      return {
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        expiresIn: response.expiresIn,
        tokenType: response.tokenType
      };
    });
  }

  async getAccountsByToken(accessToken: string): Promise<AccountInfo[]> {
    return this.rateLimiter.executeRealTime(async () => {
      const response = await this.messageHandler.sendMessage({
        type: 'ProtoOAGetAccountListByAccessTokenReq',
        accessToken
      }, this.config.timeout);

      // The server returns `ctidTraderAccount` array in the response
      return response.ctidTraderAccount || [];
    });
  }

  async getVersion(): Promise<{ apiVersion: string; build: number }> {
    return this.rateLimiter.executeRealTime(async () => {
      const response = await this.messageHandler.sendMessage({
        type: 'ProtoOAVersionReq'
      }, this.config.timeout);

      return {
        apiVersion: response.apiVersion,
        build: response.build
      };
    });
  }

  // New in v91: PnL change subscription
  async subscribeToPnLChange(): Promise<void> {
    return this.rateLimiter.executeRealTime(async () => {
      const response = await this.messageHandler.sendMessage({
        type: 'ProtoOAv1PnLChangeSubscribeReq',
        ctidTraderAccountId: this.currentAccountId
      }, this.config.timeout);
      if (response.error) throw new CTraderError('PNL_SUBSCRIBE_ERROR', response.error);
    });
  }

  async unsubscribeFromPnLChange(): Promise<void> {
    return this.rateLimiter.executeRealTime(async () => {
      const response = await this.messageHandler.sendMessage({
        type: 'ProtoOAv1PnLChangeUnSubscribeReq',
        ctidTraderAccountId: this.currentAccountId
      }, this.config.timeout);
      if (response.error) throw new CTraderError('PNL_UNSUBSCRIBE_ERROR', response.error);
    });
  }

  // ========================================================================
  // ACCOUNT MANAGEMENT
  // ========================================================================

  async getAccountInfo(): Promise<AccountInfo> {
    return this.rateLimiter.executeRealTime(async () => {
      this.ensureAuthenticated();

      const response = await this.messageHandler.sendMessage({
        type: 'ProtoOATraderReq',
        ctidTraderAccountId: this.currentAccountId
      }, this.config.timeout);

      if (process.env.CTRADER_DEBUG) {
        try {
          console.log('[DEBUG] getAccountInfo raw response:', JSON.stringify(response, Object.getOwnPropertyNames(response), 2));
        } catch (e) {
          console.log('[DEBUG] getAccountInfo raw response (inspect):', response);
        }
      }

      // Some cTrader responses nest account values under `trader` (ProtoOATraderRes).
      const t: any = response.trader ?? response;
      const moneyDigits = toNumber(t.moneyDigits ?? 2);

      return {
        ctidTraderAccountId: toNumber(response.ctidTraderAccountId),
        balance: normalizeMoney(t.balance ?? t.availableBalance ?? 0, moneyDigits),
        equity: normalizeMoney(t.equity ?? 0, moneyDigits),
        unrealizedPnl: normalizeMoney(t.unrealizedPnl ?? 0, moneyDigits),
        marginLevel: toNumber(t.marginLevel ?? response.marginLevel),
        usedMargin: normalizeMoney(t.usedMargin ?? 0, moneyDigits),
        availableMargin: normalizeMoney(t.availableMargin ?? 0, moneyDigits),
        marginRequired: normalizeMoney(t.marginRequired ?? 0, moneyDigits),
        leverage: t.leverageInCents ? toNumber(t.leverageInCents) / 100 : toNumber(t.leverage),
        currency: t.currency ?? response.currency,
        accountType: typeof t.accountType === 'string' ? t.accountType : (t.accountType ? String(t.accountType) : response.accountType),
        limitedRisk: Boolean(t.isLimitedRisk ?? t.limitedRisk ?? response.limitedRisk)
      }; 
    });
  }

  async getCtidProfile(): Promise<TraderProfile> {
    return this.rateLimiter.executeRealTime(async () => {
      this.ensureAuthenticated();

      const response = await this.messageHandler.sendMessage({
        type: 'ProtoOAGetCtidProfileReq',
        ctidTraderAccountId: this.currentAccountId
      }, this.config.timeout);

      return {
        ctid: response.ctid,
        firstName: response.firstName,
        lastName: response.lastName,
        email: response.email,
        phone: response.phone,
        country: response.country
      };
    });
  }

  async getPositionUnrealizedPnl(): Promise<number> {
    return this.rateLimiter.executeRealTime(async () => {
      const response = await this.messageHandler.sendMessage({
        type: 'ProtoOAGetPositionUnrealizedPnLReq',
        ctidTraderAccountId: this.currentAccountId
      }, this.config.timeout);

      return normalizePrice(response.unrealizedPnl);
    });
  }

  async getExpectedMargin(symbol: string, volume: number): Promise<number> {
    return this.rateLimiter.executeRealTime(async () => {
      const response = await this.messageHandler.sendMessage({
        type: 'ProtoOAExpectedMarginReq',
        ctidTraderAccountId: this.currentAccountId,
        symbol,
        volume: normalizeVolume(volume)
      }, this.config.timeout);

      return normalizePrice(response.margin);
    });
  }

  async getDynamicLeverage(symbolId: number): Promise<any> {
    return this.rateLimiter.executeRealTime(async () => {
      const response = await this.messageHandler.sendMessage({
        type: 'ProtoOAGetDynamicLeverageReq',
        ctidTraderAccountId: this.currentAccountId,
        symbolId
      }, this.config.timeout);

      return response;
    });
  }

  // ========================================================================
  // MARKET DATA & SYMBOLS
  // ========================================================================

  async getAllSymbols(forceRefresh: boolean = false): Promise<Symbol[]> {
    return this.rateLimiter.executeHistorical(async () => {
      this.ensureAuthenticated();

      const now = Date.now();
      if (!forceRefresh && this.symbolCache && (now - this.symbolCache.ts) < 60_000) {
        return this.symbolCache.symbols;
      }

      const response = await this.messageHandler.sendMessage({
        type: 'ProtoOASymbolsListReq',
        ctidTraderAccountId: this.currentAccountId,
        includeArchivedSymbols: false
      }, this.config.timeout);

      const symbols = response.symbol || response.symbols || [];
      // Cache for a short while
      this.symbolCache = { ts: now, symbols };
      return symbols;
    });
  }

  async getSymbolDetails(symbolId: number): Promise<Symbol> {
    return this.rateLimiter.executeHistorical(async () => {
      const response = await this.messageHandler.sendMessage({
        type: 'ProtoOASymbolByIdReq',
        symbolId
      }, this.config.timeout);

      return response;
    });
  }

  async getAssets(): Promise<any[]> {
    return this.rateLimiter.executeHistorical(async () => {
      const response = await this.messageHandler.sendMessage({
        type: 'ProtoOAAssetsListReq'
      }, this.config.timeout);

      return response.assets || [];
    });
  }

  async getAssetClasses(): Promise<any[]> {
    return this.rateLimiter.executeHistorical(async () => {
      const response = await this.messageHandler.sendMessage({
        type: 'ProtoOAAssetClassListReq'
      }, this.config.timeout);

      return response.assetClasses || [];
    });
  }

  async getSymbolCategories(): Promise<any[]> {
    return this.rateLimiter.executeHistorical(async () => {
      const response = await this.messageHandler.sendMessage({
        type: 'ProtoOASymbolCategoryReq'
      }, this.config.timeout);

      return response.symbolCategories || [];
    });
  }

  // Helper: normalize a symbol string (remove separators, trailing single-letter forward marker, numeric suffixes)
  private normalizeSymbolString(s: string): string {
    if (!s) return '';
    let t = String(s).toUpperCase().trim();
    // Remove common separators
    t = t.replace(/[\s\/\._-]+/g, '');
    // If symbol ends with a trailing 'F' (forward) remove it (XAUUSD-F -> XAUUSD)
    if (/F$/.test(t)) t = t.replace(/F$/, '');
    // Remove short numeric suffixes that are often contract markers (-24, -12)
    t = t.replace(/\d{1,2}$/, '');
    // Strip any remaining non-alphanumeric
    t = t.replace(/[^A-Z0-9]/g, '');
    return t;
  }

  // Helper: build normalized forms for a proto symbol entry
  private buildSymbolNormals(sym: any) {
    const rawName = String(sym.symbolName ?? sym.name ?? sym.displayName ?? '');
    const desc = String(sym.description ?? '');
    return {
      nameRaw: rawName,
      descRaw: desc,
      nameNorm: this.normalizeSymbolString(rawName),
      descNorm: this.normalizeSymbolString(desc),
      combinedNorm: this.normalizeSymbolString(rawName + desc)
    };
  }

  // Lightweight Levenshtein distance (small inputs; used sparingly)
  private levenshtein(a: string, b: string): number {
    if (!a || !b) return Math.max(a?.length || 0, b?.length || 0);
    const m = a.length, n = b.length;
    const dp: number[] = Array(n + 1).fill(0).map((_, j) => j);
    for (let i = 1; i <= m; i++) {
      let prev = dp[0];
      dp[0] = i;
      for (let j = 1; j <= n; j++) {
        const cur = dp[j];
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + cost);
        prev = cur;
      }
    }
    return dp[n];
  }

  // Map of common currency codes to name synonyms (used to match descriptions)
  private currencyNameMap: Record<string, string[]> = {
    USD: ['US DOLLAR', 'USD', 'DOLLAR', 'AMERICAN DOLLAR'],
    EUR: ['EURO', 'EUR', 'EUROPEAN CURRENCY'],
    GBP: ['BRITISH POUND', 'POUND', 'GBP', 'STERLING'],
    JPY: ['JAPANESE YEN', 'YEN', 'JPY'],
    AUD: ['AUSTRALIAN DOLLAR', 'AUD'],
    CAD: ['CANADIAN DOLLAR', 'CAD'],
    CHF: ['SWISS FRANC', 'CHF', 'FRANC'],
    NZD: ['NEW ZEALAND DOLLAR', 'NZD'],
    MXN: ['MEXICAN PESO', 'MXN', 'PESO'],
    ZAR: ['SOUTH AFRICAN RAND', 'ZAR', 'RAND'],
    CNY: ['CHINESE YUAN', 'RENMINBI', 'RMB', 'CNY', 'YUAN'],
    CNH: ['CHINESE YUAN', 'CNH', 'RMB', 'YUAN'],
    SEK: ['SWEDISH KRONA', 'SEK', 'KRONA'],
    NOK: ['NORWEGIAN KRONE', 'NOK', 'KRONE'],
    DKK: ['DANISH KRONE', 'DKK', 'KRONE'],
    PLN: ['POLISH ZLOTY', 'PLN', 'ZLOTY'],
    SGD: ['SINGAPORE DOLLAR', 'SGD'],
    HKD: ['HONG KONG DOLLAR', 'HKD'],
    RUB: ['RUSSIAN RUBLE', 'RUBLE', 'RUB'],
    BRL: ['BRAZILIAN REAL', 'REAL', 'BRL'],
    TRY: ['TURKISH LIRA', 'LIRA', 'TRY'],
    INR: ['INDIAN RUPEE', 'RUPEE', 'INR']
  };

  private matchByDescriptionTokens(lookupNorm: string, list: any[]): any | null {
    if (!lookupNorm) return null;
    // Find which currency codes or their synonyms appear inside the lookup string
    const codesFound: string[] = [];
    const keyList = Object.keys(this.currencyNameMap);
    for (const c of keyList) {
      const synonyms = this.currencyNameMap[c] || [];
      const synNorms = synonyms.map((s) => this.normalizeSymbolString(s));
      const has = lookupNorm.includes(c) || synNorms.some(sn => lookupNorm.includes(sn));
      if (has) codesFound.push(c);
    }

    // Need at least two currency codes (FX pair) to use description matching
    if (codesFound.length < 2) return null;

    // Attempt pairs (base,quote) and reversed
    for (let i = 0; i < codesFound.length; i++) {
      for (let j = 0; j < codesFound.length; j++) {
        if (i === j) continue;
        const base = codesFound[i];
        const quote = codesFound[j];

        // For each symbol, check description contains synonyms for both currencies (order-agnostic)
        const found = list.find((sym: any) => {
          const desc = String(sym.description ?? sym.name ?? '').toUpperCase();
          const baseOk = this.currencyNameMap[base].some(s => desc.includes(s));
          const quoteOk = this.currencyNameMap[quote].some(s => desc.includes(s));
          return baseOk && quoteOk;
        });

        if (found) return found;
      }
    }

    return null;
  }

  private async strictResolveSymbolId(input: string): Promise<number> {
    const name = String(input || '').trim();
    const lookupNorm = this.normalizeSymbolString(name);

    const list = await this.getAllSymbols();

    // 1) Exact normalized symbol name
    let matched = list.find((sym: any) => this.buildSymbolNormals(sym).nameNorm === lookupNorm);

    // 2) Exact normalized description
    if (!matched) matched = list.find((sym: any) => this.buildSymbolNormals(sym).descNorm === lookupNorm);

    // 3) Combined name+desc contains the lookup
    if (!matched) matched = list.find((sym: any) => this.buildSymbolNormals(sym).combinedNorm.includes(lookupNorm));

    // 4) Description-based currency token matching
    if (!matched) {
      const descMatch = this.matchByDescriptionTokens(lookupNorm, list);
      if (descMatch) matched = descMatch;
    }

    if (matched) return toNumber((matched as any).symbolId);

    // If still no match, throw with candidates
    const nameNorm = lookupNorm;
    const candidates = list
      .map((s: any) => ({
        id: toNumber(s.symbolId),
        label: String(s.symbolName ?? s.name ?? s.displayName ?? s.description ?? '').trim(),
        norm: this.normalizeSymbolString(String(s.symbolName ?? s.name ?? s.displayName ?? s.description ?? ''))
      }))
      .map((c: any) => ({ ...c, dist: this.levenshtein(c.norm, nameNorm) }))
      .sort((a: any, b: any) => a.dist - b.dist)
      .slice(0, 5)
      .map((c: any) => `${c.label} (id ${c.id})`);

    const suggestion = candidates.length ? `; candidates: ${candidates.join(', ')}` : '';
    throw new CTraderError('SYMBOL_NOT_FOUND', `Symbol not found: ${name}${suggestion}`);
  }

  private async resolveSymbolIds(inputs: Array<string | number>): Promise<number[]> {
    // Normalize inputs
    const wants: Array<string | number> = (inputs || []).map((s) => (typeof s === 'string' ? s.trim() : s));
    const ids: number[] = [];
    const unresolved: string[] = [];

    // First pass: direct numbers
    for (const s of wants) {
      if (typeof s === 'number' && Number.isFinite(s)) {
        ids.push(s);
      } else if (typeof s === 'string' && /^[0-9]+$/.test(s)) {
        ids.push(Number(s));
      } else if (typeof s === 'string') {
        unresolved.push(s);
      }
    }

    if (unresolved.length === 0) return ids;

    // Fetch symbol list (cached)
    const list = await this.getAllSymbols();

    for (const name of unresolved) {
      const lookupNorm = this.normalizeSymbolString(name);
      let matched: any = null;

      // 1) Exact normalized symbol name
      matched = list.find((sym: any) => this.buildSymbolNormals(sym).nameNorm === lookupNorm);

      // 2) Exact normalized description
      if (!matched) matched = list.find((sym: any) => this.buildSymbolNormals(sym).descNorm === lookupNorm);

      // 3) Combined name+desc contains the lookup
      if (!matched) matched = list.find((sym: any) => this.buildSymbolNormals(sym).combinedNorm.includes(lookupNorm));

          // 4) Try matching by description tokens (currency names)
      if (!matched) {
        const descMatch = this.matchByDescriptionTokens(lookupNorm, list);
        if (descMatch) matched = descMatch;
      }

      // 5) Fallback: relaxed substring match on raw uppercase text
      if (!matched) {
        const rawLookup = String(name).toUpperCase().replace(/[^A-Z0-9]/g, '');
        matched = list.find((sym: any) => {
          const rawName = String(sym.symbolName ?? sym.name ?? sym.displayName ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
          const desc = String(sym.description ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
          return rawName.includes(rawLookup) || desc.includes(rawLookup) || (rawName + desc).includes(rawLookup);
        });
      }

      // 6) Tiny fuzzy fallback: allow distance 1 (to catch small typos)
      if (!matched) {
        matched = list.find((sym: any) => {
          const n = this.buildSymbolNormals(sym).nameNorm;
          return n && this.levenshtein(n, lookupNorm) <= 1;
        });
      }

      if (matched) {
        if (process.env.CTRADER_DEBUG) console.log(`[DEBUG] resolveSymbolIds matched ${name} -> ${String(matched.symbolName ?? matched.name ?? matched.displayName ?? matched.description ?? '')} (id: ${toNumber(matched.symbolId)})`);
        ids.push(toNumber((matched as any).symbolId));
      } else {
        // Build helpful suggestions for operator
        const nameNorm = this.normalizeSymbolString(String(name));
        const candidates = list
          .map((s: any) => ({
            id: toNumber(s.symbolId),
            label: String(s.symbolName ?? s.name ?? s.displayName ?? s.description ?? '').trim(),
            norm: this.normalizeSymbolString(String(s.symbolName ?? s.name ?? s.displayName ?? s.description ?? ''))
          }))
          .map((c: any) => ({ ...c, dist: this.levenshtein(c.norm, nameNorm) }))
          .sort((a: any, b: any) => a.dist - b.dist)
          .slice(0, 5)
          .map((c: any) => `${c.label} (id ${c.id})`);

        if (process.env.CTRADER_DEBUG) console.log(`[DEBUG] resolveSymbolIds failed for ${name}; closest: ${candidates.join(', ')}`);

        const suggestion = candidates.length ? `; candidates: ${candidates.join(', ')}` : '';
        throw new CTraderError('SYMBOL_NOT_FOUND', `Symbol not found: ${name}${suggestion}`);
      }
    }

    return ids;
  }

  /**
   * Public helper: return symbolId for a given symbol name or undefined
   */
  async getSymbolIdByName(name: string): Promise<number | undefined> {
    const ids = await this.resolveSymbolIds([name]);
    return ids[0];
  }

  async subscribeToSymbols(symbols: Array<string | number>, maxRetries: number = 3): Promise<number[]> {
    return this.rateLimiter.executeRealTime(async () => {
      this.ensureAuthenticated();

      const symbolIds = await this.resolveSymbolIds(symbols);

      if (!symbolIds || symbolIds.length === 0) throw new CTraderError('SUBSCRIBE_ERROR', 'No symbols could be resolved to ids');

      let attempt = 0;
      while (true) {
        try {
          const response = await this.messageHandler.sendMessage({
            type: 'ProtoOASubscribeSpotsReq',
            ctidTraderAccountId: this.currentAccountId,
            symbolId: symbolIds,
            subscribeToSpotTimestamp: true
          }, this.config.timeout);

          if (response.error) throw new CTraderError('SUBSCRIBE_ERROR', response.error);
          return symbolIds;
        } catch (err: any) {
          attempt++;
          // Do not retry authorization errors
          if (err instanceof CTraderError && err.code === 'INVALID_REQUEST' && /authorized/i.test(err.message)) {
            throw err;
          }

          if (attempt >= maxRetries) {
            throw err;
          }

          // Retry on transient error or empty-symbols message
          if (err instanceof CTraderError && /empty symbols list/i.test(String(err.message))) {
            const delay = 200 * Math.pow(2, attempt - 1);
            await new Promise((r) => setTimeout(r, delay));
            continue;
          }

          // For any other error, don't suppress yet, but retry after short backoff once
          const delay = 100 * Math.pow(2, attempt - 1);
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    });
  }

  async unsubscribeFromSymbols(symbols: Array<string | number>, maxRetries: number = 3): Promise<void> {
    return this.rateLimiter.executeRealTime(async () => {
      this.ensureAuthenticated();

      const symbolIds = await this.resolveSymbolIds(symbols);

      if (!symbolIds || symbolIds.length === 0) throw new CTraderError('UNSUBSCRIBE_ERROR', 'No symbols could be resolved to ids');

      let attempt = 0;
      while (true) {
        try {
          const response = await this.messageHandler.sendMessage({
            type: 'ProtoOAUnsubscribeSpotsReq',
            ctidTraderAccountId: this.currentAccountId,
            symbolId: symbolIds
          }, this.config.timeout);

          if (response.error) throw new CTraderError('UNSUBSCRIBE_ERROR', response.error);
          return;
        } catch (err: any) {
          attempt++;
          if (attempt >= maxRetries) throw err;
          await new Promise((r) => setTimeout(r, 100 * Math.pow(2, attempt - 1)));
        }
      }
    });
  }

  async getCurrentPrice(symbol: string): Promise<Spot> {
    return this.rateLimiter.executeRealTime(async () => {
      // Must be authenticated to subscribe to spot events
      this.ensureAuthenticated();

      const timeoutMs = this.config.timeout;

      return new Promise<Spot>(async (resolve, reject) => {
        let settled = false;

        let handler: any = null;

        let timer: NodeJS.Timeout | null = null;
        const cleanup = async () => {
          try { if (handler) this.off('spot', handler); } catch (e) {}
          try { await this.unsubscribeFromSymbols([symbol]); } catch (e) {}
          if (timer) clearTimeout(timer);
        };

        // Resolve name to symbolId for matching server events (strict match to avoid false positives)
        let resolvedId: number | null = null;
        try {
          const id = await this.strictResolveSymbolId(symbol);
          resolvedId = id;
        } catch (e: any) {
          // If the symbol cannot be resolved strictly, surface the error immediately instead of attempting a blind subscribe
          if (e instanceof CTraderError && e.code === 'SYMBOL_NOT_FOUND') {
            settled = true;
            cleanup();
            reject(e);
            return;
          }
          resolvedId = null;
        }

        // (Try subscribe; this may reject if account not authorized)
        try {
          const ids = await this.subscribeToSymbols([symbol]);
          const sid = ids && ids.length ? ids[0] : null;

          // If we already have a cached spot for this symbolId (the server may have pushed it while subscribing), return it immediately
          if (sid !== null) {
            const last = this.lastSpotBySymbol.get(sid);
            if (last && !settled) {
              settled = true;
              cleanup();
              return resolve(last);
            }
          }

          // Listen for spot events after we've subscribed & checked recent cache
          handler = (s: any) => {
            if (process.env.CTRADER_DEBUG) console.log('[DEBUG] getCurrentPrice handler saw spot:', s);
            const sidNow = toNumber(s?.symbolId, NaN);
            const matches = sid !== null ? (sidNow === sid) : (String(s?.symbol || '').toUpperCase() === String(symbol).toUpperCase());

            if (matches && !settled) {
              if (process.env.CTRADER_DEBUG) console.log('[DEBUG] getCurrentPrice matched spot for', symbol, 'sid', sid, 'sidNow', sidNow);
              settled = true;
              cleanup();
              resolve({
                symbolId: toNumber(s.symbolId),
                symbol: s.symbol || undefined,
                bid: normalizePrice(s.bid),
                ask: normalizePrice(s.ask),
                bidVolume: toNumber(s.bidVolume),
                askVolume: toNumber(s.askVolume),
                timestamp: toNumber(s.timestamp) || Date.now()
              });
            }
          };

          this.on('spot', handler);

          // Start timeout AFTER we've subscribed and attached the handler so we wait a full timeoutMs for the first push
          timer = setTimeout(() => {
            if (!settled) {
              settled = true;
              cleanup();
              reject(new NetworkError(`Timeout waiting for spot for ${symbol}`));
            }
          }, timeoutMs);
        } catch (err) {
          if (!settled) {
            settled = true;
            cleanup();
            reject(err);
          }
        }
      });
    });
  }

  async subscribeToDepthQuotes(symbol: string): Promise<void> {
    return this.rateLimiter.executeRealTime(async () => {
      const response = await this.messageHandler.sendMessage({
        type: 'ProtoOASubscribeDepthQuotesReq',
        ctidTraderAccountId: this.currentAccountId,
        symbol
      }, this.config.timeout);

      if (response.error) throw new CTraderError('DEPTH_SUBSCRIBE_ERROR', response.error);
    });
  }

  async unsubscribeFromDepthQuotes(symbol: string): Promise<void> {
    return this.rateLimiter.executeRealTime(async () => {
      const response = await this.messageHandler.sendMessage({
        type: 'ProtoOAUnsubscribeDepthQuotesReq',
        ctidTraderAccountId: this.currentAccountId,
        symbol
      }, this.config.timeout);

      if (response.error) throw new CTraderError('DEPTH_UNSUBSCRIBE_ERROR', response.error);
    });
  }

  // ========================================================================
  // HISTORICAL DATA
  // ========================================================================

  async getCandles(params: {
    symbol: string;
    timeframe: Timeframe;
    count: number;
    fromTimestamp?: number;
  }): Promise<Candle[]> {
    return this.rateLimiter.executeHistorical(async () => {
      const response = await this.messageHandler.sendMessage({
        type: 'ProtoOATrendbarsReq',
        ctidTraderAccountId: this.currentAccountId,
        symbol: params.symbol,
        timeframe: params.timeframe,
        count: params.count,
        fromTimestamp: params.fromTimestamp
      }, this.config.timeout);

      return (response.trendbar || []).map((bar: any) => ({
        timestamp: bar.utcTimestampInMinutes * 60000,
        open: normalizePrice(bar.open),
        high: normalizePrice(bar.high),
        low: normalizePrice(bar.low),
        close: normalizePrice(bar.close),
        volume: normalizeVolume(bar.volume)
      }));
    });
  }

  async getCandlesByDate(params: {
    symbol: string;
    timeframe: Timeframe;
    fromDate: Date;
    toDate: Date;
    maxCandles?: number;
  }): Promise<Candle[]> {
    return this.rateLimiter.executeHistorical(async () => {
      const fromTimestamp = params.fromDate.getTime() / 60000; // Convert to minutes
      const toTimestamp = params.toDate.getTime() / 60000;

      const response = await this.messageHandler.sendMessage({
        type: 'ProtoOATrendbarsReq',
        ctidTraderAccountId: this.currentAccountId,
        symbol: params.symbol,
        timeframe: params.timeframe,
        fromTimestamp,
        toTimestamp,
        count: params.maxCandles || 1000
      }, this.config.timeout);

      return (response.trendbar || []).map((bar: any) => ({
        timestamp: bar.utcTimestampInMinutes * 60000,
        open: normalizePrice(bar.open),
        high: normalizePrice(bar.high),
        low: normalizePrice(bar.low),
        close: normalizePrice(bar.close),
        volume: normalizeVolume(bar.volume)
      }));
    });
  }

  async getTickData(params: {
    symbol: string;
    fromTimestamp?: number;
    count?: number;
  }): Promise<any[]> {
    return this.rateLimiter.executeHistorical(async () => {
      const response = await this.messageHandler.sendMessage({
        type: 'ProtoOATickDataReq',
        ctidTraderAccountId: this.currentAccountId,
        symbol: params.symbol,
        fromTimestamp: params.fromTimestamp,
        count: params.count || 1000
      }, this.config.timeout);

      return response.tickData || [];
    });
  }

  async subscribeLiveTrendbars(symbol: string, timeframe: Timeframe): Promise<void> {
    return this.rateLimiter.executeRealTime(async () => {
      const response = await this.messageHandler.sendMessage({
        type: 'ProtoOASubscribeLiveTrendbarReq',
        ctidTraderAccountId: this.currentAccountId,
        symbol,
        timeframe
      }, this.config.timeout);

      if (response.error) throw new CTraderError('TRENDBAR_SUBSCRIBE_ERROR', response.error);
    });
  }

  async unsubscribeLiveTrendbars(symbol: string, timeframe: Timeframe): Promise<void> {
    return this.rateLimiter.executeRealTime(async () => {
      const response = await this.messageHandler.sendMessage({
        type: 'ProtoOAUnsubscribeLiveTrendbarReq',
        ctidTraderAccountId: this.currentAccountId,
        symbol,
        timeframe
      }, this.config.timeout);

      if (response.error) throw new CTraderError('TRENDBAR_UNSUBSCRIBE_ERROR', response.error);
    });
  }

  // ========================================================================
  // ORDER EXECUTION
  // ========================================================================

  async placeMarketOrder(params: PlaceOrderParams): Promise<any> {
    return this.rateLimiter.executeRealTime(async () => {
      validateOrderParams(params);

      const response = await this.messageHandler.sendMessage({
        type: 'ProtoOANewOrderReq',
        ctidTraderAccountId: this.currentAccountId,
        symbol: params.symbol,
        volume: normalizeVolume(params.volume),
        side: params.side,
        orderType: OrderType.MARKET,
        stopLoss: params.stopLoss ? normalizePrice(params.stopLoss) : undefined,
        takeProfit: params.takeProfit ? normalizePrice(params.takeProfit) : undefined,
        slippage: params.slippage || 10,
        label: params.label,
        comment: params.comment
      }, this.config.timeout);

      if (response.error) {
        throw new CTraderError('ORDER_ERROR', response.error);
      }

      return response;
    });
  }

  async placeLimitOrder(params: PlaceOrderParams): Promise<any> {
    return this.rateLimiter.executeRealTime(async () => {
      if (!params.orderPrice) throw new ValidationError('orderPrice required for limit orders');

      const response = await this.messageHandler.sendMessage({
        type: 'ProtoOANewOrderReq',
        ctidTraderAccountId: this.currentAccountId,
        symbol: params.symbol,
        volume: normalizeVolume(params.volume),
        side: params.side,
        orderType: OrderType.LIMIT,
        orderPrice: normalizePrice(params.orderPrice),
        stopLoss: params.stopLoss ? normalizePrice(params.stopLoss) : undefined,
        takeProfit: params.takeProfit ? normalizePrice(params.takeProfit) : undefined,
        label: params.label,
        comment: params.comment,
        expirationTime: params.expiration?.getTime()
      }, this.config.timeout);

      if (response.error) throw new CTraderError('ORDER_ERROR', response.error);
      return response;
    });
  }

  async placeStopOrder(params: PlaceOrderParams): Promise<any> {
    return this.rateLimiter.executeRealTime(async () => {
      if (!params.orderPrice) throw new ValidationError('orderPrice required for stop orders');

      const response = await this.messageHandler.sendMessage({
        type: 'ProtoOANewOrderReq',
        ctidTraderAccountId: this.currentAccountId,
        symbol: params.symbol,
        volume: normalizeVolume(params.volume),
        side: params.side,
        orderType: OrderType.STOP,
        orderPrice: normalizePrice(params.orderPrice),
        stopLoss: params.stopLoss ? normalizePrice(params.stopLoss) : undefined,
        takeProfit: params.takeProfit ? normalizePrice(params.takeProfit) : undefined,
        label: params.label,
        comment: params.comment,
        expirationTime: params.expiration?.getTime()
      }, this.config.timeout);

      if (response.error) throw new CTraderError('ORDER_ERROR', response.error);
      return response;
    });
  }

  async placeStopLimitOrder(params: PlaceOrderParams & { stopPrice: number }): Promise<any> {
    return this.rateLimiter.executeRealTime(async () => {
      if (!params.orderPrice) throw new ValidationError('orderPrice required for stop-limit orders');

      const response = await this.messageHandler.sendMessage({
        type: 'ProtoOANewOrderReq',
        ctidTraderAccountId: this.currentAccountId,
        symbol: params.symbol,
        volume: normalizeVolume(params.volume),
        side: params.side,
        orderType: OrderType.STOP_LIMIT,
        orderPrice: normalizePrice(params.orderPrice),
        stopPrice: normalizePrice(params.stopPrice),
        stopLoss: params.stopLoss ? normalizePrice(params.stopLoss) : undefined,
        takeProfit: params.takeProfit ? normalizePrice(params.takeProfit) : undefined,
        label: params.label,
        comment: params.comment,
        expirationTime: params.expiration?.getTime()
      }, this.config.timeout);

      if (response.error) throw new CTraderError('ORDER_ERROR', response.error);
      return response;
    });
  }

  async modifyPendingOrder(orderId: number, params: Partial<PlaceOrderParams>): Promise<any> {
    return this.rateLimiter.executeRealTime(async () => {
      const response = await this.messageHandler.sendMessage({
        type: 'ProtoOAAmendOrderReq',
        ctidTraderAccountId: this.currentAccountId,
        orderId,
        volume: params.volume ? normalizeVolume(params.volume) : undefined,
        orderPrice: params.orderPrice ? normalizePrice(params.orderPrice) : undefined,
        stopLoss: params.stopLoss ? normalizePrice(params.stopLoss) : undefined,
        takeProfit: params.takeProfit ? normalizePrice(params.takeProfit) : undefined,
        expirationTime: params.expiration?.getTime()
      }, this.config.timeout);

      if (response.error) throw new CTraderError('ORDER_MODIFY_ERROR', response.error);
      return response;
    });
  }

  async cancelPendingOrder(orderId: number): Promise<void> {
    return this.rateLimiter.executeRealTime(async () => {
      const response = await this.messageHandler.sendMessage({
        type: 'ProtoOACancelOrderReq',
        ctidTraderAccountId: this.currentAccountId,
        orderId
      }, this.config.timeout);

      if (response.error) throw new CTraderError('ORDER_CANCEL_ERROR', response.error);
    });
  }

  // ========================================================================
  // POSITION MANAGEMENT
  // ========================================================================

  async getAllPositions(): Promise<Position[]> {
    return this.rateLimiter.executeRealTime(async () => {
      const response = await this.messageHandler.sendMessage({
        type: 'ProtoOAReconcileReq',
        ctidTraderAccountId: this.currentAccountId
      }, this.config.timeout);

      return (response.position || []).map((pos: any) => ({
        positionId: pos.positionId,
        symbol: pos.symbol,
        symbolId: pos.symbolId,
        volume: normalizeVolume(pos.volume),
        entryPrice: normalizePrice(pos.entryPrice),
        currentPrice: normalizePrice(pos.currentPrice),
        unrealizedPnl: normalizePrice(pos.unrealizedPnl),
        realizedPnl: normalizePrice(pos.realizedPnl),
        side: pos.buySide ? OrderSide.BUY : OrderSide.SELL,
        openTime: new Date(pos.createTime),
        modifyTime: pos.modifyTime ? new Date(pos.modifyTime) : undefined,
        stopLoss: pos.stopLoss ? normalizePrice(pos.stopLoss) : undefined,
        takeProfit: pos.takeProfit ? normalizePrice(pos.takeProfit) : undefined,
        trailingStop: pos.trailingStopDistance ? true : false,
        trailingDistance: pos.trailingStopDistance ? normalizePrice(pos.trailingStopDistance) : undefined,
        guaranteedStopLoss: pos.guaranteedStopLoss || false
      }));
    });
  }

  async getPositionsBySymbol(symbol: string): Promise<Position[]> {
    const allPositions = await this.getAllPositions();
    return allPositions.filter(pos => pos.symbol === symbol);
  }

  async getPositionById(positionId: number): Promise<Position | null> {
    const allPositions = await this.getAllPositions();
    return allPositions.find(pos => pos.positionId === positionId) || null;
  }

  async modifyPositionSLTP(positionId: number, stopLoss?: number, takeProfit?: number): Promise<void> {
    return this.rateLimiter.executeRealTime(async () => {
      const response = await this.messageHandler.sendMessage({
        type: 'ProtoOAAmendPositionSLTPReq',
        ctidTraderAccountId: this.currentAccountId,
        positionId,
        stopLoss: stopLoss ? normalizePrice(stopLoss) : undefined,
        takeProfit: takeProfit ? normalizePrice(takeProfit) : undefined
      }, this.config.timeout);

      if (response.error) throw new CTraderError('POSITION_MODIFY_ERROR', response.error);
    });
  }

  async closePosition(positionId: number, volume?: number): Promise<void> {
    return this.rateLimiter.executeRealTime(async () => {
      const response = await this.messageHandler.sendMessage({
        type: 'ProtoOAClosePositionReq',
        ctidTraderAccountId: this.currentAccountId,
        positionId,
        volume: volume ? normalizeVolume(volume) : undefined
      }, this.config.timeout);

      if (response.error) throw new CTraderError('CLOSE_POSITION_ERROR', response.error);
    });
  }

  async closeAllPositions(): Promise<void> {
    return this.rateLimiter.executeRealTime(async () => {
      const positions = await this.getAllPositions();

      for (const position of positions) {
        await this.closePosition(position.positionId);
      }
    });
  }

  async closePositionsBySymbol(symbol: string): Promise<void> {
    return this.rateLimiter.executeRealTime(async () => {
      const positions = await this.getPositionsBySymbol(symbol);

      for (const position of positions) {
        await this.closePosition(position.positionId);
      }
    });
  }

  async enableTrailingStop(positionId: number, distance: number): Promise<void> {
    return this.rateLimiter.executeRealTime(async () => {
      const response = await this.messageHandler.sendMessage({
        type: 'ProtoOAUpdatePositionTrailingStopReq',
        ctidTraderAccountId: this.currentAccountId,
        positionId,
        trailingStopDistance: normalizePrice(distance)
      }, this.config.timeout);

      if (response.error) throw new CTraderError('TRAILING_STOP_ERROR', response.error);
    });
  }

  async setGuaranteedStopLoss(positionId: number, stopLoss: number): Promise<void> {
    return this.rateLimiter.executeRealTime(async () => {
      const response = await this.messageHandler.sendMessage({
        type: 'ProtoOAUpdatePositionGuaranteedStopLossReq',
        ctidTraderAccountId: this.currentAccountId,
        positionId,
        stopLoss: normalizePrice(stopLoss)
      }, this.config.timeout);

      if (response.error) throw new CTraderError('GSL_ERROR', response.error);
    });
  }

  // ========================================================================
  // PENDING ORDERS
  // ========================================================================

  async getAllPendingOrders(): Promise<PendingOrder[]> {
    return this.rateLimiter.executeRealTime(async () => {
      const response = await this.messageHandler.sendMessage({
        type: 'ProtoOAReconcileReq',
        ctidTraderAccountId: this.currentAccountId
      }, this.config.timeout);

      return (response.order || []).map((order: any) => ({
        orderId: order.orderId,
        symbol: order.symbol,
        symbolId: order.symbolId,
        volume: normalizeVolume(order.volume),
        orderPrice: normalizePrice(order.orderPrice),
        side: order.buySide ? OrderSide.BUY : OrderSide.SELL,
        orderType: order.orderType,
        createTime: new Date(order.createTime),
        modifyTime: order.modifyTime ? new Date(order.modifyTime) : undefined,
        expirationTime: order.expirationTime ? new Date(order.expirationTime) : undefined,
        stopLoss: order.stopLoss ? normalizePrice(order.stopLoss) : undefined,
        takeProfit: order.takeProfit ? normalizePrice(order.takeProfit) : undefined,
        label: order.label,
        comment: order.comment
      }));
    });
  }

  async getPendingOrdersBySymbol(symbol: string): Promise<PendingOrder[]> {
    const allOrders = await this.getAllPendingOrders();
    return allOrders.filter(order => order.symbol === symbol);
  }

  async getPendingOrderById(orderId: number): Promise<PendingOrder | null> {
    const allOrders = await this.getAllPendingOrders();
    return allOrders.find(order => order.orderId === orderId) || null;
  }

  async cancelAllPendingOrders(): Promise<void> {
    return this.rateLimiter.executeRealTime(async () => {
      const orders = await this.getAllPendingOrders();

      for (const order of orders) {
        await this.cancelPendingOrder(order.orderId);
      }
    });
  }

  async cancelPendingOrdersBySymbol(symbol: string): Promise<void> {
    return this.rateLimiter.executeRealTime(async () => {
      const orders = await this.getPendingOrdersBySymbol(symbol);

      for (const order of orders) {
        await this.cancelPendingOrder(order.orderId);
      }
    });
  }

  // ========================================================================
  // TRADING HISTORY
  // ========================================================================

  async getDeals(params?: { fromTimestamp?: number; count?: number }): Promise<Deal[]> {
    return this.rateLimiter.executeHistorical(async () => {
      const response = await this.messageHandler.sendMessage({
        type: 'ProtoOADealsReq',
        ctidTraderAccountId: this.currentAccountId,
        fromTimestamp: params?.fromTimestamp,
        count: params?.count || 1000
      }, this.config.timeout);

      return (response.deal || []).map((deal: any) => ({
        dealId: deal.dealId,
        orderId: deal.orderId,
        positionId: deal.positionId,
        symbol: deal.symbol,
        symbolId: deal.symbolId,
        volume: normalizeVolume(deal.volume),
        dealPrice: normalizePrice(deal.dealPrice),
        dealTime: new Date(deal.dealTime),
        side: deal.buySide ? OrderSide.BUY : OrderSide.SELL,
        commission: normalizePrice(deal.commission),
        pnl: normalizePrice(deal.pnl),
        pnlInAccountCurrency: normalizePrice(deal.pnlInAccountCurrency)
      }));
    });
  }

  async getDealsByPosition(positionId: number): Promise<Deal[]> {
    const allDeals = await this.getDeals();
    return allDeals.filter(deal => deal.positionId === positionId);
  }

  async getOrderHistory(params?: { fromTimestamp?: number; count?: number }): Promise<any[]> {
    return this.rateLimiter.executeHistorical(async () => {
      const response = await this.messageHandler.sendMessage({
        type: 'ProtoOAOrdersReq',
        ctidTraderAccountId: this.currentAccountId,
        fromTimestamp: params?.fromTimestamp,
        count: params?.count || 1000
      }, this.config.timeout);

      return response.order || [];
    });
  }

  async getCashFlowHistory(params?: { fromTimestamp?: number; count?: number }): Promise<any[]> {
    return this.rateLimiter.executeHistorical(async () => {
      const response = await this.messageHandler.sendMessage({
        type: 'ProtoOACashFlowReq',
        ctidTraderAccountId: this.currentAccountId,
        fromTimestamp: params?.fromTimestamp,
        count: params?.count || 1000
      }, this.config.timeout);

      return response.cashFlow || [];
    });
  }

  // ========================================================================
  // RISK MANAGEMENT
  // ========================================================================

  async getMarginCalls(): Promise<MarginCallLevel[]> {
    return this.rateLimiter.executeRealTime(async () => {
      const response = await this.messageHandler.sendMessage({
        type: 'ProtoOAMarginCallListReq',
        ctidTraderAccountId: this.currentAccountId
      }, this.config.timeout);

      return response.marginCallThresholds || [];
    });
  }

  async updateMarginCall(threshold: number, enabled: boolean): Promise<void> {
    return this.rateLimiter.executeRealTime(async () => {
      const response = await this.messageHandler.sendMessage({
        type: 'ProtoOAMarginCallUpdateReq',
        ctidTraderAccountId: this.currentAccountId,
        threshold,
        isEnabled: enabled
      }, this.config.timeout);

      if (response.error) throw new CTraderError('MARGIN_CALL_ERROR', response.error);
    });
  }

  async subscribeMarginEvents(): Promise<void> {
    return this.rateLimiter.executeRealTime(async () => {
      const response = await this.messageHandler.sendMessage({
        type: 'ProtoOASubscribeMarginChangeReq',
        ctidTraderAccountId: this.currentAccountId
      }, this.config.timeout);

      if (response.error) throw new CTraderError('MARGIN_SUBSCRIBE_ERROR', response.error);
    });
  }

  async subscribeExecutionEvents(): Promise<void> {
    return this.rateLimiter.executeRealTime(async () => {
      const response = await this.messageHandler.sendMessage({
        type: 'ProtoOASubscribeExecutionEventsReq',
        ctidTraderAccountId: this.currentAccountId
      }, this.config.timeout);

      if (response.error) throw new CTraderError('EXECUTION_SUBSCRIBE_ERROR', response.error);
    });
  }

  // ========================================================================
  // EVENT SYSTEM
  // ========================================================================

  private emit(event: string, data?: any) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }

  private on(event: string, handler: Function) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  private off(event: string, handler: Function) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  // Event subscription methods
  onSpotEvent(handler: (spot: Spot) => void) { this.on('spot', handler); }
  offSpotEvent(handler: (spot: Spot) => void) { this.off('spot', handler); }

  onExecutionEvent(handler: (exec: any) => void) { this.on('execution', handler); }
  offExecutionEvent(handler: (exec: any) => void) { this.off('execution', handler); }

  onOrderError(handler: (error: any) => void) { this.on('order-error', handler); }
  offOrderError(handler: (error: any) => void) { this.off('order-error', handler); }

  onMarginChanged(handler: (margin: any) => void) { this.on('margin-changed', handler); }
  offMarginChanged(handler: (margin: any) => void) { this.off('margin-changed', handler); }

  onTrailingSLChanged(handler: (trailing: any) => void) { this.on('trailing-sl-changed', handler); }
  offTrailingSLChanged(handler: (trailing: any) => void) { this.off('trailing-sl-changed', handler); }

  onDepthEvent(handler: (depth: DepthQuote) => void) { this.on('depth', handler); }
  offDepthEvent(handler: (depth: DepthQuote) => void) { this.off('depth', handler); }

  onSymbolChanged(handler: (symbol: Symbol) => void) { this.on('symbol-changed', handler); }
  offSymbolChanged(handler: (symbol: Symbol) => void) { this.off('symbol-changed', handler); }

  onTraderUpdated(handler: (trader: any) => void) { this.on('trader-updated', handler); }
  offTraderUpdated(handler: (trader: any) => void) { this.off('trader-updated', handler); }

  onMarginCallTriggered(handler: (call: any) => void) { this.on('margin-call', handler); }
  offMarginCallTriggered(handler: (call: any) => void) { this.off('margin-call', handler); }

  onConnected(handler: () => void) { this.on('connected', handler); }
  offConnected(handler: () => void) { this.off('connected', handler); }

  onDisconnected(handler: () => void) { this.on('disconnected', handler); }
  offDisconnected(handler: () => void) { this.off('disconnected', handler); }

  onTokenInvalidated(handler: () => void) { this.on('token-invalidated', handler); }
  offTokenInvalidated(handler: () => void) { this.off('token-invalidated', handler); }

  // ========================================================================
  // UTILITIES
  // ========================================================================

  private ensureAuthenticated() {
    if (!this.currentAccountId) {
      throw new AuthenticationError('Not authenticated. Call accountAuth first.');
    }
  }
}

// ============================================================================
// 6. UTILITY FUNCTIONS
// ============================================================================

/**
 * Coerce a Long-like / string / bigint value into a JS Number when safe.
 * Falls back to `fallback` when conversion is not possible.
 */
export function toNumber(value: any, fallback: number = 0): number {
  if (value == null) return fallback;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'bigint') {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }
  if (typeof value === 'string') {
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : fallback;
  }

  if (typeof value === 'object') {
    try {
      if (typeof (value as any).toNumber === 'function') {
        const n = (value as any).toNumber();
        return Number.isFinite(n) ? n : fallback;
      }
      const str = (value as any).toString?.();
      if (typeof str === 'string') {
        const n = parseFloat(str);
        return Number.isFinite(n) ? n : fallback;
      }
    } catch (e) {
      return fallback;
    }
  }

  return fallback;
}

/**
 * Convert price from protocol format (1/100000) to decimal
 */
export function normalizePrice(value: any, digits: number = 5): number {
  const n = toNumber(value, NaN);
  if (Number.isNaN(n)) return NaN;
  return n / Math.pow(10, digits);
}

/**
 * Convert price from decimal to protocol format (1/100000)
 */
export function denormalizePrice(value: number, digits: number = 5): number {
  return Math.round(value * Math.pow(10, digits));
}

/**
 * Convert volume from protocol format (cents) to standard lots
 */
export function normalizeVolume(value: any): number {
  const n = toNumber(value, NaN);
  if (Number.isNaN(n)) return NaN;
  return n / 100;
}

/**
 * Convert volume from lots to protocol format (cents)
 */
export function denormalizeVolume(value: number): number {
  return Math.round(value * 100);
}

/**
 * Handle money normalization with exponent
 */
export function normalizeMoney(value: any, exponent: number = 2): number {
  const n = toNumber(value, NaN);
  if (Number.isNaN(n)) return NaN;
  return n / Math.pow(10, exponent);
}

/**
 * Validate order parameters before sending
 */
export function validateOrderParams(params: PlaceOrderParams): boolean {
  if (!params.symbol) throw new ValidationError('Symbol is required');
  if (!params.volume || params.volume <= 0) throw new ValidationError('Volume must be positive');
  if (!params.side || !Object.values(OrderSide).includes(params.side)) {
    throw new ValidationError('Invalid order side');
  }
  if (params.stopLoss && params.takeProfit) {
    if (params.side === OrderSide.BUY && params.stopLoss >= params.takeProfit) {
      throw new ValidationError('For BUY orders, stopLoss must be < takeProfit');
    }
    if (params.side === OrderSide.SELL && params.stopLoss <= params.takeProfit) {
      throw new ValidationError('For SELL orders, stopLoss must be > takeProfit');
    }
  }
  return true;
}

/**
 * Calculate position value in account currency
 */
export function calculatePositionValue(params: {
  volume: number;
  openPrice: number;
  accountCurrency: string;
  symbolCurrency: string;
  exchangeRate: number;
}): number {
  return params.volume * params.openPrice * params.exchangeRate;
}

/**
 * Get symbol ID from list
 */
export async function getSymbolId(client: CTraderClient, symbolName: string): Promise<number | null> {
  const symbols = await client.getAllSymbols();
  const symbol = symbols.find(s => s.name === symbolName || s.displayName === symbolName);
  return symbol?.symbolId || null;
}

/**
 * Get asset ID from list
 */
export async function getAssetId(client: CTraderClient, assetName: string): Promise<number | null> {
  const assets = await client.getAssets();
  const asset = assets.find(a => a.name === assetName);
  return asset?.assetId || null;
}

// ============================================================================
// 7. EXPORT ALL
// ============================================================================

export default CTraderClient;
