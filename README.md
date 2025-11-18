# Solana Swap with 0slot Integration

A React application for executing token swaps on Solana blockchain by fetching swap transactions from an endpoint and executing them using 0slot setup.

## Features

- 🔐 Solana wallet connection (Phantom, Solflare)
- 🔄 Token swap functionality
- 📡 Fetch swap transactions from API endpoints (Jupiter API)
- ⚡ Execute swaps using 0slot integration
- 🎨 Modern, responsive UI

## Installation

```bash
npm install
```

## Development

Start the development server:

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Usage

1. **Connect Your Wallet**: Click the wallet button in the header to connect your Solana wallet (Phantom, Solflare, etc.)

2. **Configure Swap Parameters**:
   - **Swap Quote API Endpoint**: The endpoint that provides swap quotes and transactions (default: Jupiter v6 API)
   - **0slot Execution Endpoint**: Pre-configured to use `http://de1.0slot.trade/?api-key=a403faee1e7e4d9a81a3907a52cb7952` (read-only)
   - **Input Token Mint**: The mint address of the token you want to swap from
   - **Output Token Mint**: The mint address of the token you want to swap to
   - **Amount**: The amount to swap (in SOL if swapping from SOL)
   - **Slippage Tolerance**: Maximum acceptable slippage percentage

3. **Execute Swap**: Click "Execute Swap" to:
   - Fetch the swap quote from Jupiter API
   - Get the swap transaction from Jupiter
   - Sign the transaction with your wallet
   - Execute it using 0slot endpoint

## Configuration

### Swap Endpoint

The app uses Jupiter v6 API by default:
1. **Quote API**: `https://quote-api.jup.ag/v6/quote` - Gets swap quotes
2. **Swap API**: `https://quote-api.jup.ag/v6/swap` - Gets the actual swap transaction

The app automatically handles the two-step process (quote → swap transaction).

### 0slot Endpoint

The app is configured to use the 0slot endpoint for all transaction execution:
- **Endpoint**: `http://de1.0slot.trade/?api-key=a403faee1e7e4d9a81a3907a52cb7952`
- The signed transaction is sent to this endpoint via POST request
- The endpoint should return the transaction signature

The 0slot endpoint accepts:
```json
{
  "transaction": "base64_encoded_signed_transaction"
}
```

And returns:
```json
{
  "signature": "transaction_signature"
}
```

## Example Swap Parameters

- **Input Mint (SOL)**: `So11111111111111111111111111111111111111112`
- **Output Mint (USDC)**: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`
- **Output Mint (USDT)**: `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB`

## Network

The app is configured to use Solana Mainnet by default. You can change this in `src/utils/walletProvider.jsx`:

```javascript
const network = WalletAdapterNetwork.Mainnet; // or Devnet, Testnet
```

## Dependencies

- `@solana/web3.js` - Solana blockchain interaction
- `@solana/wallet-adapter-react` - Wallet connection
- `@solana/wallet-adapter-react-ui` - Wallet UI components
- `@solana/wallet-adapter-wallets` - Wallet adapters
- `buffer` - Buffer polyfill for browser compatibility

## Build

Build for production:

```bash
npm run build
```

## License

MIT
# 0-slot-integration
