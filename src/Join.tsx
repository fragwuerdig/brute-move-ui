
import { Box, Card, Divider, Modal, TextField, Typography } from '@mui/material';
import { Button, FormControl, FormLabel, RadioGroup, FormControlLabel, Radio } from '@mui/material';

import { fetchBankBalance, fetchContractStateSmart, getFactoryAddr, type JoinableGame } from './Common';
import { useWallet } from './WalletProvider';
import { useEffect, useState } from 'react';
import type { UnsignedTx } from '@goblinhunt/cosmes/wallet';
import { MsgExecuteContract } from '@goblinhunt/cosmes/client';

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
  const [ balance, setBalance ] = useState<number | null>(null);
  const [ message, setMessage ] = useState<string>('');
  const navigate = useNavigate();

  // refresh counter
  const [ refresh, setRefresh ] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => setRefresh((r) => r + 1), 5000);
    return () => clearTimeout(timer);
  }, [refresh]);

  // refresh joinable game data every 5 seconds
  useEffect(() => {
    if (!game || !chain) return;
    fetchContractStateSmart(getFactoryAddr(chain), { joinable_game: { id: game.id } })
      .then((data) => {
        if (data?.contract) {
          // game is already deployed -> forward
          navigate(`/games/${data.contract}`, { replace: true });
        }
        // still joinable, show join screen
      })
      .catch((error) => {
        console.error("Error fetching game:", error);
      });
  }, [connectedAddr, game, chain, navigate, refresh]);

  // query the balance of the connectedAddr
  useEffect(() => {
    if (!connectedAddr) return;
    fetchBankBalance(connectedAddr || "", 'uluna').then((data) => {
      setBalance(data);
    }).catch((error) => {
      console.error("Error fetching bank balance:", error);
    });
  }, [connectedAddr]);

  // check if the user can join this game
  useEffect(() => {
    if (!game || balance === null) return;
    if ( game.opponent === connectedAddr ) {
      setMessage("This is your own challenge, you cannot join it yourself. Wait for an opponent to join you.");
      return;
    }
    if ( game.opponent_color === 'White' && color === 'White' ) {
      setMessage("Your opponent already chose White, please choose Black or Random.");
      return;
    }
    if ( balance < game.bet / 1000000 ) {
      setMessage(`Your balance of ${balance} $LUNC is insufficient to cover the bet of ${game.bet/1000000} $LUNC.`);
      return;
    }
    setMessage('');
  }, [game, balance, connectedAddr]);

  // retract a challenge
  const handleOnClickRetract = (sender: string) => {
    if (!game) {
      console.error("No game to retract");
      return;
    }
    let msg = {remove_unaccepted_challenge: { game_id: game.id }};
    let tx: UnsignedTx = {
      msgs: [
        new MsgExecuteContract({
          sender: sender,
          contract: getFactoryAddr(chain),
          funds: [],
          msg
        }),
      ],
      memo: "Retract challenge ID " + game.id,
    };
    setModal({ open: true, message: 'Retracting challenge...', closable: false });
    broadcast(tx)
      .then((_result) => {
        setModal({ open: true, message: `Challenge ID ${game.id} retracted successfully.`, closable: true });
        // Optionally, redirect to home or update the UI
        navigate(`/`);
      })
      .catch((error) => {
        console.error("Error retracting challenge:", error);
        setModal({ open: true, message: `Failed to retract challenge. ${error.message}.`, closable: true });
      });
  };

  // joining a challenge
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
          funds: [{ amount: game.bet.toString(), denom: 'uluna' }],
          msg
        }),
      ],
      memo: "Create a new game",
    };
    setModal({ open: true, message: 'Joining game...', closable: false });
    broadcast(tx)
      .then((result) => {
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
        
        // save game ID to local storage or state
        const storedGames = JSON.parse(localStorage.getItem(STORE_KEY_SAVED_GAMES) || "[]") as SavedGame[];
        storedGames.push({ address: gameId, name: `New Game ${game.id}`});
        localStorage.setItem(STORE_KEY_SAVED_GAMES, JSON.stringify(storedGames));
        
        // Optionally, redirect to the new game or update the UI
        navigate(`/games/${gameId}`);
      })
      .catch((error) => {
        console.error("Error creating game:", error);
        setModal({ open: true, message: `Failed to create game. ${error.message}.`, closable: true });
      });
  };

  return (
    <>
      {
        game ? (
          <Card sx={{ width: '60%', minWidth: '300px', padding: '20px', margin: '40px' }}>
            <Typography variant="h5" gutterBottom>
              Accept a Chess Challenge
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
              <Divider sx={{ marginBottom: '5px', marginTop: '5px' }} />
              <FormLabel component="legend">Your opponent asks you to accept the challenge with the following bet :</FormLabel>
              <TextField
                value={`${game.bet / 1000000} $LUNC`}
                disabled ={true}
              />
              <Button disabled={!connectedAddr || !!message} variant="contained" onClick={() => handleOnClickJoin(connectedAddr || "")}>Join!</Button>
              <Button disabled={connectedAddr !== game.opponent} variant="contained" color="error" onClick={() => handleOnClickRetract(connectedAddr || "")}>Retract</Button>
              { message && (<Typography variant="body1" color="error">{message}</Typography> )}
            </Box>
          </Card>
        ) : (
          <div>Loading...</div>
        )
      }
      <Modal open={modal.open} onClose={() => setModal({ open: false, message: '' })}>
        <Box
          sx={{
            maxWidth: '80vw',
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            bgcolor: 'background.paper',
            boxShadow: 24,
            p: 4,
            borderRadius: 2,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Typography variant="h6" sx={{ width: '100%', mb: 2, textAlign: 'center' }}>
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
