import * as assert from 'assert';
import { CTraderClient, CTraderError, Environment } from '../../ctrader-sdk-impl';

async function run() {
  const client = new CTraderClient({ environment: Environment.DEMO, clientId: 'test', clientSecret: 'test' });

  // Inject a cached symbol list to avoid network calls
  const mockSymbols = [
    // Name present
    { symbolId: 1, symbolName: 'EURUSD', description: 'Euro vs US Dollar' },
    // No name, description-only match candidate
    { symbolId: 10, symbolName: 'EURX', description: 'Euro vs US Dollar' },
    { symbolId: 2, symbolName: 'XAUUSD-F', description: 'Gold - Forward' },
    { symbolId: 3, symbolName: 'GBPUSD', description: 'British Pound vs US Dollar' },
    { symbolId: 4, symbolName: 'AAPL.US-24', description: 'Apple Inc (24 Hours)' },
    // Add description-only candidates for other currencies
    { symbolId: 11, symbolName: 'CNX', description: 'US Dollar vs Chinese Yuan' },
    { symbolId: 12, symbolName: 'USX', description: 'US Dollar vs Indian Rupee' }
  ];

  // Inject a cached symbol list and bypass network/auth checks by stubbing getAllSymbols
  (client as any).getAllSymbols = async (forceRefresh = false) => mockSymbols;
  // Exact match
  const eur = await client.getSymbolIdByName('EURUSD');
  assert.strictEqual(eur, 1, 'EURUSD should map to id 1');

  // Variant with slash
  const eur2 = await client.getSymbolIdByName('EUR/USD');
  assert.strictEqual(eur2, 1, 'EUR/USD should map to id 1');

  // Description-only match (no exact name) should succeed (EURUSD matches EURX by description)
  const eurDesc = await client.getSymbolIdByName('EURUSD');
  assert.strictEqual(eurDesc, 1, 'EURUSD should prefer the exact name (id 1)');
  // But if exact name missing, description match should still find a symbol
  // Remove exact EURUSD from symbols and ensure description match picks EURX (id 10)
  const mockNoName = mockSymbols.filter(s => s.symbolId !== 1);
  (client as any).getAllSymbols = async () => mockNoName;
  const eurDesc2 = await client.getSymbolIdByName('EURUSD');
  assert.strictEqual(eurDesc2, 10, 'EURUSD should match description-only symbol EURX -> id 10');

  // Description match for other currencies (USDCNY via description-only CNX)
  (client as any).getAllSymbols = async () => mockSymbols; // restore
  const cny = await client.getSymbolIdByName('USDCNY');
  assert.strictEqual(cny, 11, 'USDCNY should match description-only CNX -> id 11');

  // Variant forms e.g. USD/RMB should match too
  const cny2 = await client.getSymbolIdByName('USD/RMB');
  assert.strictEqual(cny2, 11, 'USD/RMB should match description-only CNX -> id 11');

  // INR description match
  const inr = await client.getSymbolIdByName('USDINR');
  assert.strictEqual(inr, 12, 'USDINR should match description-only USX -> id 12');

  // Forward suffix should be normalized
  const xau = await client.getSymbolIdByName('XAUUSD');
  assert.strictEqual(xau, 2, 'XAUUSD should match XAUUSD-F -> id 2');

  // Full token with suffix
  const aapl = await client.getSymbolIdByName('AAPL.US-24');
  assert.strictEqual(aapl, 4, 'AAPL.US-24 should map to id 4');

  // Tiny typo/fuzzy match (GBUSD -> GBPUSD)
  const gb = await client.getSymbolIdByName('GBUSD');
  assert.strictEqual(gb, 3, 'GBUSD should fuzzy-match GBPUSD -> id 3');

  // Not found should throw and suggest candidates
  let thrown = false;
  try {
    await client.getSymbolIdByName('NONEXISTENT');
  } catch (e: any) {
    thrown = true;
    assert.ok(e instanceof CTraderError, 'Should throw CTraderError for missing symbol');
    assert.ok(/candidates:/i.test(String(e.message)), 'Error message should include candidate suggestions');
  }
  assert.ok(thrown, 'Expected missing symbol to throw');

  console.log('All symbol matching tests passed');
}

run().catch((err) => {
  console.error('Tests failed:', err);
  process.exit(1);
});
