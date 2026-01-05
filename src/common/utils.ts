import { Chess } from 'chess.js';

/**
 * Converts an array of UCI moves to PGN format.
 * UCI moves are in the format "e2e4", "e7e5", "g1f3", etc.
 * Promotions are indicated by appending the piece letter: "e7e8q"
 *
 * @param uciMoves - Array of UCI move strings (e.g., ["e2e4", "e7e5", "g1f3"])
 * @param headers - Optional PGN headers (e.g., { White: "Player1", Black: "Player2" })
 * @returns PGN string
 */
export function uciToPgn(
    uciMoves: string[],
    headers?: {
        White?: string;
        Black?: string;
        Event?: string;
        Site?: string;
        Date?: string;
        Round?: string;
        Result?: string;
    }
): string {
    const chess = new Chess();

    // Set headers if provided
    if (headers) {
        Object.entries(headers).forEach(([key, value]) => {
            if (value) {
                chess.header(key, value);
            }
        });
    }

    // Play each UCI move
    for (const uci of uciMoves) {
        const from = uci.slice(0, 2);
        const to = uci.slice(2, 4);
        const promotion = uci.length > 4 ? uci[4] : undefined;

        const move = chess.move({
            from,
            to,
            promotion: promotion as 'q' | 'r' | 'b' | 'n' | undefined,
        });

        if (!move) {
            throw new Error(`Invalid UCI move: ${uci}`);
        }
    }

    return chess.pgn();
}

/**
 * Converts an array of UCI moves to a PGN string with game result.
 * Automatically determines the result based on the final position.
 *
 * @param uciMoves - Array of UCI move strings
 * @param whitePlayer - Name of the white player
 * @param blackPlayer - Name of the black player
 * @returns PGN string with result
 */
export function uciToPgnWithResult(
    uciMoves: string[],
    whitePlayer?: string,
    blackPlayer?: string
): string {
    const chess = new Chess();

    // Play each UCI move
    for (const uci of uciMoves) {
        const from = uci.slice(0, 2);
        const to = uci.slice(2, 4);
        const promotion = uci.length > 4 ? uci[4] : undefined;

        const move = chess.move({
            from,
            to,
            promotion: promotion as 'q' | 'r' | 'b' | 'n' | undefined,
        });

        if (!move) {
            throw new Error(`Invalid UCI move: ${uci}`);
        }
    }

    // Determine result
    let result = '*';
    if (chess.isCheckmate()) {
        result = chess.turn() === 'w' ? '0-1' : '1-0';
    } else if (chess.isDraw()) {
        result = '1/2-1/2';
    }

    // Set headers
    chess.header('Event', 'BruteMove Game');
    chess.header('Site', 'BruteMove');
    chess.header('Date', new Date().toISOString().split('T')[0].replace(/-/g, '.'));
    if (whitePlayer) chess.header('White', whitePlayer);
    if (blackPlayer) chess.header('Black', blackPlayer);
    chess.header('Result', result);

    return chess.pgn();
}
