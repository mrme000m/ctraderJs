# Examples

This folder contains minimal example scripts showing how to use `@mrme000m/ctraderjs`.

## Basic example

- `basic.ts` demonstrates connecting, authenticating the application, listing accounts, and subscribing to spot events.

## Environment

Create a `.env` file with the following values for interactive testing (use demo credentials and accounts when possible):

```
CTRADER_CLIENT_ID=your_client_id
CTRADER_CLIENT_SECRET=your_client_secret
CTRADER_ENV=demo
```

Run the example with a TypeScript runner (e.g., `ts-node`) after installing dev dependencies:

```bash
npm run build
node build/examples/basic.js
```

Note: running these examples requires network access and valid cTrader Open API credentials.
