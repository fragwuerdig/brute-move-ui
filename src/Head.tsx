import { AppBar, Box, Toolbar, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";

export function Head({ children }: { children?: React.ReactNode }) {
    const navigate = useNavigate();

    return (
        <>
            <Box height={130}>
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
            <Box
                className="main-content"
                sx={{
                    width: `calc(100vw - 130px)`,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    marginLeft: 'auto',
                    marginRight: 'auto',
                }}
            >
                {children}
            </Box>
        </>
    );
}