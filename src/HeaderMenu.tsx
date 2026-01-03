import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface MenuItem {
    label: string;
    path?: string;
    onClick?: () => void;
}

const MenuIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
);

const ChevronIcon = ({ isOpen }: { isOpen: boolean }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`header-menu__chevron ${isOpen ? 'header-menu__chevron--open' : ''}`}
    >
        <polyline points="6 9 12 15 18 9" />
    </svg>
);

const menuItems: MenuItem[] = [
    { label: 'Leaderboard', path: '/leaderboard' },
    // Add more menu items here as needed
];

function HeaderMenu() {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleItemClick = (item: MenuItem) => {
        if (item.path) {
            navigate(item.path);
        } else if (item.onClick) {
            item.onClick();
        }
        setIsOpen(false);
    };

    return (
        <div className="header-menu" ref={menuRef}>
            <button
                className={`header-menu__trigger ${isOpen ? 'header-menu__trigger--open' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
                aria-haspopup="true"
            >
                <MenuIcon />
                <span className="header-menu__label">Menu</span>
                <ChevronIcon isOpen={isOpen} />
            </button>

            {isOpen && (
                <div className="header-menu__dropdown">
                    {menuItems.map((item, index) => (
                        <button
                            key={index}
                            className="header-menu__item"
                            onClick={() => handleItemClick(item)}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export default HeaderMenu;
