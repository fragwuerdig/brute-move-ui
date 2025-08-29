import './Input.css';

interface InputProps {
    value?: string;
    onChange?: (value: string) => void;
    placeholder?: string;
    style?: React.CSSProperties;
    disabled?: boolean;
}

export const Input: React.FC<InputProps> = ({
    value,
    onChange,
    placeholder,
    style,
    disabled
}) => {
    return (
        <input
            value={value}
            onChange={(e) => { onChange?.(e.target.value)}}
            placeholder={placeholder}
            style={style}
            disabled={disabled}
        />
    );
};

