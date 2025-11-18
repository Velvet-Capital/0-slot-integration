import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import SwapComponent from './components/SwapComponent';
import './App.css';

function App() {
  const { connected } = useWallet();

  return (
    <div className="app">
      <header className="app-header">
        <h1>Solana Swap with 0slot</h1>
        <div className="wallet-button-container">
          <WalletMultiButton />
        </div>
      </header>

      <main className="app-main">
        {connected ? (
          <SwapComponent />
        ) : (
          <div className="connect-prompt">
            <h2>Connect Your Wallet</h2>
            <p>Please connect your Solana wallet to start swapping tokens</p>
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>Powered by Solana & 0slot Integration</p>
      </footer>
    </div>
  );
}

export default App;
