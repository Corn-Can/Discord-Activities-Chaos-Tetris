import { io, Socket } from 'socket.io-client';

class SocketService {
    public socket: Socket;

    constructor() {
        // Connect to the backend server
        // If running in Discord (discordsays.com), use relative path to avoid CSP errors.
        // The Discord Proxy will forward this to the backend via URL Mappings.
        const isDiscord = window.location.hostname.includes('discordsays.com');
        const backendUrl = isDiscord
            ? '/'
            : (process.env.REACT_APP_BACKEND_URL || 'http://localhost:3002');

        console.log(`🔌 Socket connecting to: ${backendUrl} (Discord Mode: ${isDiscord})`);

        const socketOptions: any = {
            transports: ['websocket', 'polling'], // Try websocket first, fallback to polling
            withCredentials: true
        };

        // If in Discord, route through the /api mapping
        if (isDiscord) {
            socketOptions.path = '/api/socket.io';
        }

        this.socket = io(backendUrl, socketOptions);

        this.setupListeners();
    }

    private setupListeners(): void {
        this.socket.on('connect', () => {
            console.log('Connected to WebSocket server!');
            // Perform a connection test
            this.testConnection();
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from WebSocket server.');
        });

        this.socket.on('test:pong', () => {
            console.log('Received pong from server. Connection is working!');
        });

        this.socket.on('player:joined', (player) => {
            console.log('Player joined:', player);
        });

        this.socket.on('player:left', (player) => {
            console.log('Player left:', player);
        });

        this.socket.on('skill:applied', (data) => {
            console.log('Skill applied:', data);
        });
    }
    public sendAttack(lines: number) {
        this.socket.emit('game:attack', { lines });
    }

    public testConnection(): void {
        console.log('Sending ping to server...');
        this.socket.emit('test:ping');
    }

    public joinRoom(roomId: string, playerName: string) {
        this.socket.emit('room:join', { roomId, playerName });
    }

    public leaveRoom(roomId: string) {
        this.socket.emit('room:leave', { roomId });
    }

    public sendMove(direction: 'left' | 'right' | 'down') {
        this.socket.emit('game:move', { direction });
    }

    public sendRotate(direction: 'clockwise' | 'counter-clockwise') {
        this.socket.emit('game:rotate', { direction });
    }

    public sendDrop() {
        this.socket.emit('game:drop');
    }

    public sendSkillCast(skillId: string, targetPlayerId: string) {
        this.socket.emit('skill:cast', { skillId, targetPlayerId });
    }

    public requestStartGame() {
        this.socket.emit('game:start-request');
    }

    public sendGameState(state: { board: any, score: number, gameTime: number, isGameOver: boolean, currentPiece?: any }) {
        this.socket.emit('game:state', state);
    }

    public sendChatMessage(message: string) {
        this.socket.emit('chat:send', { message });
    }

    public sendEmote(emoteId: string) {
        this.socket.emit('emote:send', { emoteId });
    }

    public disconnect(): void {
        if (this.socket) {
            this.socket.disconnect();
        }
    }
}

// Export a singleton instance
export const socketService = new SocketService();
