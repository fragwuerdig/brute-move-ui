
import { LightCard } from "./LightCard";
import { FormControlLabel, Switch } from "@mui/material";
import { StyledButton } from "./StyledButton";
import ShareIcon from '@mui/icons-material/Share';

interface ActionCardProps {
    offerDraw?: boolean;
    variant?: 'compact' | 'default';
    disabled?: boolean;
    onChange?: (value: boolean) => void;
    onRetreatClicked?: () => void;
    onShareClicked?: () => void;
    onSettleClicked?: () => void;
    onClaimRewardClicked?: () => void;
    showSettle?: boolean;
    showClaimReward?: boolean;
}

export function ActionCard({ offerDraw, variant, disabled, onChange, onRetreatClicked, onShareClicked, onSettleClicked, onClaimRewardClicked, showSettle, showClaimReward }: ActionCardProps) {
    return (
        <div className={`${variant}`}>
            <LightCard sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                <FormControlLabel
                    control={
                        <Switch
                            checked={offerDraw ? true : false}
                            disabled={disabled}
                            onChange={(e) => onChange?.(e.target.checked)}
                        />
                    }
                    label="Draw Offer"
                    sx={{ flexGrow: 1 }}
                />
                <div style={{ display: 'flex', gap: '10px' }}>
                    <StyledButton
                        variant="contained"
                        color="error"
                        disabled={disabled}
                        onClick={onRetreatClicked}
                    >
                        Resign!
                    </StyledButton>
                    {
                        showSettle && <StyledButton
                            variant="contained"
                            color="primary"
                            onClick={onSettleClicked}
                        >
                            Settle
                        </StyledButton>
                    }
                    {
                        showClaimReward && <StyledButton
                            variant="contained"
                            color="success"
                            onClick={onClaimRewardClicked}
                        >
                            Distr. Reward
                        </StyledButton>
                    }
                    <StyledButton
                        variant="contained"
                        color="secondary"
                        sx={{ minWidth: '30px' }}
                        onClick={onShareClicked}
                    >
                        <ShareIcon />
                    </StyledButton>
                </div>
            </LightCard>
        </div>
    );
}