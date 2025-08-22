import { Routes, Route } from "react-router-dom";
import Home from "./Home";
import GameRoute from "./GameRoute";
import { Button, Card, Typography } from "@mui/material";
import Head from "./Head";
import { useWallet } from "./WalletProvider";
import Create from "./Create";
import JoinRoute from "./JoinRoute";

function App() {

  const { connect, connected } = useWallet();

  return (
    <>
      <Head>
        {
          connected ? (
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/create" element={<Create />} />
              <Route path="/games/:addr" element={<GameRoute />} />
              <Route path="/join/:id" element={<JoinRoute />} />
            </Routes>
          ) : (
            <Card variant="outlined" sx={{ padding: '50px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <Typography variant="h5" gutterBottom>
                Connect Your Wallet!
              </Typography>
              <Button variant="contained" color="primary" onClick={connect}>
                Connect Wallet
              </Button>
            </Card>
          )
        }
      </Head>
    </>
  );
}

export default App;
