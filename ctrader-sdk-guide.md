# cTrader OpenAPI TypeScript SDK - Setup & Integration Guide

## Table of Contents

1. [Installation](#installation)
2. [Getting Started](#getting-started)
3. [Configuration](#configuration)
4. [Authentication Flow](#authentication-flow)
5. [Core Concepts](#core-concepts)
6. [API Reference](#api-reference)
7. [Error Handling](#error-handling)
8. [Performance Optimization](#performance-optimization)
9. [Production Deployment](#production-deployment)
10. [Troubleshooting](#troubleshooting)

---

## Installation

### npm/yarn

```bash
npm install ctrader-open-api
# or
yarn add ctrader-open-api
```

### TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020"],
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

### Environment Variables

Create `.env` file:

```env
CTRADER_CLIENT_ID=your_application_client_id
CTRADER_CLIENT_SECRET=your_application_client_secret
CTRADER_ACCESS_TOKEN=user_access_token
CTRADER_REFRESH_TOKEN=user_refresh_token
CTRADER_ACCOUNT_ID=your_trading_account_id
CTRADER_ENVIRONMENT=demo  # or 'live'
```

---

## Getting Started

### Minimal Example

```typescript
import { CTraderClient, Environment, OrderSide } from 'ctrader-open-api';

async function quickStart() {
  // Create client
  const client = new CTraderClient({
    clientId: process.env.CTRADER_CLIENT_ID!,
    clientSecret: process.env.CTRADER_CLIENT_SECRET!,
    environment: Environment.DEMO
  });

  try {
    // Connect
    await client.connect();
    console.log('Connected ✓');

    // Authenticate
    const tokens = await client.applicationAuth();
    const accounts = await client.getAccountsByToken(tokens.accessToken);
    
    if (accounts.length === 0) {
      throw new Error('No trading accounts found');
    }

    // Select account
    await client.accountAuth(accounts[0].ctidTraderAccountId, tokens.accessToken);

    // Get account info
    const info = await client.getAccountInfo();
    console.log(`Balance: $${info.balance.toFixed(2)}`);

    // Place order
    const order = await client.placeMarketOrder({
      symbol: 'EURUSD',
      volume: 1.0,
      side: OrderSide.BUY,
      stopLoss: 1.0800,
      takeProfit: 1.1000
    });
    console.log(`Order placed: ${order.orderId}`);

  } finally {
    await client.disconnect();
  }
}

quickStart().catch(console.error);
```

---

## Configuration

### Full Configuration Options

```typescript
interface CTraderConfig {
  // Required
  clientId: string;              // Application client ID from cTrader
  clientSecret: string;          // Application client secret
  environment: 'demo' | 'live';  // Trading environment

  // Optional
  host?: string;                 // Regional proxy server
  port?: number;                 // 5035 (WebSocket) or 5036 (TCP)
  protocol?: 'websocket' | 'tcp'; // Default: 'websocket'

  // Connection
  autoReconnect?: boolean;       // Reconnect on disconnect (default: true)
  maxReconnectAttempts?: number; // Max reconnection tries (default: 5)
  reconnectDelay?: number;       // Initial delay in ms (default: 1000)
  timeout?: number;              // Request timeout in ms (default: 5000)

  // Rate Limiting
  rateLimit?: {
    realTime: number;            // Requests/sec for real-time (default: 50)
    historical: number;          // Requests/sec for history (default: 5)
  };
}
```

### Regional Proxy Selection

The SDK automatically routes to the best proxy. You can also specify a region:

```typescript
const config = {
  clientId: 'your_id',
  clientSecret: 'your_secret',
  environment: Environment.LIVE,
  host: 'live.ctraderapi.com' // Auto-selected by default
};
```

**Available Hosts:**
- `demo.ctraderapi.com` - Demo environment (testing)
- `live.ctraderapi.com` - Live environment (real money)

---

## Authentication Flow

### Step 1: Application Authentication

```typescript
const tokens = await client.applicationAuth();

console.log(tokens);
// {
//   accessToken: "...",
//   refreshToken: "...",
//   expiresIn: 2628000,  // ~30 days in seconds
//   tokenType: "bearer"
// }
```

### Step 2: Get Accessible Accounts

```typescript
const accounts = await client.getAccountsByToken(tokens.accessToken);

accounts.forEach(account => {
  console.log(`
    Account ID: ${account.ctidTraderAccountId}
    Balance: $${account.balance}
    Equity: $${account.equity}
    Currency: ${account.currency}
  `);
});
```

### Step 3: Select Account

```typescript
const accountId = accounts[0].ctidTraderAccountId;
await client.accountAuth(accountId, tokens.accessToken);
```

### Step 4: Token Refresh (Automatic)

Access tokens expire in ~30 days. Refresh before expiry:

```typescript
// Automatic approach (recommended)
const newTokens = await client.refreshToken(tokens.refreshToken);

// Store new tokens securely
// newTokens.refreshToken (valid forever, use once to generate next token)
// newTokens.accessToken (use for next ~30 days)
```

### Token Lifecycle Management

```typescript
class TokenManager {
  private tokens: AuthTokens;
  private refreshTimer?: NodeJS.Timeout;

  constructor(private client: CTraderClient) {}

  async initialize() {
    this.tokens = await this.client.applicationAuth();
    this.scheduleRefresh();
  }

  private scheduleRefresh() {
    // Refresh 1 minute before expiry
    const refreshIn = (this.tokens.expiresIn - 60) * 1000;
    
    this.refreshTimer = setTimeout(async () => {
      try {
        this.tokens = await this.client.refreshToken(this.tokens.refreshToken);
        this.scheduleRefresh(); // Schedule next refresh
        console.log('Tokens refreshed');
      } catch (error) {
        console.error('Token refresh failed:', error);
      }
    }, refreshIn);
  }

  getAccessToken() {
    return this.tokens.accessToken;
  }

  getRefreshToken() {
    return this.tokens.refreshToken;
  }

  cleanup() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }
  }
}
```

---

## Core Concepts

### Price Format

Prices in cTrader API use protobuf format (1/100000 for most symbols). The SDK converts automatically:

```typescript
// API response: 110500
const decimalPrice = normalizePrice(110500); // = 1.10500

// Before sending to API: 1.10500
const protobufPrice = denormalizePrice(1.10500); // = 110500
```

### Volume Format

Volumes in API use cents. SDK converts automatically:

```typescript
// API response: 100000
const lots = normalizeVolume(100000); // = 1.0 lot

// Before sending to API: 1.0
const cents = denormalizeVolume(1.0); // = 100000
```

### Symbols

Always use symbol name as string (case-insensitive):

```typescript
// Valid
await client.subscribeToSymbols(['EURUSD', 'GBPUSD']);

// Also valid
await client.subscribeToSymbols(['eurusd', 'gbpusd']);
```

### Time Handling

Timestamps in API use milliseconds since epoch. SDK converts to JavaScript Dates:

```typescript
// Returned from API
const position: Position;
console.log(position.openTime); // JavaScript Date object
console.log(position.openTime.toISOString()); // ISO 8601 string

// When sending
const candles = await client.getCandles({
  symbol: 'EURUSD',
  timeframe: Timeframe.D1,
  // Optional: use Date objects
  fromTimestamp: new Date('2024-01-01').getTime() / 1000
});
```

---

## API Reference Summary

### Connection
- `connect()` - Establish WebSocket/TCP connection
- `disconnect()` - Close connection gracefully
- `getVersion()` - Get API version

### Authentication
- `applicationAuth()` - Authorize application
- `accountAuth(id, token)` - Select trading account
- `refreshToken(token)` - Refresh expired token
- `getAccountsByToken(token)` - List accessible accounts

### Account Management
- `getAccountInfo()` - Current balance, equity, margins
- `getCtidProfile()` - Trader profile (GDPR limited)
- `getPositionUnrealizedPnl()` - Total unrealized P&L
- `getExpectedMargin(symbol, volume)` - Calculate margin needed
- `getDynamicLeverage(symbolId)` - Get dynamic leverage info

### Market Data
- `getAllSymbols()` - List all trading symbols
- `getSymbolDetails(id)` - Detailed symbol information
- `getAssets()` - List available assets
- `getAssetClasses()` - Asset categories
- `getSymbolCategories()` - Symbol categories

### Real-time Data
- `subscribeToSymbols(symbols)` - Subscribe to prices
- `unsubscribeFromSymbols(symbols)` - Unsubscribe
- `getCurrentPrice(symbol)` - Get latest bid/ask
- `subscribeToDepthQuotes(symbol)` - Order book
- `unsubscribeFromDepthQuotes(symbol)` - Cancel order book
- `onSpotEvent(handler)` - Price update events
- `onDepthEvent(handler)` - Order book events

### Historical Data
- `getCandles(params)` - OHLCV bars
- `getCandlesByDate(params)` - Bars by date range
- `getTickData(params)` - Tick-by-tick data
- `subscribeLiveTrendbars(symbol, tf)` - Live candles
- `unsubscribeLiveTrendbars(symbol, tf)` - Cancel live candles

### Orders
- `placeMarketOrder(params)` - Instant execution
- `placeLimitOrder(params)` - Entry at price
- `placeStopOrder(params)` - Stop/trigger order
- `placeStopLimitOrder(params)` - Stop + limit
- `modifyPendingOrder(id, params)` - Update pending
- `cancelPendingOrder(id)` - Cancel order
- `getAllPendingOrders()` - List pending
- `getPendingOrdersBySymbol(sym)` - Filter by symbol
- `getPendingOrderById(id)` - Get specific order

### Positions
- `getAllPositions()` - List open positions
- `getPositionsBySymbol(sym)` - Positions for symbol
- `getPositionById(id)` - Get specific position
- `modifyPositionSLTP(id, sl, tp)` - Update stops
- `closePosition(id, volume?)` - Close fully or partial
- `closeAllPositions()` - Close all positions
- `closePositionsBySymbol(sym)` - Close by symbol
- `enableTrailingStop(id, distance)` - Enable trailing
- `setGuaranteedStopLoss(id, sl)` - Guaranteed stop

### History
- `getDeals(params)` - Executed deals/fills
- `getDealsByPosition(id)` - Deals for position
- `getOrderHistory(params)` - Order records
- `getCashFlowHistory(params)` - Deposits/withdrawals

### Risk Management
- `getMarginCalls()` - Margin call thresholds
- `updateMarginCall(threshold, enabled)` - Configure alerts
- `subscribeMarginEvents()` - Margin change updates
- `subscribeExecutionEvents()` - Trade executions

### Events
- `onSpotEvent(handler)` - Price updates
- `onExecutionEvent(handler)` - Trade execution
- `onOrderError(handler)` - Order failures
- `onMarginChanged(handler)` - Margin changes
- `onTrailingSLChanged(handler)` - Trailing stop updates
- `onDepthEvent(handler)` - Order book updates
- `onSymbolChanged(handler)` - Symbol spec changes
- `onTraderUpdated(handler)` - Account updates
- `onMarginCallTriggered(handler)` - Margin alerts
- `onConnected()` - Connection established
- `onDisconnected()` - Connection closed
- `onTokenInvalidated()` - Token expired

---

## Error Handling

### Error Types

```typescript
import {
  CTraderError,        // Base API error
  NetworkError,        // Connection issues
  ValidationError,     // Invalid parameters
  AuthenticationError  // Auth failures
} from 'ctrader-open-api';
```

### Error Handling Pattern

```typescript
try {
  const order = await client.placeMarketOrder({
    symbol: 'EURUSD',
    volume: 1.0,
    side: OrderSide.BUY
  });
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Invalid order parameters:', error.message);
    // Handle validation error
  } else if (error instanceof AuthenticationError) {
    console.error('Authentication failed:', error.message);
    // Re-authenticate
  } else if (error instanceof NetworkError) {
    console.error('Network error:', error.message);
    // Retry logic
  } else if (error instanceof CTraderError) {
    console.error(`API Error ${error.code}:`, error.message);
    // Handle specific error codes
  } else {
    console.error('Unexpected error:', error);
  }
}
```

### Common Error Codes

```
AUTH_ERROR         - Authentication failed
RATE_LIMIT         - Rate limit exceeded
NETWORK_ERROR      - Connection issue
ORDER_ERROR        - Order placement failed
ORDER_CANCEL_ERROR - Order cancellation failed
POSITION_MODIFY_ERROR - Position modification failed
CLOSE_POSITION_ERROR  - Position closing failed
```

---

## Performance Optimization

### Rate Limiting Strategy

The SDK automatically manages rate limits:

```typescript
// Real-time API: 50 requests/second
await client.subscribeToSymbols(['EURUSD', 'GBPUSD']); // Instant

// Historical API: 5 requests/second (auto-queued)
for (const symbol of symbols) {
  // These are automatically queued and rate-limited
  const candles = await client.getCandles({
    symbol,
    timeframe: Timeframe.D1,
    count: 100
  });
}
```

### Connection Pooling

Always reuse single client instance:

```typescript
// ❌ Wrong - new connection per operation
async function badApproach() {
  {
    const client = new CTraderClient({...});
    await client.connect();
    await client.placeMarketOrder({...});
    await client.disconnect();
  }
  
  {
    const client = new CTraderClient({...});
    await client.connect();
    await client.getAccountInfo();
    await client.disconnect();
  }
}

// ✓ Correct - reuse connection
let client: CTraderClient;

async function goodApproach() {
  // Connect once
  client = new CTraderClient({...});
  await client.connect();

  // Perform multiple operations
  await client.placeMarketOrder({...});
  await client.getAccountInfo();
  await client.getCandles({...});

  // Disconnect when done
  await client.disconnect();
}
```

### Batch Operations

```typescript
// Close multiple positions efficiently
const positions = await client.getAllPositions();

// These are queued and rate-limited automatically
await Promise.all(
  positions.map(p => client.closePosition(p.positionId))
);
```

### Event Aggregation

```typescript
// Instead of individual updates
let lastUpdate = 0;
const updateInterval = 100; // ms

client.onSpotEvent((spot) => {
  if (Date.now() - lastUpdate > updateInterval) {
    // Process update
    lastUpdate = Date.now();
  }
});
```

---

## Production Deployment

### Environment Setup

```bash
# Production variables
export CTRADER_ENVIRONMENT=live
export CTRADER_CLIENT_ID=prod_client_id
export CTRADER_CLIENT_SECRET=prod_client_secret
export NODE_ENV=production
```

### Health Monitoring

```typescript
class HealthMonitor {
  private client: CTraderClient;
  private isHealthy = true;
  private lastHeartbeat = Date.now();

  constructor(client: CTraderClient) {
    this.client = client;
    this.setupMonitoring();
  }

  private setupMonitoring() {
    this.client.onConnected(() => {
      this.isHealthy = true;
      this.lastHeartbeat = Date.now();
    });

    this.client.onDisconnected(() => {
      this.isHealthy = false;
    });

    this.client.onSpotEvent(() => {
      this.lastHeartbeat = Date.now();
    });

    // Check heartbeat every 30 seconds
    setInterval(() => {
      if (Date.now() - this.lastHeartbeat > 30000) {
        console.error('❌ Heartbeat timeout - reconnecting');
        this.client.disconnect().then(() => this.client.connect());
      }
    }, 30000);
  }

  getStatus() {
    return {
      isHealthy: this.isHealthy,
      lastHeartbeat: new Date(this.lastHeartbeat),
      uptime: Date.now() - this.lastHeartbeat
    };
  }
}
```

### Logging

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'trading.log' })
  ]
});

// Use in trading
logger.info('Order placed', { orderId: order.orderId, symbol: 'EURUSD' });
logger.error('Order failed', { error: error.message, symbol: 'EURUSD' });
```

---

## Troubleshooting

### Connection Issues

**Problem:** Cannot connect to cTrader

```typescript
// Debug connection
const client = new CTraderClient({
  clientId: 'your_id',
  clientSecret: 'your_secret',
  environment: Environment.DEMO,
  timeout: 10000 // Increase timeout
});

client.onConnected(() => console.log('Connected ✓'));
client.onDisconnected(() => console.log('Disconnected ✗'));

await client.connect();
```

**Solution:**
- Check environment variable: is it DEMO or LIVE?
- Verify clientId and clientSecret
- Check network connectivity
- Increase timeout value

### Authentication Errors

**Problem:** "Token expired"

```typescript
// Re-authenticate
try {
  const tokens = await client.refreshToken(oldTokens.refreshToken);
  // Use new tokens
} catch (error) {
  // Full re-auth needed
  const newTokens = await client.applicationAuth();
}
```

### Order Placement Issues

**Problem:** Orders rejected with validation error

```typescript
// Validate before sending
import { validateOrderParams } from 'ctrader-open-api';

const params = {
  symbol: 'EURUSD',
  volume: 1.0,
  side: OrderSide.BUY,
  stopLoss: 1.0800,
  takeProfit: 1.1000
};

try {
  validateOrderParams(params);
  await client.placeMarketOrder(params);
} catch (error) {
  console.error('Validation failed:', error.message);
}
```

### Rate Limit Exceeded

**Problem:** "Rate limit exceeded"

```typescript
// SDK handles rate limiting automatically
// Requests are queued and processed within limits

// If you still exceed limits:
// 1. Reduce subscription frequency
// 2. Batch candle requests
// 3. Increase request interval
// 4. Contact Spotware for dedicated proxy
```

### Memory Leaks

**Problem:** Memory usage grows over time

```typescript
// Always unsubscribe
await client.unsubscribeFromSymbols(['EURUSD']);

// Always remove event listeners
const handler = (spot) => {};
client.offSpotEvent(handler);

// Disconnect when done
await client.disconnect();
```

---

## Support & Resources

- **Official Docs**: https://help.ctrader.com/open-api/
- **SDK Repository**: https://github.com/yourusername/ctrader-open-api
- **Issues**: https://github.com/yourusername/ctrader-open-api/issues
- **Discussions**: https://github.com/yourusername/ctrader-open-api/discussions
- **cTrader Community**: https://community.ctrader.com/

## License

MIT - See LICENSE file
