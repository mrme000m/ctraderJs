# cTrader OpenAPI SDK - Architecture & Design Documentation

## Overview

This SDK provides a **modern, type-safe, intuitive abstraction** over the cTrader Open API, eliminating the complexity of Protocol Buffers while maintaining full functionality and performance.

## Key Design Principles

1. **Abstraction**: Hide Protocol Buffer complexity behind clean TypeScript interfaces
2. **Type Safety**: Full TypeScript support with comprehensive type definitions
3. **Developer Experience**: Intuitive method names matching user intentions
4. **Performance**: Automatic rate limiting, connection pooling, efficient queuing
5. **Resilience**: Auto-reconnection, error handling, retry logic
6. **Event-Driven**: Modern async/await with optional event subscriptions
7. **Zero Dependencies**: Minimal external dependencies (only WebSocket polyfill if needed)

## Architecture Layers

```
┌────────────────────────────────────────────────────┐
│         User Application Layer                     │
│  (Trading bots, analytics, dashboards)             │
└────────────────────────────────────────────────────┘
                      ↓
┌────────────────────────────────────────────────────┐
│         Public API Layer (CTraderClient)           │
│  - Account management                              │
│  - Trading (orders, positions)                      │
│  - Market data                                      │
│  - Historical data                                  │
│  - Risk management                                  │
└────────────────────────────────────────────────────┘
                      ↓
┌────────────────────────────────────────────────────┐
│         Logic Layers                               │
│  - Rate Limiting                                    │
│  - Message Handling                                 │
│  - Event Management                                 │
│  - State Management                                 │
│  - Error Handling                                   │
└────────────────────────────────────────────────────┘
                      ↓
┌────────────────────────────────────────────────────┐
│         Transport Layer                            │
│  - WebSocket connection                            │
│  - Message serialization (protobuf)                │
│  - Protocol handling                               │
└────────────────────────────────────────────────────┘
                      ↓
┌────────────────────────────────────────────────────┐
│         cTrader Backend API                        │
│  (Proto messages, real-time feeds)                 │
└────────────────────────────────────────────────────┘
```

## Component Architecture

### 1. Client Core (CTraderClient)

**Responsibilities:**
- Connection lifecycle management
- Authentication orchestration
- Public API surface
- State management
- Event dispatching

**Key Methods:**
```
Connection:
  - connect()
  - disconnect()
  - getVersion()

Authentication:
  - applicationAuth()
  - accountAuth()
  - refreshToken()
  - getAccountsByToken()

Account:
  - getAccountInfo()
  - getCtidProfile()
  - getExpectedMargin()
  - getDynamicLeverage()

Subscriptions:
  - subscribeToSymbols()
  - unsubscribeFromSymbols()
  - subscribeLiveTrendbars()
  - subscribeMarginEvents()
  - subscribeExecutionEvents()

Data Retrieval:
  - getAllSymbols()
  - getCandles()
  - getDeals()
  - getAllPositions()
  - getAllPendingOrders()
```

### 2. Rate Limiter

**Responsibilities:**
- Enforce API rate limits
- Queue requests beyond limits
- Handle real-time vs historical rate limits

**Implementation:**
```typescript
class RateLimiter {
  executeRealTime<T>(fn: () => Promise<T>): Promise<T>
  executeHistorical<T>(fn: () => Promise<T>): Promise<T>
}
```

**Limits:**
- Real-time API: 50 requests/sec
- Historical API: 5 requests/sec

### 3. Message Handler

**Responsibilities:**
- Protocol Buffers serialization/deserialization
- Request/response correlation
- Timeout management
- Message dispatching

**Implementation:**
```typescript
class MessageHandler {
  sendMessage(payload: any, timeout?: number): Promise<any>
  handleIncomingMessage(message: any): void
  setOnMessage(callback: (message: any) => void): void
}
```

### 4. Event System

**Responsibilities:**
- Manage event subscriptions
- Type-safe event handling
- Event emission and routing

**Events:**
- Connection: connected, disconnected, reconnect-failed
- Prices: spot, depth
- Trading: execution, order-error
- Account: margin-changed, trader-updated, margin-call
- Technical: symbol-changed, trailing-sl-changed

**Implementation:**
```typescript
// Subscribe
client.onSpotEvent((spot) => {});
client.onExecutionEvent((exec) => {});

// Unsubscribe
client.offSpotEvent(handler);

// Internal
client.emit('event-name', data);
```

### 5. Type System

**Type Categories:**

```typescript
// Enums
enum Environment { DEMO, LIVE }
enum OrderSide { BUY, SELL }
enum OrderType { MARKET, LIMIT, STOP, STOP_LIMIT, MARKET_RANGE }
enum Timeframe { M1, M5, M15, M30, H1, H4, D1, W1, MN }

// Core Interfaces
interface AccountInfo { ... }
interface Position { ... }
interface PendingOrder { ... }
interface Deal { ... }
interface Symbol { ... }
interface Candle { ... }
interface Spot { ... }

// Configuration
interface CTraderConfig { ... }

// Request/Response
interface PlaceOrderParams { ... }
interface AuthTokens { ... }
```

### 6. Error Handling

**Error Hierarchy:**
```
Error
├── CTraderError
│   ├── AuthenticationError
│   └── RateLimitError
├── NetworkError
└── ValidationError
```

**Error Strategy:**
- Specific exception types for different failure modes
- Error codes from cTrader API mapped to descriptive messages
- Automatic retry for transient failures
- Validation before sending (client-side)

### 7. Utility Functions

**Categories:**

```typescript
// Normalization
normalizePrice(value: number): number
denormalizePrice(value: number): number
normalizeVolume(value: number): number
denormalizeVolume(value: number): number
normalizeMoney(value: number, exponent: number): number

// Validation
validateOrderParams(params: PlaceOrderParams): boolean

// Calculation
calculatePositionValue(params: {...}): number

// Resolution
getSymbolId(client: CTraderClient, name: string): Promise<number | null>
getAssetId(client: CTraderClient, name: string): Promise<number | null>
```

## Data Flow Examples

### Order Placement Flow

```
User Code
    ↓
placeMarketOrder(params)
    ↓
validateOrderParams() → throws if invalid
    ↓
rateLimiter.executeRealTime()
    ↓
messageHandler.sendMessage()
    ↓
WebSocket.send(serialized protobuf)
    ↓
[cTrader Backend processes]
    ↓
WebSocket.onmessage()
    ↓
messageHandler.handleIncomingMessage()
    ↓
correlate with pending request
    ↓
resolve Promise with response
    ↓
return to user
```

### Real-time Price Update Flow

```
WebSocket.onmessage() receives spot data
    ↓
messageHandler.handleIncomingMessage()
    ↓
extract SpotEvent from message
    ↓
emit('spot', event)
    ↓
iterate all registered handlers
    ↓
client.onSpotEvent(handler) → handler called
    ↓
handler processes spot data
```

### Authentication Flow

```
client.connect()
    ↓
establish WebSocket connection
    ↓
client.applicationAuth()
    ↓
send ProtoOAApplicationAuthReq
    ↓
receive tokens (access + refresh)
    ↓
client.getAccountsByToken(accessToken)
    ↓
receive list of accessible accounts
    ↓
client.accountAuth(accountId, accessToken)
    ↓
select account for trading
    ↓
ready for trading operations
```

## State Management

### Connection State

```
┌─────────────┐
│ DISCONNECTED│
└─────────────┘
      ↓
┌──────────────┐
│  CONNECTING  │
└──────────────┘
      ↓
┌──────────────┐
│  CONNECTED   │ ←──┐
└──────────────┘    │
      ↓             │
┌──────────────┐    │
│ DISCONNECTED │────┘
└──────────────┘
```

### Authentication State

```
┌─────────────────┐
│ NOT_AUTHENTICATED│
└─────────────────┘
      ↓
┌──────────────────────┐
│ APP_AUTHENTICATED    │
└──────────────────────┘
      ↓
┌──────────────────────┐
│ ACCOUNT_AUTHENTICATED│
└──────────────────────┘
```

## Performance Considerations

### Memory Management

1. **Event Handler Cleanup**: Always remove unused handlers to prevent memory leaks
2. **Subscription Cleanup**: Unsubscribe from feeds not needed
3. **Message Pooling**: Reuse message buffers (for protobuf optimization)
4. **Connection Reuse**: Single client instance for all operations

### CPU Optimization

1. **Rate Limiting**: Prevents API overload
2. **Message Batching**: Group related requests
3. **Event Throttling**: Aggregate high-frequency events
4. **Lazy Loading**: Fetch data on-demand rather than proactively

### Network Optimization

1. **WebSocket**: Binary protocol, lower overhead than REST
2. **Connection Persistence**: Keep single long-lived connection
3. **Message Compression**: Protocol Buffers are compact
4. **Batch Requests**: Multiple operations per round-trip (when possible)

## Testing Strategy

### Unit Tests

```typescript
// Test error classes
describe('Error Handling', () => {
  test('CTraderError with code', () => {
    const error = new CTraderError('TEST_ERROR', 'Test message');
    expect(error.code).toBe('TEST_ERROR');
  });
});

// Test utilities
describe('Normalization', () => {
  test('normalizePrice', () => {
    expect(normalizePrice(110500)).toBe(1.10500);
  });
});
```

### Integration Tests

```typescript
// Test with mock WebSocket
describe('Client Authentication', () => {
  test('applicationAuth flow', async () => {
    const client = new CTraderClient({...});
    // Mock WebSocket responses
    const tokens = await client.applicationAuth();
    expect(tokens.accessToken).toBeDefined();
  });
});
```

### End-to-End Tests

```typescript
// Test with demo account
describe('Live Trading', () => {
  test('place and cancel order', async () => {
    const client = new CTraderClient({
      environment: Environment.DEMO,
      ...
    });
    
    await client.connect();
    const order = await client.placeMarketOrder({...});
    await client.cancelPendingOrder(order.orderId);
    await client.disconnect();
  });
});
```

## Extension Points

### Custom Rate Limiter

```typescript
class CustomRateLimiter extends RateLimiter {
  async executeRealTime<T>(fn: () => Promise<T>): Promise<T> {
    // Custom logic
    return super.executeRealTime(fn);
  }
}
```

### Custom Event Handler

```typescript
class LoggingClient extends CTraderClient {
  private setupLogging() {
    this.onSpotEvent((spot) => {
      logger.debug('Spot update', { spot });
    });
  }
}
```

### Custom Validation

```typescript
function validateOrderParamsStrict(params: PlaceOrderParams) {
  validateOrderParams(params); // Base validation
  
  // Custom validation
  if (params.volume > MAX_POSITION_SIZE) {
    throw new ValidationError('Position size exceeds limit');
  }
}
```

## Migration Path from Prototype

For those migrating from the Spotware Python SDK:

```python
# Old: Python SDK
client = Client(host, port, TcpProtocol)
client.setConnectedCallback(on_connected)
deferred = client.send(ProtoOAApplicationAuthReq(...))
deferred.addCallbacks(on_success, on_error)
```

```typescript
// New: TypeScript SDK
const client = new CTraderClient({clientId, clientSecret});
client.onConnected(() => on_connected());
const response = await client.applicationAuth();
```

## Performance Benchmarks

### Expected Performance (Demo Account)

- **Connection Time**: 500ms - 2s
- **Authentication**: 200ms - 500ms
- **Order Placement**: 100ms - 500ms
- **Account Info**: 100ms - 300ms
- **Candle Fetch (100 bars)**: 200ms - 1s
- **Real-time Price Update Latency**: 50ms - 200ms

### Scalability

- **Concurrent Connections**: Limited by client hardware/OS
- **Symbols Subscribed**: 1000+ (depends on account)
- **Pending Orders**: Typically <100 per account
- **Open Positions**: Typically <100 per account

## Security Considerations

1. **Credentials**: Never commit clientId/clientSecret in code
2. **Tokens**: Store in secure storage (not localStorage in browser)
3. **HTTPS/WSS**: Always use encrypted connections
4. **Rate Limiting**: Prevents brute force attacks
5. **Input Validation**: Client-side validation prevents malformed requests
6. **SSL Pinning**: Optional for production (verify certs)

## Monitoring & Observability

### Metrics to Track

```typescript
{
  connectionSuccessRate: number;
  orderExecutionRate: number;
  averageLatency: number;
  errorRate: number;
  rateLimit: {
    realTimeUsage: number;   // 0-50 req/s
    historicalUsage: number; // 0-5 req/s
  };
}
```

### Logging Points

```typescript
client.onConnected(() => logger.info('Connected'));
client.onDisconnected(() => logger.warn('Disconnected'));
client.onOrderError((error) => logger.error('Order failed', error));
client.onExecutionEvent((exec) => logger.info('Trade executed', exec));
```

## Future Enhancements

1. **Browser Support**: Webworker for long-running operations
2. **Offline Queue**: Cache orders while offline
3. **Order Templates**: Pre-configured order templates
4. **Strategy Framework**: Built-in strategy execution
5. **backtesting**: Local backtesting engine
6. **ML Integration**: Feature extraction for ML models
7. **Advanced Analytics**: Built-in technical indicators
8. **Copy Trading**: Easy copy trading functionality
9. **Social Features**: Trade sharing and following
10. **Mobile Support**: React Native SDK variant

## Conclusion

This SDK provides a modern, intuitive, and performant way to interact with cTrader Open API from JavaScript/TypeScript applications. It abstracts away Protocol Buffers complexity while maintaining full functionality and adding helpful features like automatic rate limiting, error handling, and type safety.

The architecture is extensible, allowing custom implementations while maintaining core functionality. The design prioritizes developer experience without sacrificing performance or reliability.
