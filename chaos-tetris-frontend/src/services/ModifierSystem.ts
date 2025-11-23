// chaos-tetris-frontend/src/services/ModifierSystem.ts
import { GameEngine, BlockType, TETROMINOS } from './GameEngine';
import { GameModifier } from '../types/modifier'; // Import from types
import { SkillId } from '../types/skill';

// Helper function for unique IDs
const generateId = () => Math.random().toString(36).substring(2, 9);

// --- Concrete Modifier Implementations ---

export class ReverseVModifier implements GameModifier {
  id: string;
  name: string = '上下顛倒';
  duration: number;
  targetPlayerId: string | null;
  appliedAt: number = performance.now();
  skillId: SkillId = SkillId.ReverseV;

  constructor(duration: number, targetPlayerId: string | null) {
    this.id = generateId();
    this.duration = duration;
    this.targetPlayerId = targetPlayerId;
  }

  apply(gameEngine: GameEngine): void {
    gameEngine.verticalReverseCount++;
    console.log(`Modifier ${this.name} applied to ${this.targetPlayerId || 'self'}.`);
  }
  remove(gameEngine: GameEngine): void {
    gameEngine.verticalReverseCount--;
    console.log(`Modifier ${this.name} removed from ${this.targetPlayerId || 'self'}.`);
  }
  update(gameEngine: GameEngine, deltaTime: number): void { }
}

export class ReverseHModifier implements GameModifier {
  id: string;
  name: string = '鏡像操作';
  duration: number;
  targetPlayerId: string | null;
  appliedAt: number = performance.now();
  skillId: SkillId = SkillId.ReverseH;

  constructor(duration: number, targetPlayerId: string | null) {
    this.id = generateId();
    this.duration = duration;
    this.targetPlayerId = targetPlayerId;
  }

  apply(gameEngine: GameEngine): void {
    gameEngine.horizontalReverseCount++;
    console.log(`Modifier ${this.name} applied to ${this.targetPlayerId || 'self'}.`);
  }
  remove(gameEngine: GameEngine): void {
    gameEngine.horizontalReverseCount--;
    console.log(`Modifier ${this.name} removed from ${this.targetPlayerId || 'self'}.`);
  }
  update(gameEngine: GameEngine, deltaTime: number): void { }
}

export class DigHoleModifier implements GameModifier {
  id: string;
  name: string = '挖洞';
  duration: number = 0; // One-time effect
  targetPlayerId: string | null;
  appliedAt: number = performance.now();
  skillId: SkillId = SkillId.DigHole;

  constructor(targetPlayerId: string | null) {
    this.id = generateId();
    this.targetPlayerId = targetPlayerId;
  }

  apply(gameEngine: GameEngine): void {
    const holesToDig = 4;
    let dugCount = 0;
    let attempts = 0;
    const MAX_ATTEMPTS = 50; // Prevent infinite loop

    // Safety check: Ensure there are actually blocks to dig
    const hasBlocks = gameEngine.board.some(row => row.some(cell => cell !== BlockType.EMPTY));
    if (!hasBlocks) {
      console.log("DigHoleModifier: No blocks to dig.");
      return;
    }

    while (dugCount < holesToDig && attempts < MAX_ATTEMPTS) {
      attempts++;
      const randX = Math.floor(Math.random() * gameEngine.BOARD_WIDTH);
      const randY = Math.floor(Math.random() * (gameEngine.BOARD_HEIGHT - 5)) + 5; // Avoid digging too low

      if (gameEngine.board[randY] && gameEngine.board[randY][randX] !== BlockType.EMPTY) {
        gameEngine.board[randY][randX] = BlockType.EMPTY;
        dugCount++;
      }
    }
    gameEngine.notifyListeners(); // Notify to re-render board
    console.log(`Modifier ${this.name} applied to ${this.targetPlayerId || 'self'} (Dug ${dugCount} holes).`);
  }
  remove(gameEngine: GameEngine): void { } // One-time effect, no removal
  update(gameEngine: GameEngine, deltaTime: number): void { }
}

export class ColorFlashModifier implements GameModifier {
  id: string;
  name: string = '色盲';
  duration: number;
  targetPlayerId: string | null;
  appliedAt: number = performance.now();
  skillId: SkillId = SkillId.ColorFlash;

  constructor(duration: number, targetPlayerId: string | null) {
    this.id = generateId();
    this.duration = duration;
    this.targetPlayerId = targetPlayerId;
  }

  apply(gameEngine: GameEngine): void {
    gameEngine.colorFlashCount++;
    console.log(`Modifier ${this.name} applied to ${this.targetPlayerId || 'self'}.`);
  }
  remove(gameEngine: GameEngine): void {
    gameEngine.colorFlashCount--;
    console.log(`Modifier ${this.name} removed from ${this.targetPlayerId || 'self'}.`);
  }
  update(gameEngine: GameEngine, deltaTime: number): void { }
}

export class JumpBoardModifier implements GameModifier {
  id: string;
  name: string = '彈跳模式';
  duration: number;
  targetPlayerId: string | null;
  appliedAt: number = performance.now();
  skillId: SkillId = SkillId.JumpBoard;

  constructor(duration: number, targetPlayerId: string | null) {
    this.id = generateId();
    this.duration = duration;
    this.targetPlayerId = targetPlayerId;
  }

  apply(gameEngine: GameEngine): void {
    gameEngine.jumpBoardCount++;
    console.log(`Modifier ${this.name} applied to ${this.targetPlayerId || 'self'}.`);
  }
  remove(gameEngine: GameEngine): void {
    gameEngine.jumpBoardCount--;
    console.log(`Modifier ${this.name} removed from ${this.targetPlayerId || 'self'}.`);
  }
  update(gameEngine: GameEngine, deltaTime: number): void { }
}

export class SpeedBoostModifier implements GameModifier {
  id: string;
  name: string = '肥宅快樂水';
  duration: number;
  targetPlayerId: string | null;
  appliedAt: number = performance.now();
  skillId: SkillId = SkillId.SpeedBoost;

  constructor(duration: number, targetPlayerId: string | null) {
    this.id = generateId();
    this.duration = duration;
    this.targetPlayerId = targetPlayerId;
  }

  apply(gameEngine: GameEngine): void {
    gameEngine.speedMultiplier *= 2; // Double speed
    gameEngine.startGameLoop(); // Restart game loop with new drop time
    console.log(`Modifier ${this.name} applied to ${this.targetPlayerId || 'self'}.`);
  }
  remove(gameEngine: GameEngine): void {
    gameEngine.speedMultiplier /= 2; // Restore speed
    gameEngine.startGameLoop(); // Restart game loop with original drop time
    console.log(`Modifier ${this.name} removed from ${this.targetPlayerId || 'self'}.`);
  }
  update(gameEngine: GameEngine, deltaTime: number): void { }
}
