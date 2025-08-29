import { styled } from '@mui/material/styles';
import Button, { type ButtonProps } from '@mui/material/Button';
import { TextField, type TextFieldProps } from '@mui/material';

export const StyledButton = styled(Button)<ButtonProps>(() => ({
  textTransform: 'none',
  borderRadius: '100px',
  boxShadow: 'none',
  fontWeight: 'bold',
  ...( { /* example */ } ),
}));

export const StyledTextField = styled(TextField)<TextFieldProps>(({ theme }) => ({
  padding: '10px',
  borderRadius: '100px',
  border: '1px solid #ccc',
  fontSize: '16px',
  width: '100%',
  boxSizing: 'border-box',
  '&:focus': {
    borderColor: theme.palette.primary.main,
    outline: 'none',
    boxShadow: `0 0 5px ${theme.palette.primary.main}`,
  },
}));