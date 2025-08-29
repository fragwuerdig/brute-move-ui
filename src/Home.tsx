import { Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField, Typography } from '@mui/material';
import React, { useEffect } from 'react';
import { fetchContractStateSmart, getFactoryAddr, type JoinableGame } from './Common';
import { useWallet } from './WalletProvider';

import { useNavigate } from "react-router-dom";
import { LightCard } from './LightCard';
import { StyledButton } from './StyledButton';
import { Input } from './Input';

export interface SavedGame {
    address: string; //on chain game address
    name: string; //name of the game for display
}

export const STORE_KEY_SAVED_GAMES = "savedGames";

const Home: React.FC = () => {

    const navigate = useNavigate();

    const [reload, setReload] = React.useState<number>(0);

    //const [invalidGameInfo, setInvalidGameInfo] = React.useState<boolean>(true);
    //const [fetchingGameInfo, setFetchingGameInfo] = React.useState<boolean>(false);

    const [invalidJoinableGame, setInvalidJoinableGame] = React.useState<boolean>(true);
    const [fetchingJoinableGame, setFetchingJoinableGame] = React.useState<boolean>(false);
    
    const [gameAddrSearchTerm, setGameAddrSearchTerm] = React.useState<string>("");
    const [joinableGameId, setJoinableGameId] = React.useState<string>("");
    
    const [showAddGameModal, setShowAddGameModal] = React.useState<boolean>(false);
    const [newGameName, setNewGameName] = React.useState<string>("");
    const [_savedGames, setSavedGames] = React.useState<SavedGame[]>([]);
    const {chain} = useWallet();

    const handleAddGame = () => {
        if (newGameName.trim() === "") {
            alert("Please enter a game name.");
            return;
        }

        const newSavedGame: SavedGame = { address: gameAddrSearchTerm, name: newGameName };

        setNewGameName("");
        setGameAddrSearchTerm("");
        setShowAddGameModal(false);
        //setInvalidGameInfo(true);
        //setFetchingGameInfo(false);
        
        // Save the new game to local storage
        const storedGames = JSON.parse(localStorage.getItem(STORE_KEY_SAVED_GAMES) || "[]") as SavedGame[];
        storedGames.push(newSavedGame);
        localStorage.setItem(STORE_KEY_SAVED_GAMES, JSON.stringify(storedGames));
        setReload(reload + 1); // Trigger a reload to update the UI

        // Optionally, you can trigger a reload or update the state to reflect the new game
    };

    const onJoinableSearchHandler = (searchTerm: string) => {
        // Implement search logic here
        fetchContractStateSmart(getFactoryAddr(chain), { joinable_game: { id: searchTerm } })
            .catch(() => {
                setInvalidJoinableGame(true);
                setFetchingJoinableGame(false);
                setJoinableGameId("");
            })
            .then((data: JoinableGame) => {
                if (!data) {
                    setInvalidJoinableGame(true);
                    setFetchingJoinableGame(false);
                    return;
                }
                setFetchingJoinableGame(false);
                setInvalidJoinableGame(false);
                setJoinableGameId(data.id);
            });

    };

    useEffect(() => {
        // Initial fetch or setup can be done here if needed
        const storedGames = JSON.parse(localStorage.getItem(STORE_KEY_SAVED_GAMES) || "[]") as SavedGame[];
        setSavedGames(storedGames);
    }, [reload]);

    return (
        <>
            <LightCard sx={{ width: '90%', maxWidth: '500px', minWidth: '300px', padding: '20px', margin: '40px' }}>
                <Typography variant="h5" gutterBottom>
                    Search by Game ID
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: '20px', marginTop: '20px' }}>
                    <Input
                        placeholder="Search by ID"
                        value={gameAddrSearchTerm}
                        onChange={(e) => {
                            const searchTerm = e.toLowerCase();
                            setGameAddrSearchTerm(searchTerm);
                            onJoinableSearchHandler(searchTerm);
                        }}
                    />
                </Box>
                <Box sx={{ width: '100%', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: '15px', gap: '10px' }}>
                    <StyledButton
                        variant="contained"
                        color='primary'
                        onClick={() => navigate('/create')}
                        sx={{ height: '40px' }}
                    >
                        Create Game
                    </StyledButton>
                    <StyledButton
                        variant="contained"
                        color='primary'
                        onClick={() => navigate(`/join/${joinableGameId}`)}
                        disabled={fetchingJoinableGame || invalidJoinableGame}
                        sx={{ height: '40px', minWidth: '100px' }}
                    >
                        Join
                    </StyledButton>
                </Box>
            </LightCard>
            <Dialog open={showAddGameModal} onClose={() => setShowAddGameModal(false)}>
                <DialogTitle>Add New Game</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        To add a new game
                    </DialogContentText>
                    <TextField
                        autoFocus
                        label="Name"
                        type="text"
                        fullWidth
                        variant="outlined"
                        value={newGameName}
                        onChange={(e) => setNewGameName(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowAddGameModal(false)}>Cancel</Button>
                    <Button onClick={handleAddGame}>Add Game</Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default Home;