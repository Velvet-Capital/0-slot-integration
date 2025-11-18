import './polyfills.js'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { WalletContextProvider } from './utils/walletProvider'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <WalletContextProvider>
      <App />
    </WalletContextProvider>
  </StrictMode>,
)
