import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import { WalletProvider } from './WalletProvider.tsx'
import './Main.css'

const CHAINS = {
  'rebel-2': { chainId: 'rebel-2', rpc: 'https://rebel-rpc.luncgoblins.com', gasPrice: {denom: "uluna", amount: "29"} },
  'columbus-5': { chainId: 'columbus-5', rpc: 'https://tc-rpc.luncgoblins.com', gasPrice: {denom: "uluna", amount: "29"} },
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <WalletProvider chain={CHAINS['rebel-2']}>
        <App />
      </WalletProvider>
    </BrowserRouter>
  </StrictMode>,
)
