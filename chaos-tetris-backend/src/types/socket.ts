// chaos-tetris-backend/src/types/socket.ts

//import { TetrisPiece, BlockType } from "../../../chaos-tetris-frontend/src/services/GameEngine.ts"; // This path is incorrect and needs to be resolved

export interface ServerToClientEvents {
  'room:state': (room: { 
      id: string, 
      hostId: string, // ✅ 新增這個
      isRunning: boolean, // ✅ 新增這個
      players: { id: string, name: string }[] 
  }) => void;
  
  'player:joined': (player: { id: string, name: string }) => void;
  'player:left': (player: { id: string }) => void;
  'game:start': (data: { seed: number }) => void;
  'game:state': (gameState: any) => void;
  'skill:applied': (data: { skillId: string; targetPlayerId: string }) => void;
  'game:end': (results: any) => void;

  'game:attacked': (data: { lines: number, from: string }) => void;
}

export interface ClientToServerEvents {
  'room:join': (data: { roomId: string; playerName: string }) => void;
  'room:leave': (data: { roomId: string }) => void;
  'game:start-request': () => void; // ✅ 新增請求
  'game:state': (gameState: any) => void;
  'game:move': (data: { direction: 'left' | 'right' | 'down' }) => void;
  'game:rotate': (data: { direction: 'clockwise' | 'counter-clockwise' }) => void;
  'game:drop': () => void;
  'skill:cast': (data: { skillId: string; targetPlayerId: string }) => void;
  'game:attack': (data: { lines: number }) => void;
}