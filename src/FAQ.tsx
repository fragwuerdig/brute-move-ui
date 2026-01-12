import { useState } from 'react';
import { GlassCard } from './GlassCard';
import './FAQ.css';

interface FAQItem {
    question: string;
    answer: string;
}

const faqItems: FAQItem[] = [
    {
        question: "What is BruteMove?",
        answer: "BruteMove is an on-chain chess platform built on Terra Classic. It allows players to stake LUNC tokens on chess games, with all moves verified by smart contracts on the blockchain."
    },
    {
        question: "How do I start playing?",
        answer: "Connect your Terra Classic wallet, then either create a new game challenge or join an existing one from the Play page. You'll need some LUNC tokens to stake on games and pay gas fees to make moves."
    },
    {
        question: "What wallets are supported?",
        answer: "BruteMove supports Keplr Wallet and Wallet Connect for Terra Classic. Make sure your wallet is connected to the Terra Classic network."
    },
    {
        question: "How does staking work?",
        answer: "When creating or joining a game, both players stake an equal amount of LUNC. The winner receives the total pot minus a small platform fee. In case of a draw, both players get their stakes back."
    },
    {
        question: "What happens if my opponent doesn't move?",
        answer: "Each game has a turn timeout. If your opponent doesn't make a move within the time limit, you can claim victory by settling the game. There's also a no-show timeout for players who never make their first move."
    },
    {
        question: "What does no-show mean?",
        answer: "A no-show occurs when a player never makes their first move within the specified no-show timeout period. In such cases, the other player can claim draw by settling the game. This mechanism is more like a conceptual decision. The games devs wanted to make sure a game can only be won or lost through timeout if both players are really committed to the board by making their first moves."
    },
    {
        question: "Can I play without staking?",
        answer: "Currently, all games require a minimum stake. This ensures both players are committed to completing the game."
    },
    {
        question: "How are moves verified?",
        answer: "All moves are validated by the smart contract on-chain. The contract enforces chess rules, so illegal moves are rejected at the backend layer. This ensures fair play without requiring trust between players."
    },
    {
        question: "What is the platform fee?",
        answer: "A small percentage fee is taken from the winning pot to support platform development and maintenance. The exact fee is displayed when creating or joining a game."
    },
    {
        question: "Can I analyze my games?",
        answer: "Yes! After a game is finished, you can enter exploration mode and enable the Stockfish engine to analyze positions, see the best moves, and review your gameplay."
    },
    {
        question: "How do I challenge a specific player?",
        answer: "When creating a game, you can enter a recipient address to send a directed challenge. Only that player will be able to join your game."
    },
    {
        question: "How does draw offer work in BruteMove! ?",
        answer: "You can deliver a draw offer alongside with your next move by toggling the 'Offer Draw' option and then make a board move. If your opponent accepts, the game ends in a draw and both players receive their stakes back. This \"commit move and draw offer\" is the official FIDE method for offering draws in chess."
    },
    {
        question: "How do I claim my winnings?",
        answer: "After winning a game, a 'Claim Reward' button will appear. Click it to transfer your winnings from the game contract to your wallet."
    },
    {
        question: "Can I get notifications on game events?",
        answer: "Yes! You can follow the BruteMove Telegram bot to receive notifications when it's your turn, when opponents join your challenges, and other game events. Hit the green bell in the application header for easy one-click setup!"
    },
    {
        question: "What game categories are there?",
        answer: "Currently, BruteMove only supports daily games with a reset time control. This means the move clock runs for at least 24 hours, and after a player makes a move, the timeout resets to the initial value (24 hours). Other time controls exist in chess, such as live games where players have a global clock for all their moves that counts down during their turn. Additional game categories will be added to the platform soon."
    },
    {
        question: "Will BruteMove! offer tournaments?",
        answer: "Yes! Tournaments are planned for future updates. They will allow multiple players to compete in structured formats with brackets and prizes."
    },
    {
        question: "I want to analyze my games on other platforms... Can I export my games?",
        answer: "Yes! You can export the PGN (Portable Game Notation) file by clicking the export button on the game page. PGN is a standard format for recording chess games. This allows you to analyze your games using other chess software or platforms."
    }
];

// Chevron icon for accordion
const ChevronIcon = ({ isOpen }: { isOpen: boolean }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`faq-chevron ${isOpen ? 'faq-chevron--open' : ''}`}
    >
        <polyline points="6 9 12 15 18 9" />
    </svg>
);

function FAQ() {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    const toggleItem = (index: number) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    return (
        <div className="faq-container">
            <div className="faq-header">
                <h1 className="faq-header__title">Frequently Asked Questions</h1>
                <p className="faq-header__subtitle">Everything you need to know about BruteMove</p>
            </div>

            <GlassCard accent>
                <div className="faq-list">
                    {faqItems.map((item, index) => (
                        <div
                            key={index}
                            className={`faq-item ${openIndex === index ? 'faq-item--open' : ''}`}
                        >
                            <button
                                className="faq-item__question"
                                onClick={() => toggleItem(index)}
                                aria-expanded={openIndex === index}
                            >
                                <span>{item.question}</span>
                                <ChevronIcon isOpen={openIndex === index} />
                            </button>
                            <div className="faq-item__answer">
                                <p>{item.answer}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </GlassCard>
        </div>
    );
}

export default FAQ;
