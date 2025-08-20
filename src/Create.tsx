
import { Box, Card, Divider, Modal, Typography } from '@mui/material';
import { useState } from 'react';
import { Button, FormControl, FormLabel, RadioGroup, FormControlLabel, Radio } from '@mui/material';
import { MsgExecuteContract } from '@goblinhunt/cosmes/client';
import type { UnsignedTx } from '@goblinhunt/cosmes/wallet';
import { getFactoryAddr } from './Common';
import { useWallet } from './WalletProvider';

interface CreatedModal {
  open: boolean;
  closable?: boolean;
  message: string;
}

function Create() {

  const [color, setColor] = useState<'White' | 'Black' | 'Random'>('Random');
  const { connectedAddr, broadcast, chain } = useWallet();
  const [modal, setModal] = useState<CreatedModal>({ open: false, message: '', closable: true });

  const handleOnClickCreate = (sender: string) => {
    let msg = {
      create_joinable_game: {
        with_color: color === 'Random' ? null : color,
      }
    }
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
    setModal({ open: true, message: 'Creating game...', closable: false });
    broadcast(tx)
      .then((result) => {
        console.log("Game created successfully:", result.txResponse);
        let wasmEvents = result.txResponse.events.filter(event => event.type === 'wasm');
        if (wasmEvents.length === 0) {
          console.error("No wasm event found in transaction response");
          return;
        }
        let gameId = wasmEvents[0].attributes.find(attr => attr.key === 'game_id')?.value;
        if (!gameId) {
          console.error("Game ID not found in transaction response");
          return;
        }
        console.log("Game ID:", gameId);
        // Optionally, redirect to the new game or update the UI
        setModal({ open: true, message: `Game created successfully! Share the ID ${gameId} with your partner.`, closable: true });
      })
      .catch((error) => {
        console.error("Error creating game:", error);
        setModal({ open: true, message: 'Failed to create game. Please try again.', closable: true });
      });
    
  };

  return (
    <>
      <Card sx={{ width: '60%', minWidth: '300px', padding: '20px', margin: '40px' }}>
        <Typography variant="h5" gutterBottom>
          Create a New Game
        </Typography>
        <Divider sx={{ marginBottom: '30px' }} />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <FormControl component="fieldset" sx={{ marginBottom: '20px' }}>
            <FormLabel component="legend">Choose your color!<br />You will be assigned a unique ID that you can share with your game partner.</FormLabel>
            <RadioGroup
              value={color}
              onChange={(e) => setColor(e.target.value as 'White' | 'Black' | 'Random')}
              name="color"
              row={false}
            >
              <FormControlLabel value="White" control={<Radio />} label="White" />
              <FormControlLabel value="Black" control={<Radio />} label="Black" />
              <FormControlLabel value="Random" control={<Radio />} label="Random" />
            </RadioGroup>
          </FormControl>
          <Button disabled={!connectedAddr} variant="contained" onClick={() => handleOnClickCreate(connectedAddr || "")}>Create!</Button>
        </Box>
      </Card>
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

export default Create;
