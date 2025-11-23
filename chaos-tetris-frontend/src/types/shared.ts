export interface Player {
    id: string;
    name: string;
    isDead?: boolean;
    score?: number;
    skinId?: string;
}

export interface OpponentState {
    playerId: string;
    board: any;
    score: number;
    gameTime: number;
    isGameOver: boolean;
    isDead?: boolean;
    currentPiece?: {
        shape: number[][];
        x: number;
        y: number;
        color: string;
    };
    skinId?: string;
    targetingMode?: string;
}

export interface ChatMessage {
    id: string;
    senderId: string;
    senderName: string;
    content: string;
    timestamp: number;
    isSystem?: boolean;
}

export interface Emote {
    id: string;
    symbol: string; // Emoji or URL
    name: string;
}
