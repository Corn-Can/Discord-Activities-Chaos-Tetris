// chaos-tetris-backend/src/managers/GameManager.ts

import { Server } from 'socket.io';

// Define an interface for GameEngine to avoid direct dependency on frontend code
interface IGameEngine {
    movePiece(direction: 'left' | 'right' | 'down'): void;
    rotatePiece(direction: 'clockwise' | 'counter-clockwise'): void;
    dropPiece(): void;
    // Add any other methods/properties from GameEngine that are used here
}

interface PlayerState {
    id: string;
    name: string;
    gameEngine: any; // 簡化型別
    isDead: boolean; // ✅ 新增：追蹤是否死亡
    score: number;   // ✅ 新增：追蹤分數 (用於最後結算排名)
}
interface Room {
    id: string;
    hostId: string;     // ✅ 新增：房主 ID
    players: Map<string, PlayerState>;
    gameLoop: NodeJS.Timeout | null;
    seed: number;       // ✅ 新增：隨機種子
    isRunning: boolean; // ✅ 新增：遊戲狀態
}

export class GameManager {
    private rooms: Map<string, Room> = new Map();
    private io: Server;

    constructor(io: Server) {
        this.io = io;
    }

    createRoom(roomId: string, hostId: string) {
        if (!this.rooms.has(roomId)) {
            this.rooms.set(roomId, {
                id: roomId,
                hostId: hostId, // ✅ 設定房主
                players: new Map(),
                gameLoop: null,
                seed: Date.now(), // 初始種子
                isRunning: false  // 初始狀態
            });
            console.log(`Room ${roomId} created by host ${hostId}.`);
        }
    }

    joinRoom(socketId: string, roomId: string, name: string) {
        if (!this.rooms.has(roomId)) {
            this.createRoom(roomId, socketId); // ✅ 第一個進來的人就是房主
        }
        const room = this.rooms.get(roomId)!;
        const isLateJoiner = room.isRunning;
        
        const playerState: PlayerState = { id: socketId, name: name, gameEngine: {} as IGameEngine, isDead: isLateJoiner, score: 0 };
        room.players.set(socketId, playerState);
        
        // ✅ 這裡發送 update 後的 room state (包含 host 資訊)
        this.io.to(socketId).emit('room:state', this.getRoomState(roomId));
        console.log(`${name} (${socketId}) joined room ${roomId} ${isLateJoiner ? '[SPECTATOR]' : ''}`);
    }

    leaveRoom(socketId: string, roomId: string) {
        const room = this.rooms.get(roomId);
        if (room) {
            room.players.delete(socketId);
            this.io.to(roomId).emit('player:left', { id: socketId });
            
            if (room.players.size === 0) {
                this.stopGameLoop(roomId);
                this.rooms.delete(roomId);
            } else {
                // ✅ 如果遊戲正在進行中有人中離，也要檢查勝利條件 (例如 2人玩，1人拔線，另一個要贏)
                if (room.isRunning) {
                    this.checkWinCondition(room);
                }
                
                // 移交房主權限
                if (room.hostId === socketId) {
                    const nextHostId = room.players.keys().next().value;
                    if (nextHostId) {
                        room.hostId = nextHostId;
                        this.io.to(roomId).emit('room:state', this.getRoomState(roomId));
                    }
                }
            }
        }
    }
    getRoomState(roomId: string) {
        const room = this.rooms.get(roomId);
        if (room) {
            return {
                id: room.id,
                hostId: room.hostId,       // ✅ 回傳房主 ID
                isRunning: room.isRunning, // ✅ 回傳遊戲狀態
                players: Array.from(room.players.values()).map(p => ({ 
                    id: p.id, 
                    name: p.name,
                    isDead: p.isDead,
                    score: p.score
                }))
            };
        }
        return null;
    }

    startGameLoop(roomId: string) {
        const room = this.rooms.get(roomId);
        if (room && !room.gameLoop) {
            room.gameLoop = setInterval(() => {
                room.players.forEach(player => {
                    // Server-side game loop logic would go here
                });
            }, 1000);
        }
    }

    handleStartGame(socketId: string, roomId: string) {
        const room = this.rooms.get(roomId);
        if (!room) return;

        // 驗證是否為房主
        if (room.hostId !== socketId) {
            console.warn(`Player ${socketId} tried to start game but is not host.`);
            return;
        }

        room.isRunning = true;
        room.seed = Date.now(); // 產生一個新的隨機種子 (或是用 Math.random())
        room.players.forEach(player => {
            player.isDead = false; // 復活！
            player.score = 0;      // 分數歸零
        });
        console.log(`Game starting in room ${roomId} with seed ${room.seed}`);

        // 廣播給房間所有人：遊戲開始！帶上種子
        this.io.to(roomId).emit('game:start', { seed: room.seed });
        this.io.to(roomId).emit('room:state', this.getRoomState(roomId));
    }

    stopGameLoop(roomId: string) {
        const room = this.rooms.get(roomId);
        if (room && room.gameLoop) {
            clearInterval(room.gameLoop);
            room.gameLoop = null;
        }
    }

    handlePlayerGameOver(socketId: string, roomId: string) {
        const room = this.rooms.get(roomId);
        if (!room || !room.isRunning) return;

        const player = room.players.get(socketId);
        if (player && !player.isDead) { // 確保不會重複觸發
            player.isDead = true;
            console.log(`Player ${socketId} is marked as DEAD.`);
            
            // 1. 告訴大家他死了 (更新 UI 顯示 K.O.)
            this.io.to(roomId).emit('player:dead', { playerId: socketId });

            // 2. 🔥 關鍵：立刻檢查是否只剩一人存活
            this.checkWinCondition(room);
        }
    }

    handleMove(socketId: string, roomId: string, direction: 'left' | 'right' | 'down') {
        // The server should validate the move and then broadcast the new state
        console.log(`Move from ${socketId} in ${roomId}: ${direction}`);
        this.io.to(roomId).emit('player:move', { playerId: socketId, direction });
    }

    handleRotate(socketId: string, roomId: string, direction: 'clockwise' | 'counter-clockwise') {
        console.log(`Rotate from ${socketId} in ${roomId}: ${direction}`);
        this.io.to(roomId).emit('player:rotate', { playerId: socketId, direction });
    }

    handleDrop(socketId: string, roomId: string) {
        console.log(`Drop from ${socketId} in ${roomId}`);
        this.io.to(roomId).emit('player:drop', { playerId: socketId });
    }

    handleAttack(socketId: string, roomId: string, lines: number) {
        const room = this.rooms.get(roomId);
        if (!room) return;

        // 1. 找出房間裡「除了攻擊者以外」的所有人
        const opponents = Array.from(room.players.values())
            .filter(p => p.id !== socketId)
            .map(p => p.id);

        if (opponents.length === 0) return; // 沒對手就不用送了

        // 2. 瞄準邏輯 (這裡是隨機，之後你可以改成 switch case 來切換模式)
        // 預設模式：RANDOM (隨機挑一個倒楣鬼)
        const randomIndex = Math.floor(Math.random() * opponents.length);
        const targetId = opponents[randomIndex];

        console.log(`Attack: ${socketId} sent ${lines} lines to ${targetId}`);

        // 3. 發送給目標
        this.io.to(targetId).emit('game:attacked', {
            lines,
            from: socketId // 讓受害者知道是誰打的 (之後 UI 可以顯示 "Attacked by Player A!")
        });
    }

    handleSkillCast(socketId: string, roomId: string, skillId: string, targetPlayerId: string) {
        console.log(`Skill cast from ${socketId} to ${targetPlayerId} in ${roomId}`);
        this.io.to(roomId).emit('skill:applied', { skillId, targetPlayerId });
    }

    handleGameState(socketId: string, roomId: string, state: any) {
        const room = this.rooms.get(roomId);
        if(room) {
            const player = room.players.get(socketId);
            if(player) player.score = state.score; // 更新伺服器端的紀錄
        }
        // ...原本的廣播邏輯...
        this.io.to(roomId).except(socketId).emit('player:state', { playerId: socketId, ...state });
    }

    private checkWinCondition(room: Room) {
        const players = Array.from(room.players.values());
        const alivePlayers = players.filter(p => !p.isDead);
        
        // 1. 如果房間原本就只有 1 個人 (單人測試)，他死了就結束
        if (players.length === 1 && alivePlayers.length === 0) {
            this.endGame(room, players[0].id); // 自己是贏家也是輸家，回傳自己當第一名方便顯示
            return;
        }
        // 斷線獲勝邏輯
        if (room.isRunning && players.length === 1) {
            // 直接判定剩下那個人獲勝
            this.endGame(room, players[0].id);
            return;
        }

        // 多人模式：只剩 1 人存活 -> 結束
        if (players.length > 1 && alivePlayers.length === 1) {
            const winner = alivePlayers[0];
            this.endGame(room, winner.id);
            return;
        }

        // 多人模式：全部死光 (極罕見狀況，同時死亡) -> 分數高的贏
        if (players.length > 1 && alivePlayers.length === 0) {
             // 找出分數最高的 (這裡假設你有實作分數同步 updatePlayerState)
             // 如果還沒實作分數同步，先隨便選一個
             this.endGame(room, players[0].id);
        }
    }

    private endGame(room: Room, winnerId: string) {
        room.isRunning = false;
        this.stopGameLoop(room.id); // 停止伺服器端邏輯(如果有的話)

        console.log(`Game ended in room ${room.id}. Winner: ${winnerId}`);
        
        // 廣播遊戲結束，並告知贏家是誰
        this.io.to(room.id).emit('game:end', { winnerId });
        this.io.to(room.id).emit('room:state', this.getRoomState(room.id));
    }
}
