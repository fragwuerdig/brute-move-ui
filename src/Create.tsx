
import { Box, Card, Divider, Modal, TextField, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { Button, FormControl, FormLabel, RadioGroup, FormControlLabel, Radio } from '@mui/material';
import { MsgExecuteContract } from '@goblinhunt/cosmes/client';
import type { UnsignedTx } from '@goblinhunt/cosmes/wallet';
import { fetchBankBalance, fetchContractStateSmart, getFactoryAddr } from './Common';
import { useWallet } from './WalletProvider';

interface CreatedModal {
  open: boolean;
  closable?: boolean;
  message: string;
  redirect?: string;
}

function Create() {

  const [color, setColor] = useState<'White' | 'Black' | 'Random'>('Random');
  const { connectedAddr, broadcast, chain } = useWallet();
  const [modal, setModal] = useState<CreatedModal>({ open: false, message: '', closable: true });

  const [betAmount, setBetAmount] = useState<number>(0);
  const [minBetAmount, setMinBetAmount] = useState(1);
  const [disabledButton, setDisabledButton] = useState(false);
  const [disabledText, setDisabledText] = useState('');

  const [ refresh, setRefresh ] = useState(0);

  // fetch minimum bet amount
  useEffect(() => {
    let contractAddr = getFactoryAddr(chain);
    let query = { minimum_bet: {} };
    fetchContractStateSmart(contractAddr, query).then((data) => {
      setMinBetAmount(data);
    }).catch((error) => {
      console.error("Error fetching minimum bet amount:", error);
    });
  }, [betAmount]);

  // fetch user lunc balance
  useEffect(() => {
    fetchBankBalance(connectedAddr || "", 'uluna').then((data) => {
      let balance = parseFloat(data);
      if (isNaN(balance) || isNaN(minBetAmount) || isNaN(betAmount)) {
        setDisabledButton(true);
        setDisabledText('invalid NaN value');
      } else if ( minBetAmount > balance ) {
        setDisabledButton(true);
        setDisabledText(`Minimum bet amount exceeds your balance. Your balance is ${balance} $LUNC`);
      } else if ( balance < betAmount) {
        setDisabledButton(true);
        setDisabledText(`Insufficient balance. Your balance is ${balance} $LUNC`);
      } else if ( minBetAmount > betAmount) {
        setDisabledButton(true);
        setDisabledText(`Minimum bet amount is ${minBetAmount} $LUNC`);
      } else {
        setDisabledButton(false);
        setDisabledText('');
      }
    }).catch((error) => {
      console.error("Error fetching user balance:", error);
    });
  }, [refresh, betAmount, connectedAddr]);

  // refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setRefresh(prev => prev + 1);
    }, 6000);
    return () => clearInterval(interval);
  }, [refresh]);

  const handleOnClickCreate = (sender: string) => {
    let msg = {
      create_joinable_game: {
        with_color: color === 'Random' ? null : color,
      }
    }
    let bet = `${betAmount}000000`
    let tx: UnsignedTx = {
      msgs: [
        new MsgExecuteContract({
          sender: sender,
          contract: getFactoryAddr(chain),
          funds: [{ denom: 'uluna', amount: bet }],
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
        setModal({ open: true, message: `Game created successfully! Share the ID ${gameId} with your partner.`, closable: true, redirect: `/join/${gameId}` });
      })
      .catch((error) => {
        console.error("Error creating game:", error);
        setModal({ open: true, message: `Failed to create game. ${error.message}`, closable: true });
      });
    
  };

  return (
    <>
      <Card sx={{ width: '60%', minWidth: '300px', padding: '20px', margin: '40px' }}>
        <Typography variant="h5" gutterBottom>
          Create a New Chess Challenge
        </Typography>
        <Divider sx={{ marginBottom: '30px' }} />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <FormControl component="fieldset" sx={{ marginBottom: '20px' }}>
            <FormLabel component="legend">Choose your color! You will be assigned a unique ID that you can share with your challenger.</FormLabel>
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
            <Divider sx={{ marginBottom: '30px', marginTop: '5px' }} />
            <FormLabel component="legend">Choose an amount to bet on this challenge. Your opponent will bet against it! 10% betting fee. Min. bet amount currently sits at {minBetAmount} $LUNC</FormLabel>
            <TextField
              type="number"
              variant="outlined"
              placeholder="Bet Amount in $LUNC"
              sx={{ marginTop: '10px' }}
              onChange={(e) => { setBetAmount(parseInt(e.target.value)) }}
            />
          </FormControl>
          <Button disabled={!connectedAddr || disabledButton} variant="contained" onClick={() => handleOnClickCreate(connectedAddr || "")}>Create!</Button>
          { disabledText && <Typography color="error">{disabledText}</Typography> }
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
          {
            modal.redirect && (
              <Button
                variant="contained"
                onClick={() => {
                  window.location.href = modal.redirect!;
                }}
              >
                Go to Game
              </Button>
            )
          }
        </Box>
      </Modal>
    </>
  );
}

export default Create;
