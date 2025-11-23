// chaos-tetris-backend/src/managers/PlayerManager.ts

interface Player {
    id: string;
    name: string;
    roomId: string | null;
}

export class PlayerManager {
    private players: Map<string, Player> = new Map();

    addPlayer(id: string, name: string): Player {
        const player: Player = { id, name, roomId: null };
        this.players.set(id, player);
        console.log(`Player ${name} (${id}) added.`);
        return player;
    }

    removePlayer(id: string) {
        if (this.players.has(id)) {
            const player = this.players.get(id);
            this.players.delete(id);
            console.log(`Player ${player?.name} (${id}) removed.`);
        }
    }

    getPlayer(id: string): Player | undefined {
        return this.players.get(id);
    }

    assignPlayerToRoom(playerId: string, roomId: string) {
        if (this.players.has(playerId)) {
            this.players.get(playerId)!.roomId = roomId;
        }
    }
}