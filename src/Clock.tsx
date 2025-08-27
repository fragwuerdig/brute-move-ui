import { Card, Typography } from "@mui/material";
import React, { useEffect, useState } from "react";

type ClockType = "noshow" | "move";

interface ClockProps {
    seconds: number;
    type: ClockType;
}

function formatTime(seconds: number): string {
    const mm = Math.floor(seconds / 60)
        .toString()
        .padStart(2, "0");
    const ss = (seconds % 60).toString().padStart(2, "0");
    return `${mm}:${ss}`;
}

const Clock: React.FC<ClockProps> = ({ seconds, type }) => {
    const [currentSeconds, setCurrentSeconds] = useState(seconds);

    useEffect(() => {
        setCurrentSeconds(seconds); // Reset when prop changes
    }, [seconds]);

    useEffect(() => {
        if (currentSeconds <= 0) return;
        const interval = setInterval(() => {
            setCurrentSeconds((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(interval);
    }, [currentSeconds]);

    const label =
        type === "noshow"
            ? "No-Show"
            : "Move Timeout";

    return (
        <Card variant="outlined" sx={{ padding: '10px', minWidth: '120px', textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <Typography align="center">{label}</Typography>
                <Typography align="center">{formatTime(currentSeconds)}</Typography>
            </div>
        </Card>
    );
};

export default Clock;