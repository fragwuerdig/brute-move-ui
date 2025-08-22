import { AppBar, Box, Toolbar, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import './Head.css';

function Head({ children }: { children?: React.ReactNode }) {
    const navigate = useNavigate();

    return (
        <>
            <Box className="top-gutter">
                <AppBar>
                    <Toolbar variant="dense">
                        <Box height={75} alignItems={"center"} display="flex">
                            <Typography variant="h5" color="inherit" component="div" sx={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
                                Brute<b>Move!</b>
                            </Typography>
                        </Box>
                    </Toolbar>
                </AppBar>
            </Box>
            <Box className="main-content">
                {children}
            </Box>
        </>
    );
}

export default Head;