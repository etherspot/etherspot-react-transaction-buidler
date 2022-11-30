import React, { useCallback, useEffect, useMemo, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Onboard from "bnc-onboard";
import Home from "./pages/Home";
import Send from "./pages/Send";
import SingleSwap from "./pages/SingleSwap";
import CrossSwap from "./pages/CrossSwap";
import ThemeOverride from "./pages/ThemeOverride";
import HiddenAddTransaction from "./pages/HiddenAddTransaction";
import HiddenTransactionBlockTypes from "./pages/HiddenTransactionBlockTypes";
import KlimaStake from "./pages/Kilma_stake";

// List of wallets
const wallets = [
  { walletName: "metamask", preferred: true },
  {
    walletName: "walletConnect",
    preferred: true,
    rpc: {
      1: `https://mainnet.infura.io/v3/${process.env.REACT_APP_INFURA_ID}`,
    },
  },
];

// Chain ID
const chainId = 1;

const WalletService = () =>
  Onboard({
    walletSelect: { wallets },
    networkId: chainId,
  });

const App = () => {
  const [connectedProvider, setConnectedProvider] = useState(null);

  const walletService = useMemo(() => WalletService(), []);

  // Callback function to connect to an external wallet
  const connectWithExternal = useCallback(async () => {
    await walletService.walletSelect().catch(() => null);
    await walletService.walletCheck().catch(() => null);
    setConnectedProvider(walletService.getState().wallet.provider);
  }, [walletService]);

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <Login
              connectedProvider={connectedProvider}
              connectWallet={connectWithExternal}
            />
          }
        />
        <Route
          path="/home"
          element={<Home connectedProvider={connectedProvider} />}
        />
        <Route
          path="/send"
          element={
            <Send connectedProvider={connectedProvider} chainId={chainId} />
          }
        />
        <Route
          path="/single-swap"
          element={
            <SingleSwap
              connectedProvider={connectedProvider}
              chainId={chainId}
            />
          }
        />
        <Route
          path="/cross-swap"
          element={
            <CrossSwap
              connectedProvider={connectedProvider}
              chainId={chainId}
            />
          }
        />
        <Route
          path="/theme-override"
          element={
            <ThemeOverride
              connectedProvider={connectedProvider}
              chainId={chainId}
            />
          }
        />
        <Route
          path="/hidden-add-btn"
          element={
            <HiddenAddTransaction
              connectedProvider={connectedProvider}
              chainId={chainId}
            />
          }
        />
        <Route
          path="/hidden-transaction-block"
          element={
            <HiddenTransactionBlockTypes
              connectedProvider={connectedProvider}
              chainId={chainId}
            />
          }
        />
        <Route
          path="/klima-stake"
          element={
            <KlimaStake
              connectedProvider={connectedProvider}
              chainId={chainId}
            />
          }
        />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
