
import { Box, Card, Divider, Modal, Typography } from '@mui/material';
import { Button, FormControl, FormLabel, RadioGroup, FormControlLabel, Radio } from '@mui/material';

import { getFactoryAddr, type JoinableGame } from './Common';
import { useWallet } from './WalletProvider';
import { useState } from 'react';
import type { UnsignedTx } from '@goblinhunt/cosmes/wallet';
import { MsgExecuteContract } from '@goblinhunt/cosmes/client';
import { id } from 'ethers';

import { useNavigate } from "react-router-dom";
import { STORE_KEY_SAVED_GAMES, type SavedGame } from './Home';

interface JoinProps {
  game: JoinableGame | null;
}

interface JoinedModal {
  open: boolean;
  closable?: boolean;
  message: string;
}

function Join({ game }: JoinProps) {

  const { connectedAddr, chain, broadcast } = useWallet();
  const [color, setColor] = useState<'White' | 'Black' | 'Random'>('Random');
  const [modal, setModal] = useState<JoinedModal>({ open: false, message: '', closable: true });
  const navigate = useNavigate();


  const handleOnClickJoin = (sender: string) => {
    if (!game) {
      console.error("No game to join");
      return;
    }
    let msg = {
      join_game: {
        id: game.id,
        with_color: color === 'Random' ? null : color,
      }
    };
    let tx: UnsignedTx = {
      msgs: [
        new MsgExecuteContract({
          sender: sender,
          contract: getFactoryAddr(chain),
          funds: [],
          msg
        }),
      ],
      memo: "Create a new game",
    };
    setModal({ open: true, message: 'Joining game...', closable: false });
    broadcast(tx)
      .then((result) => {
        console.log("Game joined successfully:", result.txResponse);
        let wasmEvents = result.txResponse.events.filter(event => event.type === 'instantiate');
        if (wasmEvents.length === 0) {
          console.error("No wasm event found in transaction response");
          return;
        }
        let gameId = wasmEvents[0].attributes.find(attr => attr.key === '_contract_address')?.value;
        if (!gameId) {
          console.error("Game ID not found in transaction response");
          return;
        }
        console.log("Game ID:", gameId);
        
        // save game ID to local storage or state
        const storedGames = JSON.parse(localStorage.getItem(STORE_KEY_SAVED_GAMES) || "[]") as SavedGame[];
        storedGames.push({ address: gameId, name: `New Game ${game.id}`});
        localStorage.setItem(STORE_KEY_SAVED_GAMES, JSON.stringify(storedGames));
        
        // Optionally, redirect to the new game or update the UI
        navigate(`/games/${gameId}`);
      })
      .catch((error) => {
        console.error("Error creating game:", error);
        setModal({ open: true, message: 'Failed to create game. Please try again.', closable: true });
      });
  };

  return (
    <>
      {
        game ? (
          <Card sx={{ width: '60%', minWidth: '300px', padding: '20px', margin: '40px' }}>
            <Typography variant="h5" gutterBottom>
              Join a Game
            </Typography>
            <Divider sx={{ marginBottom: '30px' }} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <FormControl component="fieldset" sx={{ marginBottom: '20px' }}>
                <FormLabel component="legend">Choose your color!<br />You will be assigned a unique contract address that you can share with your game partner to start the game.</FormLabel>
                <RadioGroup
                  value={color}
                  onChange={(e) => setColor(e.target.value as 'White' | 'Black' | 'Random')}
                  name="color"
                  row={false}
                >
                  <FormControlLabel value="White" control={<Radio />} label="White" disabled={game.opponent_color === 'White'} />
                  <FormControlLabel value="Black" control={<Radio />} label="Black" disabled={game.opponent_color === 'Black'} />
                  <FormControlLabel value="Random" control={<Radio />} label="Random" disabled={game.opponent_color === 'White' || game.opponent_color === 'Black'} />
                </RadioGroup>
              </FormControl>
              <Button disabled={!connectedAddr} variant="contained" onClick={() => handleOnClickJoin(connectedAddr || "")}>Join!</Button>
            </Box>
          </Card>
        ) : (
          <div>Loading...</div>
        )
      }
      <Modal open={modal.open} onClose={() => setModal({ open: false, message: '' })}>
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            bgcolor: 'background.paper',
            boxShadow: 24,
            p: 4,
            borderRadius: 2,
            minWidth: 300,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Typography variant="h6" sx={{ mb: 2, textAlign: 'center' }}>
            {modal.message.split(/(ID\s+\w+)/).map((part, idx) => {
              const match = part.match(/^ID\s+(\w+)/);
              if (match) {
                const gameId = match[1];
                return (
                  <span
                    key={idx}
                    style={{ color: '#1976d2', cursor: 'pointer'}}
                    onClick={() => navigator.clipboard.writeText(gameId)}
                    title="Click to copy Game ID"
                  >
                    {part}
                  </span>
                );
              }
              return <span key={idx}>{part}</span>;
            })}
          </Typography>
          {modal.closable && (
            <Button
              variant="contained"
              onClick={() => setModal({ open: false, message: '', closable: true })}
              autoFocus
            >
              OK
            </Button>
          )}
        </Box>
      </Modal>
    </>
  );
}

export default Join;
