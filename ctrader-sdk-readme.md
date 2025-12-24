# cTrader OpenAPI TypeScript/JavaScript SDK

A comprehensive, easy-to-use TypeScript/JavaScript client library for the [cTrader OpenAPI](https://openapi.ctrader.com/). This SDK abstracts away the complexity of Protocol Buffers messages and WebSocket management, providing an intuitive, modern API for trading applications.

## Features

### Authentication & Connection
- WebSocket and TCP connection management
- OAuth2 token management with automatic refresh
- Multi-account support
- Graceful disconnection and reconnection handling
- Version information retrieval

### Account Management
- Account info retrieval (balance, equity, margin levels)
- Trader profile information (GDPR-compliant)
- Unrealized P&L calculations
- Expected margin calculations
- Dynamic leverage information
- Margin call monitoring and configuration

### Market Data
- Symbol information with spreads and commissions
- Asset and asset class data
- Real-time price subscriptions
- Depth of market (order book) data
- Conversion chains between assets

### Historical Data
- Candle/OHLCV data with multiple timeframes (M1, M5, M15, M30, H1, H4, D1, W1, MN)
- Tick-by-tick historical data
- Date range filtering
- Live candle subscriptions

### Order Execution
- Market orders (BUY/SELL)
- Limit, stop, and stop-limit orders
- Market range orders with slippage control
- Order modification
- Order cancellation

### Position Management
- Get all positions with unrealized P&L
- Filter by symbol
- Modify stop loss and take profit
- Close positions (fully or partially)
- Trailing stop loss management
- Guaranteed stop loss (for eligible accounts)

### Advanced Features
- Built-in rate limiting (50 req/sec real-time, 5 req/sec historical)
- Automatic retry with exponential backoff
- Comprehensive error handling and descriptive messages
- Connection state management
- Event-driven architecture with typed events
- Price/volume/money normalization utilities
- Order validation helpers
- Position value calculations

## Installation

```bash
npm install ctrader-open-api
# or
yarn add ctrader-open-api
```

## Quick Start

```typescript
import { CTraderClient } from 'ctrader-open-api';

const client = new CTraderClient({
  clientId: 'your_client_id',
  clientSecret: 'your_client_secret',
  environment: 'demo' // or 'live'
});

// Connect and authenticate
await client.connect();
await client.applicationAuth();

// Get your accounts
const accounts = await client.getAccountsByToken('your_access_token');

// Select account
await client.accountAuth(accounts[0].ctidTraderAccountId, 'your_access_token');

// Get account info
const accountInfo = await client.getAccountInfo();
console.log('Balance:', accountInfo.balance);
console.log('Equity:', accountInfo.equity);

// Place a market order
const order = await client.placeMarketOrder({
  symbol: 'EURUSD',
  volume: 1.0, // 1 lot
  side: 'BUY',
  slippage: 10 // 10 pips
});

console.log('Order placed:', order.orderId);

// Subscribe to real-time prices
client.subscribeToSymbols(['EURUSD', 'GBPUSD']);

client.onSpotEvent((spot) => {
  console.log(`${spot.symbol}: Bid ${spot.bid}, Ask ${spot.ask}`);
});

// Get candles
const candles = await client.getCandles({
  symbol: 'EURUSD',
  timeframe: 'H1',
  count: 100
});

// Close connection
await client.disconnect();
```

## Architecture

The SDK is organized into logical modules:

- **Core**: Connection, authentication, message handling
- **Account**: Account information and management
- **Market**: Symbol data, real-time prices
- **History**: Candles, ticks, deal records
- **Trading**: Orders, positions, deal execution
- **Utilities**: Normalization, validation, calculations
- **Events**: Type-safe event subscriptions

## Documentation

See `/docs` directory for detailed documentation:

- [Authentication Guide](./docs/authentication.md)
- [Account Management](./docs/account-management.md)
- [Market Data](./docs/market-data.md)
- [Trading Guide](./docs/trading.md)
- [Position Management](./docs/position-management.md)
- [Error Handling](./docs/error-handling.md)
- [Type Definitions](./docs/types.md)
- [Examples](./docs/examples.md)

## Configuration

```typescript
interface CTraderConfig {
  clientId: string;           // Your application client ID
  clientSecret: string;       // Your application client secret
  environment: 'demo' | 'live'; // Trading environment
  host?: string;              // Custom host (default: regional proxy)
  port?: number;              // Port (default: 5035 for WebSocket, 5036 for TCP)
  protocol?: 'websocket' | 'tcp'; // Default: 'websocket'
  autoReconnect?: boolean;    // Auto-reconnect on disconnect
  maxReconnectAttempts?: number; // Max reconnection attempts
  reconnectDelay?: number;    // Initial reconnect delay in ms
  timeout?: number;           // Request timeout in ms
  rateLimit?: {
    realTime: number;         // Requests per second for real-time data (default: 50)
    historical: number;       // Requests per second for historical data (default: 5)
  };
}
```

## Event System

The SDK provides type-safe event subscriptions:

```typescript
// Price updates
client.onSpotEvent((spot) => {
  console.log(spot.symbol, spot.bid, spot.ask);
});

// Execution events
client.onExecutionEvent((execution) => {
  console.log('Order executed:', execution);
});

// Order errors
client.onOrderError((error) => {
  console.error('Order failed:', error.message);
});

// Margin changes
client.onMarginChanged((margin) => {
  console.log('Margin changed:', margin);
});

// Trailing stop loss updates
client.onTrailingSLChanged((trailing) => {
  console.log('Trailing SL updated:', trailing);
});

// Connection events
client.onConnected(() => console.log('Connected'));
client.onDisconnected(() => console.log('Disconnected'));
client.onTokenInvalidated(() => {
  // Refresh token
});
```

## Error Handling

```typescript
import { CTraderError, NetworkError, ValidationError } from 'ctrader-open-api';

try {
  await client.placeMarketOrder({
    symbol: 'EURUSD',
    volume: 1.0,
    side: 'BUY'
  });
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Invalid parameters:', error.message);
  } else if (error instanceof NetworkError) {
    console.error('Connection error:', error.message);
  } else if (error instanceof CTraderError) {
    console.error('API error:', error.code, error.message);
  } else {
    console.error('Unknown error:', error);
  }
}
```

## Rate Limiting

The SDK automatically manages rate limits:

```typescript
// Real-time requests: 50/sec
await client.subscribeToSymbols(['EURUSD', 'GBPUSD']);

// Historical requests: 5/sec
// Requests are queued automatically
for (const symbol of symbols) {
  const candles = await client.getCandles({
    symbol,
    timeframe: 'D1',
    count: 100
  });
}
```

## Utility Functions

```typescript
import { 
  normalizePrice,
  normalizeVolume,
  normalizeMoney,
  validateOrderParams,
  calculatePositionValue,
  getSymbolId,
  getAssetId
} from 'ctrader-open-api';

// Convert protocol format to decimal
const price = normalizePrice(110000); // 1.10000
const volume = normalizeVolume(100000); // 1.0 lot

// Validate before sending
if (validateOrderParams({ symbol: 'EURUSD', volume: 1.0, side: 'BUY' })) {
  await client.placeMarketOrder({...});
}

// Calculate position value
const posValue = calculatePositionValue({
  volume: 1.0,
  openPrice: 1.0850,
  accountCurrency: 'USD',
  symbolCurrency: 'EUR',
  exchangeRate: 1.10
});
```

## TypeScript Support

Full TypeScript support with comprehensive type definitions:

```typescript
interface PlaceOrderParams {
  symbol: string;
  volume: number;
  side: 'BUY' | 'SELL';
  stopLoss?: number;
  takeProfit?: number;
  expiration?: Date;
  label?: string;
  comment?: string;
}

interface Position {
  positionId: number;
  symbol: string;
  volume: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  side: 'BUY' | 'SELL';
  openTime: Date;
  stopLoss?: number;
  takeProfit?: number;
  trailingStop?: boolean;
}

// Type-safe function calls
await client.placeMarketOrder({
  symbol: 'EURUSD',
  volume: 1.0,
  side: 'BUY'
  // TypeScript will error if required fields are missing
} as PlaceOrderParams);
```

## Performance Considerations

- **Connection Pooling**: Reuse single WebSocket connection for multiple operations
- **Batch Requests**: Group related requests when possible
- **Event Aggregation**: Use event batching for high-frequency updates
- **Message Buffering**: Automatic buffering for outgoing messages
- **Memory Management**: Automatic cleanup of old event listeners

## Browser Compatibility

Works in modern browsers with WebSocket support:
- Chrome 16+
- Firefox 11+
- Safari 7+
- Edge 12+

## Node.js Support

Node.js 14+ with ESM and CommonJS support

## License

MIT - See LICENSE file for details

## Contributing

Contributions welcome! Please see CONTRIBUTING.md

## Support

- **Documentation**: https://github.com/yourusername/ctrader-open-api/docs
- **Issues**: https://github.com/yourusername/ctrader-open-api/issues
- **Discussions**: https://github.com/yourusername/ctrader-open-api/discussions
- **Discord**: Join our community server

## Disclaimer

This SDK is for educational and trading purposes. Always test thoroughly on demo accounts before trading with real money. Use at your own risk.
