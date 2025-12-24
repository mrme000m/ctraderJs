import 'dotenv/config';
import { CTraderClient, Spot } from '../index';

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

    const accessToken = process.env.CTRADER_ACCESS_TOKEN;
    if (accessToken) {
      console.log('using provided access token to list accounts');
      const accounts = await client.getAccountsByToken(accessToken);
      console.log('accounts count:', accounts.length);
    } else {
      console.log('no access token provided, attempting applicationAuth');
      const tokens = await client.applicationAuth();
      console.log('applicationAuth succeeded');
    }

    const accountIdRaw = process.env.CTRADER_ACCOUNT_ID;
    if (accountIdRaw && accessToken) {
      const accountId = Number(accountIdRaw);
      console.log('authorizing account id', accountId);
      await client.accountAuth(accountId, accessToken);
      console.log('accountAuth succeeded');

      const info = await client.getAccountInfo();
      console.log('account balance=%d equity=%d', info.balance, info.equity);
    }

    // Quick market data test
    try {
      const price = await client.getCurrentPrice('EURUSD');
      console.log('EURUSD price:', price.bid, price.ask);
    } catch (e) {
      console.warn('getCurrentPrice failed:', (e as Error).message);
    }

    // Subscribe to spot updates for a few seconds
    try {
      await client.subscribeToSymbols(['EURUSD']);
      client.onSpotEvent((s: Spot) => console.log('spot event:', s.symbol, s.bid, s.ask));
      await new Promise(r => setTimeout(r, 5000));
      await client.unsubscribeFromSymbols(['EURUSD']);
    } catch (e) {
      console.warn('subscribe/unsubscribe failed:', (e as Error).message);
    }

    console.log('demo completed');
  } catch (err) {
    console.error('demo error:', (err as Error).message ?? err);
  } finally {
    await client.disconnect();
  }
}

main().catch(e => console.error('uncaught demo error', e));
