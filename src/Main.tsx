import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import { WalletProvider } from './WalletProvider.tsx'
import './Main.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <WalletProvider chain={{ chainId: 'rebel-2', rpc: 'https://rebel-rpc.luncgoblins.com', gasPrice: {denom: "uluna", amount: "29"} }}>
        <App />
      </WalletProvider>
    </BrowserRouter>
  </StrictMode>,
)
