import 'dotenv/config';
import { CTraderClient } from '../index';

async function main() {
  const client = new CTraderClient({
    clientId: process.env.CTRADER_CLIENT_ID ?? '',
    clientSecret: process.env.CTRADER_CLIENT_SECRET ?? '',
    environment: (process.env.CTRADER_ENV as any) ?? 'demo'
  });

  try {
    console.log('connecting...');
    await client.connect();
    console.log('connected');

    // authorize application first
    const appTokens = await client.applicationAuth();
    console.log('app auth ok');

    const accessToken = process.env.CTRADER_ACCESS_TOKEN;
    const accountIdRaw = process.env.CTRADER_ACCOUNT_ID;

    if (!accessToken || !accountIdRaw) {
      console.error('Missing CTRADER_ACCESS_TOKEN or CTRADER_ACCOUNT_ID');
      return;
    }

    const accountId = Number(accountIdRaw);

    // Try account authorization
    try {
      await client.accountAuth(accountId, accessToken);
      console.log('accountAuth succeeded for', accountId);

      const info = await client.getAccountInfo();
      console.log('Account info:', info);

      // List available symbols to verify symbol names for this account
      try {
        const symbols = await client.getAllSymbols();
        console.log('Symbols (sample):', symbols.slice(0, 10).map(s => ({ id: s.symbolId, name: s.name, display: s.displayName })));
        const find1 = symbols.find(s => s.name === 'EURUSD' || s.name === 'EUR/USD' || s.symbolId === 1);
        console.log('EURUSD found:', !!find1, find1 ? { id: find1.symbolId, name: find1.name } : null);
      } catch (e) {
        console.warn('getAllSymbols failed:', e);
      }

      // price test (using symbol name)
      try {
        const price = await client.getCurrentPrice('EURUSD');
        console.log('EURUSD', price.bid, price.ask);
      } catch (e) {
        console.warn('getCurrentPrice failed:', e);
      }

      // try subscription
      try {
        await client.subscribeToSymbols(['EURUSD']);
        client.onSpotEvent((s) => console.log('spot:', s.symbol, s.bid, s.ask));
        await new Promise(r => setTimeout(r, 5000));
        await client.unsubscribeFromSymbols(['EURUSD']);
      } catch (e) {
        console.warn('subscribe/unsubscribe failed:', e);
      }
    } catch (e) {
      console.error('accountAuth / subsequent operations failed:', e);
    }
  } catch (err) {
    console.error('demo error:', err);
  } finally {
    await client.disconnect();
  }
}

main().catch(e => console.error(e));