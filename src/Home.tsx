import { Box, Button, Card, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Divider, IconButton, List, ListItem, TextField, Typography } from '@mui/material';
import React, { useEffect } from 'react';
import DeleteIcon from '@mui/icons-material/Delete';
import { fetchContractStateSmart, getFactoryAddr, type GameInfo, type JoinableGame } from './Common';
import { useWallet } from './WalletProvider';

import { useNavigate } from "react-router-dom";

export interface SavedGame {
    address: string; //on chain game address
    name: string; //name of the game for display
}

export const STORE_KEY_SAVED_GAMES = "savedGames";

const Home: React.FC = () => {

    const navigate = useNavigate();

    const [reload, setReload] = React.useState<number>(0);

    const [invalidGameInfo, setInvalidGameInfo] = React.useState<boolean>(true);
    const [fetchingGameInfo, setFetchingGameInfo] = React.useState<boolean>(false);

    const [invalidJoinableGame, setInvalidJoinableGame] = React.useState<boolean>(true);
    const [fetchingJoinableGame, setFetchingJoinableGame] = React.useState<boolean>(false);
    
    const [gameAddrSearchTerm, setGameAddrSearchTerm] = React.useState<string>("");
    const [joinableGameId, setJoinableGameId] = React.useState<string>("");
    
    const [showAddGameModal, setShowAddGameModal] = React.useState<boolean>(false);
    const [newGameName, setNewGameName] = React.useState<string>("");
    const [savedGames, setSavedGames] = React.useState<SavedGame[]>([]);
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
        setInvalidGameInfo(true);
        setFetchingGameInfo(false);
        
        // Save the new game to local storage
        const storedGames = JSON.parse(localStorage.getItem(STORE_KEY_SAVED_GAMES) || "[]") as SavedGame[];
        storedGames.push(newSavedGame);
        localStorage.setItem(STORE_KEY_SAVED_GAMES, JSON.stringify(storedGames));
        setReload(reload + 1); // Trigger a reload to update the UI

        // Optionally, you can trigger a reload or update the state to reflect the new game
    };

    const onClickPlayHandler = (addr: string) => {
        navigate(`/games/${addr}`);
    };

    const onOngoingSearchHandler = (searchTerm: string) => {
        console.log("Searching for:", searchTerm);
        setGameAddrSearchTerm(searchTerm);
        fetchContractStateSmart(searchTerm || "", { game_info: {} })
            .catch(() => {
                setInvalidGameInfo(true);
                setFetchingGameInfo(false);
            })
            .then((data: GameInfo) => {
                if (!data || !data.board) {
                    setInvalidGameInfo(true);
                    setFetchingGameInfo(false);
                    return;
                }
                console.log("Fetched game info:", data);
                setFetchingGameInfo(false);
                setInvalidGameInfo(false);
            });
    };

    const onJoinableSearchHandler = (searchTerm: string) => {
        // Implement search logic here
        console.log("Searching for joinable games:", searchTerm);
        console.log("Factory address:", getFactoryAddr(chain));
        console.log("Chain:", chain.chainId);
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
                console.log("Fetched joinable game info:", data);
                setFetchingJoinableGame(false);
                setInvalidJoinableGame(false);
                setJoinableGameId(data.id);
            });

    };

    const onAddGameHandler = () => {
        // Implement logic to add a new game
        setShowAddGameModal(true);
    };

    useEffect(() => {
        // Initial fetch or setup can be done here if needed
        console.log("Home component mounted");
        const storedGames = JSON.parse(localStorage.getItem(STORE_KEY_SAVED_GAMES) || "[]") as SavedGame[];
        setSavedGames(storedGames);
    }, [reload]);

    return (
        <>
            <Card sx={{ width: '60%', minWidth: '300px', padding: '20px', margin: '40px' }}>
                <Typography variant="h5" gutterBottom sx={{ marginBottom: '30px' }}>
                    Bookmarked Games
                </Typography>
                <Divider sx={{ marginBottom: '30px' }} />
                <List>
                    {
                        savedGames.length === 0 ? (
                            <Typography variant="body1" sx={{ textAlign: 'center', marginTop: '20px' }}>
                                No saved games found.
                            </Typography>
                        ) : (
                            savedGames.map((game) => (
                                <ListItem key={game.address} sx={{ gap: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography variant="body1" sx={{ minWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{game.name}</Typography>
                                    <Typography variant="body1" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{game.address}</Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px', flexDirection: 'row' }}>
                                        <Button variant="contained" onClick={() => onClickPlayHandler(game.address)}>Play</Button>
                                        <IconButton color="error">
                                            <DeleteIcon />
                                        </IconButton>
                                    </Box>
                                </ListItem>
                            ))
                        )
                    }
                </List>
                <Divider sx={{ margin: '30px 0' }} />
                <Typography variant="h5" gutterBottom>
                    Joinable Games
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: '20px', marginTop: '20px' }}>
                    <TextField
                        variant="outlined"
                        label="Search by ID"
                        sx={{ flexGrow: 1 }}
                        onChange={(e) => {
                            const searchTerm = e.target.value.toLowerCase();
                            onJoinableSearchHandler(searchTerm);
                        }}
                    />
                    <Button
                        variant="outlined"
                        onClick={() => navigate(`/join/${joinableGameId}`)}
                        disabled={fetchingJoinableGame || invalidJoinableGame}
                    >
                        Join
                    </Button>
                </Box>
                <Divider sx={{ margin: '30px 0' }} />
                <Typography variant="h5" gutterBottom>
                    Add a New Game
                </Typography>
                <Button variant="contained" onClick={() => navigate('/create')} sx={{ marginTop: '20px' }}>
                    Create Game
                </Button>
            </Card>
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