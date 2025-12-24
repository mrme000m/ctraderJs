// @ts-nocheck
// ============================================================================
// cTrader OpenAPI SDK - Complete Usage Examples
// ============================================================================

import {
  CTraderClient,
  Environment,
  OrderSide,
  Timeframe,
  normalizePrice,
  denormalizePrice,
  normalizeVolume,
  denormalizeVolume,
  validateOrderParams,
  getSymbolId,
  getAssetId,
  AuthenticationError,
  ValidationError,
  CTraderError
} from 'ctrader-open-api';

// ============================================================================
// EXAMPLE 1: BASIC CONNECTION & AUTHENTICATION
// ============================================================================

async function exampleBasicConnection() {
  // Initialize client with configuration
  const client = new CTraderClient({
    clientId: 'your_client_id_here',
    clientSecret: 'your_client_secret_here',
    environment: Environment.DEMO,
    protocol: 'websocket',
    autoReconnect: true,
    timeout: 5000
  });

  try {
    // Connect to cTrader backend
    console.log('Connecting to cTrader...');
    await client.connect();
    console.log('Connected!');

    // Authenticate application
    console.log('Authenticating application...');
    const tokens = await client.applicationAuth();
    console.log('App authenticated. Access token:', tokens.accessToken);

    // Get list of accounts accessible with token
    const accounts = await client.getAccountsByToken(tokens.accessToken);
    console.log('Available accounts:', accounts.length);
    accounts.forEach(acc => {
      console.log(`  - Account ID: ${acc.ctidTraderAccountId}, Balance: ${acc.balance}`);
    });

    // Select first account for trading
    if (accounts.length > 0) {
      const accountId = accounts[0].ctidTraderAccountId;
      await client.accountAuth(accountId, tokens.accessToken);
      console.log(`Trading with account ${accountId}`);
    }

    // Get API version
    const version = await client.getVersion();
    console.log(`API Version: ${version.apiVersion} (Build ${version.build})`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Gracefully disconnect
    await client.disconnect();
    console.log('Disconnected');
  }
}

// ============================================================================
// EXAMPLE 2: ACCOUNT INFORMATION & MONITORING
// ============================================================================

async function exampleAccountInfo(client: CTraderClient) {
  try {
    // Get comprehensive account information
    const accountInfo = await client.getAccountInfo();
    
    console.log('=== ACCOUNT INFORMATION ===');
    console.log(`Balance:          $${accountInfo.balance.toFixed(2)}`);
    console.log(`Equity:           $${accountInfo.equity.toFixed(2)}`);
    console.log(`Free Margin:      $${accountInfo.availableMargin.toFixed(2)}`);
    console.log(`Used Margin:      $${accountInfo.usedMargin.toFixed(2)}`);
    console.log(`Margin Level:     ${(accountInfo.marginLevel * 100).toFixed(2)}%`);
    console.log(`Unrealized P&L:   $${accountInfo.unrealizedPnl.toFixed(2)}`);
    console.log(`Leverage:         1:${accountInfo.leverage}`);
    console.log(`Currency:         ${accountInfo.currency}`);
    console.log(`Account Type:     ${accountInfo.accountType}`);
    console.log(`Limited Risk:     ${accountInfo.limitedRisk ? 'Yes' : 'No'}`);

    // Get trader profile (GDPR limited)
    const profile = await client.getCtidProfile();
    console.log('\n=== TRADER PROFILE ===');
    console.log(`cTID:             ${profile.ctid}`);
    if (profile.firstName) console.log(`Name:             ${profile.firstName} ${profile.lastName}`);
    if (profile.country) console.log(`Country:          ${profile.country}`);

    // Get unrealized PnL
    const unrealizedPnl = await client.getPositionUnrealizedPnl();
    console.log(`\nTotal Unrealized P&L: $${unrealizedPnl.toFixed(2)}`);

  } catch (error) {
    if (error instanceof CTraderError) {
      console.error(`API Error: ${error.code} - ${error.message}`);
    } else {
      console.error('Error:', error);
    }
  }
}

// ============================================================================
// EXAMPLE 3: REAL-TIME PRICE DATA & SUBSCRIPTIONS
// ============================================================================

async function exampleRealTimeData(client: CTraderClient) {
  try {
    // Subscribe to real-time price updates
    const symbols = ['EURUSD', 'GBPUSD', 'USDJPY', 'GOLD'];
    console.log(`Subscribing to ${symbols.length} symbols...`);
    await client.subscribeToSymbols(symbols);

    // Set up real-time price event handler
    client.onSpotEvent((spot) => {
      console.log(`${spot.symbol}: Bid ${spot.bid}, Ask ${spot.ask}`);
    });

    // Get current price on demand
    const spot = await client.getCurrentPrice('EURUSD');
    console.log(`\nCurrent EURUSD: ${spot.bid} / ${spot.ask}`);
    console.log(`Bid Volume: ${spot.bidVolume}, Ask Volume: ${spot.askVolume}`);

    // Subscribe to depth of market (order book)
    await client.subscribeToDepthQuotes('EURUSD');
    
    client.onDepthEvent((depth) => {
      console.log(`\n${depth.symbol} Order Book:`);
      console.log('BID SIDE:');
      depth.bids.slice(0, 5).forEach(bid => {
        console.log(`  ${bid.price.toFixed(5)} x ${bid.volume}`);
      });
      console.log('ASK SIDE:');
      depth.asks.slice(0, 5).forEach(ask => {
        console.log(`  ${ask.price.toFixed(5)} x ${ask.volume}`);
      });
    });

    // Keep subscriptions active
    await new Promise(r => setTimeout(r, 10000)); // 10 seconds

    // Cleanup
    await client.unsubscribeFromSymbols(symbols);
    await client.unsubscribeFromDepthQuotes('EURUSD');
    console.log('Unsubscribed from updates');

  } catch (error) {
    console.error('Error:', error);
  }
}

// ============================================================================
// EXAMPLE 4: MARKET DATA & SYMBOLS
// ============================================================================

async function exampleMarketData(client: CTraderClient) {
  try {
    // Get all available trading symbols
    console.log('Fetching all available symbols...');
    const allSymbols = await client.getAllSymbols();
    console.log(`Total symbols: ${allSymbols.length}`);

    // Filter and display some symbols
    const forexSymbols = allSymbols.filter(s => s.assetClass === 'Forex').slice(0, 5);
    console.log('\nFOREX SYMBOLS:');
    forexSymbols.forEach(sym => {
      console.log(`  ${sym.name}: ${sym.description}`);
      console.log(`    Digits: ${sym.digits}, Pip Position: ${sym.pipPosition}`);
    });

    // Get detailed symbol information
    const eurusdId = allSymbols.find(s => s.name === 'EURUSD')?.symbolId;
    if (eurusdId) {
      const details = await client.getSymbolDetails(eurusdId);
      console.log(`\n${details.name} DETAILS:`);
      console.log(`  Min Volume:       ${details.minVolume} lots`);
      console.log(`  Max Volume:       ${details.maxVolume} lots`);
      console.log(`  Step Volume:      ${details.stepVolume} lots`);
      console.log(`  Spread (Raw):     ${details.spreadRaw}`);
      console.log(`  Commission/Lot:   ${details.commissionPerLot}`);
      console.log(`  Session Start:    ${details.sessionStart}`);
      console.log(`  Session End:      ${details.sessionEnd}`);
    }

    // Get assets and asset classes
    const assets = await client.getAssets();
    console.log(`\nTotal Assets: ${assets.length}`);
    
    const assetClasses = await client.getAssetClasses();
    console.log(`Asset Classes: ${assetClasses.map(ac => ac.name).join(', ')}`);

  } catch (error) {
    console.error('Error:', error);
  }
}

// ============================================================================
// EXAMPLE 5: HISTORICAL DATA - CANDLES & TRENDS
// ============================================================================

async function exampleHistoricalData(client: CTraderClient) {
  try {
    // Get last 100 hourly candles
    console.log('Fetching EURUSD H1 candles...');
    const candles = await client.getCandles({
      symbol: 'EURUSD',
      timeframe: Timeframe.H1,
      count: 100
    });

    console.log(`Retrieved ${candles.length} candles`);
    
    // Calculate technical indicators
    const lastCandle = candles[candles.length - 1];
    console.log('\nLast Candle (H1):');
    console.log(`  Open:  ${lastCandle.open.toFixed(5)}`);
    console.log(`  High:  ${lastCandle.high.toFixed(5)}`);
    console.log(`  Low:   ${lastCandle.low.toFixed(5)}`);
    console.log(`  Close: ${lastCandle.close.toFixed(5)}`);
    console.log(`  Volume: ${lastCandle.volume.toFixed(2)} lots`);

    // Simple Moving Average
    const sma = calculateSMA(candles, 20);
    console.log(`\n20-Period SMA: ${sma.toFixed(5)}`);

    // Get candles for specific date range
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 7); // Last 7 days
    const toDate = new Date();

    console.log(`\nFetching candles from ${fromDate.toDateString()} to ${toDate.toDateString()}...`);
    const rangeCandles = await client.getCandlesByDate({
      symbol: 'EURUSD',
      timeframe: Timeframe.D1,
      fromDate,
      toDate,
      maxCandles: 100
    });
    
    console.log(`Retrieved ${rangeCandles.length} daily candles`);

    // Get tick data for analysis
    const tickData = await client.getTickData({
      symbol: 'EURUSD',
      count: 1000
    });
    console.log(`Retrieved ${tickData.length} tick records`);

    // Subscribe to live candles
    await client.subscribeLiveTrendbars('EURUSD', Timeframe.M5);
    console.log('Subscribed to live M5 candles');

  } catch (error) {
    console.error('Error:', error);
  }
}

// Helper function to calculate Simple Moving Average
function calculateSMA(candles: any[], period: number): number {
  const closes = candles.slice(-period).map(c => c.close);
  return closes.reduce((a, b) => a + b) / period;
}

// ============================================================================
// EXAMPLE 6: PLACE ORDERS - ALL TYPES
// ============================================================================

async function examplePlaceOrders(client: CTraderClient) {
  try {
    // Example 1: MARKET ORDER
    console.log('=== MARKET ORDER ===');
    const marketOrder = await client.placeMarketOrder({
      symbol: 'EURUSD',
      volume: 1.0, // 1 lot
      side: OrderSide.BUY,
      stopLoss: 1.0800,
      takeProfit: 1.1050,
      slippage: 10, // Maximum 10 pips slippage
      label: 'MY_MARKET',
      comment: 'Quick entry on break'
    });
    console.log('Market order placed:', marketOrder.orderId);

    // Example 2: LIMIT ORDER
    console.log('\n=== LIMIT ORDER ===');
    const limitOrder = await client.placeLimitOrder({
      symbol: 'EURUSD',
      volume: 2.0,
      side: OrderSide.BUY,
      orderPrice: 1.0750, // Buy at specific price
      stopLoss: 1.0700,
      takeProfit: 1.0950,
      label: 'MY_LIMIT',
      comment: 'Buy on dip',
      expiration: new Date(Date.now() + 24 * 60 * 60 * 1000) // Expires in 24h
    });
    console.log('Limit order placed:', limitOrder.orderId);

    // Example 3: STOP ORDER
    console.log('\n=== STOP ORDER ===');
    const stopOrder = await client.placeStopOrder({
      symbol: 'EURUSD',
      volume: 1.5,
      side: OrderSide.SELL,
      orderPrice: 1.1200, // Sell if price goes above this
      stopLoss: 1.1300,
      takeProfit: 1.0900,
      label: 'MY_STOP',
      comment: 'Sell on break above resistance'
    });
    console.log('Stop order placed:', stopOrder.orderId);

    // Example 4: STOP-LIMIT ORDER
    console.log('\n=== STOP-LIMIT ORDER ===');
    const stopLimitOrder = await client.placeStopLimitOrder({
      symbol: 'EURUSD',
      volume: 1.0,
      side: OrderSide.SELL,
      stopPrice: 1.1150, // Trigger price
      orderPrice: 1.1140, // Limit price (must be better)
      stopLoss: 1.1250,
      takeProfit: 1.0800,
      label: 'MY_STOP_LIMIT'
    });
    console.log('Stop-limit order placed:', stopLimitOrder.orderId);

    // Example 5: MODIFY PENDING ORDER
    console.log('\n=== MODIFY ORDER ===');
    await client.modifyPendingOrder(limitOrder.orderId, {
      orderPrice: 1.0760, // Change entry price
      stopLoss: 1.0710,
      takeProfit: 1.0970
    });
    console.log('Order modified');

    // Example 6: CANCEL PENDING ORDER
    console.log('\n=== CANCEL ORDER ===');
    await client.cancelPendingOrder(stopLimitOrder.orderId);
    console.log('Stop-limit order cancelled');

  } catch (error) {
    if (error instanceof ValidationError) {
      console.error('Validation Error:', error.message);
    } else if (error instanceof CTraderError) {
      console.error(`API Error: ${error.code} - ${error.message}`);
    } else {
      console.error('Error:', error);
    }
  }
}

// ============================================================================
// EXAMPLE 7: POSITION MANAGEMENT
// ============================================================================

async function examplePositionManagement(client: CTraderClient) {
  try {
    // Get all open positions
    console.log('=== OPEN POSITIONS ===');
    const positions = await client.getAllPositions();
    console.log(`Total positions: ${positions.length}`);

    positions.forEach(pos => {
      const pnlPercent = ((pos.unrealizedPnl / (pos.volume * pos.entryPrice)) * 100).toFixed(2);
      console.log(`\n${pos.symbol} (ID: ${pos.positionId})`);
      console.log(`  Side:        ${pos.side}`);
      console.log(`  Volume:      ${pos.volume.toFixed(2)} lots`);
      console.log(`  Entry:       ${pos.entryPrice.toFixed(5)}`);
      console.log(`  Current:     ${pos.currentPrice.toFixed(5)}`);
      console.log(`  Unrealized:  $${pos.unrealizedPnl.toFixed(2)} (${pnlPercent}%)`);
      if (pos.stopLoss) console.log(`  Stop Loss:   ${pos.stopLoss.toFixed(5)}`);
      if (pos.takeProfit) console.log(`  Take Profit: ${pos.takeProfit.toFixed(5)}`);
    });

    // Filter positions by symbol
    const eurusdPositions = await client.getPositionsBySymbol('EURUSD');
    console.log(`\nEURUSD Positions: ${eurusdPositions.length}`);

    // Get specific position
    if (positions.length > 0) {
      const firstPos = positions[0];
      
      // Modify stop loss and take profit
      console.log(`\nModifying position ${firstPos.positionId}...`);
      await client.modifyPositionSLTP(
        firstPos.positionId,
        firstPos.stopLoss ? firstPos.stopLoss - 0.0050 : undefined,
        firstPos.takeProfit ? firstPos.takeProfit + 0.0050 : undefined
      );
      console.log('Position modified');

      // Enable trailing stop
      console.log('Enabling trailing stop (10 pips)...');
      await client.enableTrailingStop(firstPos.positionId, 0.0010);
      console.log('Trailing stop enabled');

      // For eligible accounts, set guaranteed stop loss
      try {
        console.log('Setting guaranteed stop loss...');
        await client.setGuaranteedStopLoss(firstPos.positionId, firstPos.stopLoss || firstPos.currentPrice - 0.0100);
        console.log('Guaranteed stop loss set');
      } catch (error) {
        console.log('Guaranteed stop loss not available for this account');
      }

      // Close partial position
      console.log(`\nClosing ${firstPos.volume / 2} lots of position...`);
      await client.closePosition(firstPos.positionId, firstPos.volume / 2);
      console.log('Partial close executed');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

// ============================================================================
// EXAMPLE 8: PENDING ORDERS & ORDER HISTORY
// ============================================================================

async function exampleOrderManagement(client: CTraderClient) {
  try {
    // Get all pending orders
    console.log('=== PENDING ORDERS ===');
    const pendingOrders = await client.getAllPendingOrders();
    console.log(`Total pending: ${pendingOrders.length}`);

    pendingOrders.forEach(order => {
      console.log(`\nOrder ${order.orderId}`);
      console.log(`  Symbol:   ${order.symbol}`);
      console.log(`  Side:     ${order.side}`);
      console.log(`  Volume:   ${order.volume.toFixed(2)} lots`);
      console.log(`  Price:    ${order.orderPrice.toFixed(5)}`);
      console.log(`  Type:     ${order.orderType}`);
      console.log(`  Created:  ${order.createTime.toISOString()}`);
      if (order.expirationTime) {
        console.log(`  Expires:  ${order.expirationTime.toISOString()}`);
      }
    });

    // Filter by symbol
    const eurusdOrders = await client.getPendingOrdersBySymbol('EURUSD');
    console.log(`\nEURUSD Pending Orders: ${eurusdOrders.length}`);

    // Cancel all orders
    if (pendingOrders.length > 0) {
      console.log('\nCancelling all pending orders...');
      await client.cancelAllPendingOrders();
      console.log('All orders cancelled');
    }

    // Get deal/execution history
    console.log('\n=== DEALS HISTORY ===');
    const deals = await client.getDeals({ count: 50 });
    console.log(`Total deals: ${deals.length}`);

    deals.slice(0, 5).forEach(deal => {
      console.log(`\nDeal ${deal.dealId}`);
      console.log(`  Symbol:    ${deal.symbol}`);
      console.log(`  Side:      ${deal.side}`);
      console.log(`  Volume:    ${deal.volume.toFixed(2)} lots`);
      console.log(`  Price:     ${deal.dealPrice.toFixed(5)}`);
      console.log(`  Time:      ${deal.dealTime.toISOString()}`);
      console.log(`  Commission: $${deal.commission.toFixed(2)}`);
      console.log(`  P&L:       $${deal.pnl.toFixed(2)}`);
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

// ============================================================================
// EXAMPLE 9: EVENT-DRIVEN TRADING
// ============================================================================

async function exampleEventDrivenTrading(client: CTraderClient) {
  try {
    // Subscribe to execution events
    await client.subscribeExecutionEvents();
    console.log('Subscribed to execution events');

    // Handle order execution
    client.onExecutionEvent((execution) => {
      console.log('EXECUTION EVENT:', execution.type);
      if (execution.deal) {
        console.log(`  Deal: ${execution.deal.dealId}`);
        console.log(`  Price: ${execution.deal.dealPrice}`);
        console.log(`  Time: ${new Date(execution.deal.dealTime).toISOString()}`);
      }
    });

    // Handle order errors
    client.onOrderError((error) => {
      console.error('ORDER ERROR:', error.message);
      console.error('  Code:', error.code);
    });

    // Monitor margin changes
    await client.subscribeMarginEvents();
    console.log('Subscribed to margin events');

    client.onMarginChanged((margin) => {
      console.log(`MARGIN CHANGE: Free margin = $${margin.freeMargin}`);
      console.log(`  Used margin: $${margin.usedMargin}`);
      console.log(`  Margin level: ${(margin.marginLevel * 100).toFixed(2)}%`);
    });

    // Margin call alerts
    client.onMarginCallTriggered((call) => {
      console.error('⚠️  MARGIN CALL ALERT!');
      console.error(`  Threshold: ${call.threshold}%`);
      console.error(`  Current Margin Level: ${(call.marginLevel * 100).toFixed(2)}%`);
    });

    // Trailing stop loss updates
    client.onTrailingSLChanged((update) => {
      console.log(`TRAILING SL UPDATE: Position ${update.positionId}`);
      console.log(`  New SL: ${update.stopLoss}`);
    });

    // Connection events
    client.onConnected(() => {
      console.log('✓ Connected to cTrader');
    });

    client.onDisconnected(() => {
      console.log('✗ Disconnected from cTrader');
    });

    client.onTokenInvalidated(() => {
      console.log('⚠️  Token invalidated - need to re-authenticate');
    });

    // Keep listening
    await new Promise(r => setTimeout(r, 60000)); // 1 minute

  } catch (error) {
    console.error('Error:', error);
  }
}

// ============================================================================
// EXAMPLE 10: RISK MANAGEMENT & MARGIN MONITORING
// ============================================================================

async function exampleRiskManagement(client: CTraderClient) {
  try {
    // Get account info for margin monitoring
    const accountInfo = await client.getAccountInfo();
    console.log('=== MARGIN STATUS ===');
    console.log(`Balance:          $${accountInfo.balance.toFixed(2)}`);
    console.log(`Equity:           $${accountInfo.equity.toFixed(2)}`);
    console.log(`Free Margin:      $${accountInfo.availableMargin.toFixed(2)}`);
    console.log(`Margin Level:     ${(accountInfo.marginLevel * 100).toFixed(2)}%`);

    // Alert if margin level is low
    if (accountInfo.marginLevel < 0.50) {
      console.warn('⚠️  WARNING: Margin level is below 50%');
    }

    // Get expected margin before placing orders
    console.log('\n=== EXPECTED MARGIN CALCULATION ===');
    const expectedMargin = await client.getExpectedMargin('EURUSD', 10.0); // 10 lots
    console.log(`Expected margin for 10.0 lots EURUSD: $${expectedMargin.toFixed(2)}`);

    // Check if we have enough margin
    if (expectedMargin <= accountInfo.availableMargin) {
      console.log('✓ Sufficient margin available');
    } else {
      console.warn(`✗ Insufficient margin (need $${expectedMargin.toFixed(2)}, have $${accountInfo.availableMargin.toFixed(2)})`);
    }

    // Configure margin call alerts
    console.log('\n=== MARGIN CALL CONFIGURATION ===');
    const marginCalls = await client.getMarginCalls();
    marginCalls.forEach(call => {
      console.log(`Threshold: ${call.threshold}%, Enabled: ${call.isEnabled}`);
    });

    // Update margin call threshold
    console.log('\nUpdating margin call threshold to 70%...');
    await client.updateMarginCall(70, true);
    console.log('Margin call threshold updated');

    // Get dynamic leverage information (if available)
    try {
      const eurusdSymbols = await client.getAllSymbols();
      const eurusd = eurusdSymbols.find(s => s.name === 'EURUSD');
      if (eurusd) {
        const dynamicLeverage = await client.getDynamicLeverage(eurusd.symbolId);
        console.log('\nDynamic Leverage:', dynamicLeverage);
      }
    } catch (error) {
      console.log('Dynamic leverage not available');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

// ============================================================================
// EXAMPLE 11: TOKEN REFRESH & SESSION MANAGEMENT
// ============================================================================

async function exampleTokenManagement(client: CTraderClient) {
  try {
    // Initial authentication
    const tokens = await client.applicationAuth();
    console.log('Initial token obtained');
    console.log(`Expires in: ${tokens.expiresIn} seconds (${(tokens.expiresIn / 3600).toFixed(1)} hours)`);

    // Simulate token refresh before expiry
    const tokenRefreshInterval = (tokens.expiresIn - 60) * 1000; // 1 minute before expiry
    
    const refreshTimer = setInterval(async () => {
      try {
        console.log('Refreshing access token...');
        const newTokens = await client.refreshToken(tokens.refreshToken);
        console.log('Token refreshed successfully');
        console.log(`New token expires in: ${newTokens.expiresIn} seconds`);
        
        // Update tokens
        Object.assign(tokens, newTokens);
      } catch (error) {
        if (error instanceof AuthenticationError) {
          console.error('Token refresh failed - need to re-authenticate');
          clearInterval(refreshTimer);
        }
      }
    }, tokenRefreshInterval);

    // Cleanup
    setTimeout(() => clearInterval(refreshTimer), 60000);

  } catch (error) {
    console.error('Error:', error);
  }
}

// ============================================================================
// EXAMPLE 12: UTILITY FUNCTIONS & HELPERS
// ============================================================================

async function exampleUtilityFunctions(client: CTraderClient) {
  try {
    // Price normalization
    const protobufPrice = 110500; // From API response
    const decimalPrice = normalizePrice(protobufPrice); // = 1.10500
    const backToProtobuf = denormalizePrice(decimalPrice); // = 110500
    console.log('Price normalization:', protobufPrice, '->', decimalPrice, '->', backToProtobuf);

    // Volume normalization
    const protobufVolume = 100000; // cents
    const lots = normalizeVolume(protobufVolume); // = 1.0 lot
    const backToProtobuf2 = denormalizeVolume(lots); // = 100000
    console.log('Volume normalization:', protobufVolume, '->', lots, '->', backToProtobuf2);

    // Validate order parameters
    try {
      validateOrderParams({
        symbol: 'EURUSD',
        volume: 1.0,
        side: OrderSide.BUY,
        stopLoss: 1.0800,
        takeProfit: 1.1050
      });
      console.log('✓ Order parameters are valid');
    } catch (error) {
      console.error('✗ Invalid order parameters:', error.message);
    }

    // Get symbol ID
    const symbolId = await getSymbolId(client, 'EURUSD');
    console.log(`EURUSD Symbol ID: ${symbolId}`);

    // Get asset ID
    const assetId = await getAssetId(client, 'EUR');
    console.log(`EUR Asset ID: ${assetId}`);

    // Calculate position value
    const positionValue = await client.getAllPositions().then(positions => {
      if (positions.length > 0) {
        const pos = positions[0];
        return pos.volume * pos.currentPrice;
      }
      return 0;
    });
    console.log(`Sample position value: $${positionValue.toFixed(2)}`);

  } catch (error) {
    console.error('Error:', error);
  }
}

// ============================================================================
// EXAMPLE 13: COMPLETE TRADING BOT EXAMPLE
// ============================================================================

class SimpleTradingBot {
  private client: CTraderClient;
  private symbol = 'EURUSD';
  private maxPositions = 3;
  private stopLossPips = 20;
  private takeProfitPips = 50;

  constructor(client: CTraderClient) {
    this.client = client;
  }

  async start() {
    try {
      // Subscribe to market data
      await this.client.subscribeToSymbols([this.symbol]);
      
      // Get symbol details for pip calculation
      const symbols = await this.client.getAllSymbols();
      const symbolInfo = symbols.find(s => s.name === this.symbol);
      if (!symbolInfo) throw new Error('Symbol not found');

      const pipValue = Math.pow(10, -symbolInfo.digits);

      // Listen to price updates
      this.client.onSpotEvent(async (spot) => {
        if (spot.symbol !== this.symbol) return;

        // Check current positions
        const positions = await this.client.getPositionsBySymbol(this.symbol);
        
        if (positions.length < this.maxPositions) {
          // Simple strategy: Buy on even hours
          const hour = new Date().getHours();
          if (hour % 2 === 0) {
            await this.openPosition(spot.ask, pipValue);
          }
        }

        // Monitor positions
        for (const position of positions) {
          if (position.unrealizedPnl > position.volume * this.takeProfitPips * pipValue * 10) {
            // Close winning trade
            await this.client.closePosition(position.positionId);
            console.log(`Closed winning trade: ${position.symbol} +${position.unrealizedPnl.toFixed(2)}`);
          }
        }
      });

      // Listen to execution events
      await this.client.subscribeExecutionEvents();
      this.client.onExecutionEvent((exec) => {
        console.log('Trade executed:', exec);
      });

      console.log('Trading bot started');
      // Run indefinitely
      await new Promise(() => {});
    } catch (error) {
      console.error('Bot error:', error);
    }
  }

  private async openPosition(entryPrice: number, pipValue: number) {
    try {
      const stopLoss = entryPrice - this.stopLossPips * pipValue;
      const takeProfit = entryPrice + this.takeProfitPips * pipValue;

      await this.client.placeMarketOrder({
        symbol: this.symbol,
        volume: 1.0,
        side: OrderSide.BUY,
        stopLoss,
        takeProfit,
        label: 'BOT_TRADE'
      });

      console.log(`Position opened at ${entryPrice.toFixed(5)}`);
    } catch (error) {
      console.error('Failed to open position:', error);
    }
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  const client = new CTraderClient({
    clientId: process.env.CTRADER_CLIENT_ID || 'your_client_id',
    clientSecret: process.env.CTRADER_CLIENT_SECRET || 'your_client_secret',
    environment: Environment.DEMO
  });

  try {
    await client.connect();
    await client.applicationAuth();

    // Run examples
    // await exampleBasicConnection();
    // await exampleAccountInfo(client);
    // await exampleRealTimeData(client);
    // await exampleMarketData(client);
    // await exampleHistoricalData(client);
    // await examplePlaceOrders(client);
    // await examplePositionManagement(client);
    // await exampleOrderManagement(client);
    // await exampleEventDrivenTrading(client);
    // await exampleRiskManagement(client);
    // await exampleTokenManagement(client);
    // await exampleUtilityFunctions(client);

    // Or start trading bot
    // const bot = new SimpleTradingBot(client);
    // await bot.start();

  } catch (error) {
    console.error('Main error:', error);
  } finally {
    await client.disconnect();
  }
}

// Uncomment to run:
// main();

export {
  exampleBasicConnection,
  exampleAccountInfo,
  exampleRealTimeData,
  exampleMarketData,
  exampleHistoricalData,
  examplePlaceOrders,
  examplePositionManagement,
  exampleOrderManagement,
  exampleEventDrivenTrading,
  exampleRiskManagement,
  exampleTokenManagement,
  exampleUtilityFunctions,
  SimpleTradingBot
};
