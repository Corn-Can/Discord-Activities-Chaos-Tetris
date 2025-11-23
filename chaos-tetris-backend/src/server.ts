import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { GameManager } from './managers/GameManager';
import { PlayerManager } from './managers/PlayerManager';

dotenv.config();

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const gameManager = new GameManager(io);
const playerManager = new PlayerManager();

app.get('/', (req, res) => {
  res.send('<h1>Chaos Tetris Backend Running</h1>');
});

io.on('connection', (socket) => {
  console.log('a user connected:', socket.id);

  socket.on('room:join', ({ roomId, playerName }) => {
    playerManager.addPlayer(socket.id, playerName);
    const player = playerManager.getPlayer(socket.id);
    if (player) {
      gameManager.joinRoom(socket.id, roomId, playerName);
      player.roomId = roomId;
      socket.join(roomId);

      socket.to(roomId).emit('player:joined', { id: socket.id, name: playerName });
      socket.emit('room:state', gameManager.getRoomState(roomId));
    }
  });

  socket.on('room:leave', ({ roomId }) => {
    socket.leave(roomId);
    gameManager.leaveRoom(socket.id, roomId);
    socket.to(roomId).emit('player:left', { id: socket.id });
    const player = playerManager.getPlayer(socket.id);
    if (player) player.roomId = null;
  });

  socket.on('disconnect', () => {
    console.log('user disconnected:', socket.id);
    const player = playerManager.getPlayer(socket.id);
    if (player && player.roomId) {
      gameManager.leaveRoom(socket.id, player.roomId);
      socket.to(player.roomId).emit('player:left', { id: socket.id });
    }
    playerManager.removePlayer(socket.id);
  });

  socket.on('game:start-request', () => {
    const player = playerManager.getPlayer(socket.id);
    if (player && player.roomId) {
      // 呼叫 GameManager 處理開始邏輯
      gameManager.handleStartGame(socket.id, player.roomId);
    }
  });

  socket.on('game:move', ({ direction }) => {
    const player = playerManager.getPlayer(socket.id);
    if (player && player.roomId) gameManager.handleMove(socket.id, player.roomId, direction);
  });

  socket.on('game:rotate', ({ direction }) => {
    const player = playerManager.getPlayer(socket.id);
    if (player && player.roomId) gameManager.handleRotate(socket.id, player.roomId, direction);
  });

  socket.on('game:drop', () => {
    const player = playerManager.getPlayer(socket.id);
    if (player && player.roomId) gameManager.handleDrop(socket.id, player.roomId);
  });

  socket.on('skill:cast', ({ skillId, targetPlayerId }) => {
    const player = playerManager.getPlayer(socket.id);
    if (player && player.roomId) gameManager.handleSkillCast(socket.id, player.roomId, skillId, targetPlayerId);
  });

  socket.on('game:state', (state) => {
    const player = playerManager.getPlayer(socket.id);
    if (player && player.roomId) {
      gameManager.handleGameState(socket.id, player.roomId, state);
    }
  });

  socket.on('game:attack', ({ lines }) => {
    const player = playerManager.getPlayer(socket.id);
    if (player && player.roomId) {
      gameManager.handleAttack(socket.id, player.roomId, lines);
    }
  });

  socket.on('game:over', () => {
    const player = playerManager.getPlayer(socket.id);
    if (player && player.roomId) {
      // 呼叫剛才寫好的邏輯
      gameManager.handlePlayerGameOver(socket.id, player.roomId);
    }
  });

  // Chat system
  socket.on('chat:send', ({ message }) => {
    const player = playerManager.getPlayer(socket.id);
    if (player && player.roomId && message) {
      const chatMessage = {
        id: `${socket.id}-${Date.now()}`,
        senderId: socket.id,
        senderName: player.name,
        content: message.trim(),
        timestamp: Date.now(),
        isSystem: false
      };

      // Broadcast to all players in the room (including sender)
      io.to(player.roomId).emit('chat:message', { message: chatMessage });
    }
  });

  // Emote system
  socket.on('emote:send', ({ emoteId }) => {
    const player = playerManager.getPlayer(socket.id);
    if (player && player.roomId && emoteId) {
      // Broadcast to all players in the room (including sender for visual feedback)
      io.to(player.roomId).emit('emote:receive', {
        playerId: socket.id,
        emoteId: emoteId
      });
    }
  });

  // Simple connection test event
  socket.on('test:ping', () => {
    console.log(`Received ping from ${socket.id}`);
    socket.emit('test:pong');
  });
});

const PORT = process.env.PORT || 3002;

server.listen(PORT, () => {
  console.log(`Server listening on *:${PORT}`);
});