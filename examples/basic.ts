import 'dotenv/config';
import { CTraderClient, AccountInfo, Spot } from '../index';

async function main() {
  const client = new CTraderClient({
    clientId: process.env.CTRADER_CLIENT_ID ?? '',
    clientSecret: process.env.CTRADER_CLIENT_SECRET ?? '',
    environment: (process.env.CTRADER_ENV as any) ?? 'demo'
  });

  try {
    await client.connect();
    console.log('connected');

    const tokens = await client.applicationAuth();
    console.log('received tokens (trimmed):', { accessToken: tokens.accessToken?.slice(0, 8) });

    const accounts = await client.getAccountsByToken(tokens.accessToken);
    console.log('accounts:', accounts.map((a: AccountInfo) => ({ id: a.ctidTraderAccountId, balance: a.balance })));

    // If you have an account ID you can `await client.accountAuth(accountId, tokens.accessToken)`

    // Subscribe to price updates
    client.onSpotEvent((s: Spot) => console.log('spot event', s));
  } catch (err) {
    console.error('example error', err);
  }
}

main().catch(e => console.error(e));
