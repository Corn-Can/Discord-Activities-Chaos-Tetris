// chaos-tetris-frontend/src/services/GameEngine.ts

import { ModifierPipeline } from './ModifierPipeline';
import { GameModifier } from '../types/modifier';
import { SkillCard, SKILL_DEFINITIONS, SkillId } from '../types/skill';
import { skillManager } from './SkillManager';
import { GameState } from '../types/GameState';
import { audioManager } from './AudioManager';

export interface TetrisPiece {
  shape: number[][];
  color: string;
  x: number;
  y: number;
}

export enum BlockType {
  EMPTY = 0, I = 1, J = 2, L = 3, O = 4, S = 5, T = 6, Z = 7,
  GARBAGE = 8
}

export const TETROMINOS = [
  { shape: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], color: 'cyan', type: BlockType.I },
  { shape: [[1, 0, 0], [1, 1, 1], [0, 0, 0]], color: 'blue', type: BlockType.J },
  { shape: [[0, 0, 1], [1, 1, 1], [0, 0, 0]], color: 'orange', type: BlockType.L },
  { shape: [[1, 1], [1, 1]], color: 'yellow', type: BlockType.O },
  { shape: [[0, 1, 1], [1, 1, 0], [0, 0, 0]], color: 'green', type: BlockType.S },
  { shape: [[0, 1, 0], [1, 1, 1], [0, 0, 0]], color: 'purple', type: BlockType.T },
  { shape: [[1, 1, 0], [0, 1, 1], [0, 0, 0]], color: 'red', type: BlockType.Z },
];

// SRS+ Wall Kick Data
const I_WALL_KICKS = [
  [[0, 0], [-2, 0], [+1, 0], [-2, -1], [+1, +2]],
  [[0, 0], [-1, 0], [+2, 0], [-1, +2], [+2, -1]],
  [[0, 0], [+2, 0], [-1, 0], [+2, +1], [-1, -2]],
  [[0, 0], [+1, 0], [-2, 0], [+1, -2], [-2, +1]]
];
const JLTSZ_WALL_KICKS = [
  [[0, 0], [-1, 0], [-1, +1], [0, -2], [-1, -2]],
  [[0, 0], [+1, 0], [+1, -1], [0, +2], [+1, +2]],
  [[0, 0], [+1, 0], [+1, +1], [0, -2], [+1, -2]],
  [[0, 0], [-1, 0], [-1, -1], [0, +2], [-1, +2]]
];
const I_WALL_KICKS_CCW = [
  [[0, 0], [-1, 0], [+2, 0], [-1, +2], [+2, -1]],
  [[0, 0], [+2, 0], [-1, 0], [+2, -1], [-1, +2]],
  [[0, 0], [+1, 0], [-2, 0], [+1, -2], [-2, +1]],
  [[0, 0], [-2, 0], [+1, 0], [-2, +1], [+1, -2]]
];
const JLTSZ_WALL_KICKS_CCW = [
  [[0, 0], [+1, 0], [+1, +1], [0, -2], [+1, -2]],
  [[0, 0], [+1, 0], [+1, -1], [0, +2], [+1, +2]],
  [[0, 0], [-1, 0], [-1, +1], [0, -2], [-1, -2]],
  [[0, 0], [-1, 0], [-1, -1], [0, +2], [-1, +2]]
];


type GameStateListener = (gameState: GameEngine) => void;
type GameEventCallback = (event: string, data?: any) => void;

// 簡單的線性同餘生成器 (LCG)，保證同樣的種子產生同樣的序列
class PseudoRandom {
  private seed: number;
  constructor(seed: number) {
    this.seed = seed;
  }

  // 產生 0 ~ 1 之間的浮點數 (類似 Math.random())
  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
}

export class GameEngine {
  board!: BlockType[][];
  currentPiece!: TetrisPiece;
  nextPieces: TetrisPiece[] = [];
  heldPiece: TetrisPiece | null = null;
  canHold: boolean = true;
  score!: number;
  gameTime!: number;
  isGameOver!: boolean;
  lastMoveWasTSpin: boolean = false;

  // Warning system for when blocks are close to top
  private isWarningActive: boolean = false;
  private warningLoopId: number | null = null;

  public modifierPipeline: ModifierPipeline;

  public pendingGarbage: number = 0; // 別人打過來，暫存還沒進場的垃圾
  public combo: number = -1;         // 連擊數 (-1 代表沒連擊)
  public isBackToBack: boolean = false; // 是否處於 B2B 狀態

  // skill related
  public verticalReverseCount: number = 0;
  public horizontalReverseCount: number = 0;
  public colorFlashCount: number = 0;
  public jumpBoardCount: number = 0;

  public isInputLocked: boolean = false; // Lock input during countdown
  public isPaused: boolean = false;
  public isPractice: boolean = false;

  public get isVerticalReversed(): boolean { return this.verticalReverseCount % 2 !== 0; }
  public get isHorizontalReversed(): boolean { return this.horizontalReverseCount % 2 !== 0; }
  public get isColorFlashActive(): boolean { return this.colorFlashCount > 0; }
  public get isJumpBoardActive(): boolean { return this.jumpBoardCount > 0; }

  public playerSkills: (SkillCard | null)[] = [null, null, null];
  private readonly skillAcquisitionChance: number = 0.2; // Increased for testing
  private readonly MAX_SKILLS: number = 3;
  private timeSinceLastScore: number = 0;
  private readonly CATCH_UP_INTERVAL: number = 30; // In seconds
  private rng: PseudoRandom;
  private lastDropTime: number = 0;

  // Garbage hole alignment
  private currentGarbageHole: number = -1;
  private garbageLinesInBatch: number = 0;

  public myPlayerId: string = '';

  public get activeModifiers(): GameModifier[] {
    return this.modifierPipeline.activeModifiers;
  }

  private listeners: GameStateListener[] = [];
  private eventListeners: GameEventCallback[] = [];
  private gameLoopInterval: NodeJS.Timeout | null = null;
  private stateSyncInterval: NodeJS.Timeout | null = null;
  private gameTimerInterval: NodeJS.Timeout | null = null;
  private lockDelayTimer: NodeJS.Timeout | null = null;

  private bag: number[] = [];

  public baseDropTime: number = 1000;
  public speedMultiplier: number = 1;
  public get dropTime(): number { return this.baseDropTime / this.speedMultiplier; }

  private readonly lockDelayDuration: number = 500;

  readonly BOARD_WIDTH: number;
  readonly BOARD_HEIGHT: number;
  currentPieceRotation!: number;

  constructor(boardWidth: number = 10, boardHeight: number = 20) {
    this.BOARD_WIDTH = boardWidth;
    this.BOARD_HEIGHT = boardHeight;
    this.modifierPipeline = new ModifierPipeline();
    this.rng = new PseudoRandom(Date.now());
    skillManager.init(this);
    this.restartGame();
  }

  // ✅ 新增：接收伺服器種子並開始遊戲
  public startGame(seed: number, isPractice: boolean = false) {
    console.log(`Starting game with seed: ${seed}, Practice: ${isPractice}`);
    this.isPractice = isPractice;
    this.rng = new PseudoRandom(seed); // 重置 RNG
    this.restartGame(); // 這會觸發 fillBag，使用新的 RNG
    this.startGameLoop();
  }

  public pause() {
    this.isPaused = true;
    if (this.gameLoopInterval) {
      clearInterval(this.gameLoopInterval);
      this.gameLoopInterval = null;
    }
    if (this.gameTimerInterval) {
      clearInterval(this.gameTimerInterval);
      this.gameTimerInterval = null;
    }
    this.notifyListeners();
  }

  public resume() {
    if (this.isGameOver) return;
    this.isPaused = false;
    this.startGameLoop();
    this.notifyListeners();
  }

  public setPlayerId(id: string) {
    this.myPlayerId = id;
  }

  restartGame() {
    this.board = Array(this.BOARD_HEIGHT).fill(0).map(() => Array(this.BOARD_WIDTH).fill(BlockType.EMPTY));
    this.score = 0;
    this.score = 0;
    this.gameTime = this.isPractice ? 99999 : 120; // Infinite time for practice
    this.isGameOver = false;
    this.isPaused = false;
    this.heldPiece = null;
    this.canHold = true;
    this.playerSkills = [null, null, null];
    this.timeSinceLastScore = 0;

    this.pendingGarbage = 0;
    this.combo = -1;
    this.isBackToBack = false;
    this.currentGarbageHole = -1;
    this.garbageLinesInBatch = 0;

    this.fillBag();
    this.nextPieces = [];
    for (let i = 0; i < 5; i++) {
      this.nextPieces.push(this.createPiece());
    }
    this.spawnNewPiece(true);

    // Reset all skill counters explicitly
    this.verticalReverseCount = 0;
    this.horizontalReverseCount = 0;
    this.colorFlashCount = 0;
    this.jumpBoardCount = 0;
    this.speedMultiplier = 1;

    this.modifierPipeline.clearAll(this);
    skillManager.reset();
    this.notifyListeners();
  }

  public useSkill(slotIndex: number, targetPlayerId: string) {
    const isSelfTarget = targetPlayerId === this.myPlayerId;
    // Get skill ID before using it, for event emission
    const skillCard = this.playerSkills[slotIndex];
    if (!skillCard) return;
    const skillId = skillCard.id;

    const success = skillManager.useSkill(slotIndex, isSelfTarget);
    if (success) {
      this.emitGameEvent('skill:cast', { skillId, targetPlayerId });
      this.notifyListeners();
    }
  }

  subscribe(listener: GameStateListener) {
    this.listeners.push(listener);
    listener(this);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  onGameEvent(callback: GameEventCallback) {
    this.eventListeners.push(callback);
    return () => {
      this.eventListeners = this.eventListeners.filter(l => l !== callback);
    };
  }

  private emitGameEvent(event: string, data?: any) {
    this.eventListeners.forEach(callback => callback(event, data));
  }

  public notifyListeners() {
    this.listeners.forEach(listener => listener(this));
  }

  private fillBag() {
    this.bag = Array.from({ length: TETROMINOS.length }, (_, i) => i);
    for (let i = this.bag.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng.next() * (i + 1));
      [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
    }
    console.log("New Bag Generated:", this.bag.map(i => TETROMINOS[i].type));
  }

  private createPiece(): TetrisPiece {
    if (this.bag.length === 0) this.fillBag();
    const randTetromino = TETROMINOS[this.bag.pop()!];
    return {
      shape: randTetromino.shape,
      color: randTetromino.color,
      x: Math.floor(this.BOARD_WIDTH / 2) - Math.floor(randTetromino.shape[0].length / 2),
      y: -1, // Spawn in hidden row for reliable top-out detection
    };
  }

  private spawnNewPiece(takeFromQueue: boolean = true) {
    if (takeFromQueue) {
      this.currentPiece = this.nextPieces.shift()!;
      this.nextPieces.push(this.createPiece());
    } else {
      this.currentPiece = this.nextPieces.shift()!;
    }

    this.currentPieceRotation = 0;
    this.canHold = true;
    if (this.checkCollision(this.currentPiece.x, this.currentPiece.y, this.currentPiece.shape)) {
      this.endGame();
    }
  }

  private lockPiece() {
    // Play lock sound
    audioManager.playSFX('piece_lock', 0.6);
    this.mergePiece();

    if (this.combo === -1) {
      this.applyPendingGarbage();
    }

    this.spawnNewPiece();
    this.checkBoardHeight(); // Check if warning should play
    this.notifyListeners();
  }

  // Check board height and manage warning loop
  private checkBoardHeight() {
    if (this.isGameOver) {
      this.stopWarning();
      return;
    }
    // Find highest non-empty row
    let highestRow = this.BOARD_HEIGHT;
    for (let y = 0; y < this.BOARD_HEIGHT; y++) {
      if (this.board[y].some(cell => cell !== BlockType.EMPTY)) {
        highestRow = y;
        break;
      }
    }

    // Danger zone: 5 rows or less from top
    const inDangerZone = highestRow <= 5;

    if (inDangerZone) {
      if (!this.isWarningActive) {
        this.isWarningActive = true;
        // Play warning sound as a looping SFX so it overlaps with BGM
        audioManager.playLoopingSFX('warning', 1.0);
        console.log('Warning: Board approaching top!');
      }
    } else {
      this.stopWarning();
    }
  }

  private stopWarning() {
    if (this.isWarningActive) {
      this.isWarningActive = false;
      audioManager.stopLoopingSFX('warning');
      console.log('Warning cleared');
    }
  }

  checkCollision(x: number, y: number, pieceShape: number[][]): boolean {
    for (let row = 0; row < pieceShape.length; row++) {
      for (let col = 0; col < pieceShape[row].length; col++) {
        if (pieceShape[row][col] !== 0) {
          const boardX = x + col;
          const boardY = y + row;
          if (boardX < 0 || boardX >= this.BOARD_WIDTH || boardY >= this.BOARD_HEIGHT || (boardY >= 0 && this.board[boardY][boardX] !== BlockType.EMPTY)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  mergePiece() {
    this.currentPiece.shape.forEach((row, dy) => {
      row.forEach((value, dx) => {
        if (value !== 0) {
          const boardX = this.currentPiece.x + dx;
          const boardY = this.currentPiece.y + dy;
          if (boardY >= 0 && boardY < this.BOARD_HEIGHT && boardX >= 0 && boardX < this.BOARD_WIDTH) {
            this.board[boardY][boardX] = TETROMINOS.find(t => t.color === this.currentPiece.color)?.type || BlockType.EMPTY;
          }
        }
      });
    });
    this.clearLines();
  }

  holdPiece() {
    if (!this.canHold || this.isGameOver || this.isInputLocked) return;
    this.canHold = false;
    this.resetLockDelay();

    const initialShape = TETROMINOS.find(t => t.type === TETROMINOS.find(t2 => t2.color === this.currentPiece.color)?.type)!.shape;
    const pieceToHold = { ...this.currentPiece, shape: initialShape };

    if (this.heldPiece) {
      [this.currentPiece, this.heldPiece] = [this.heldPiece, pieceToHold];

      this.currentPiece.x = Math.floor(this.BOARD_WIDTH / 2) - Math.floor(this.currentPiece.shape[0].length / 2);
      this.currentPiece.y = 0;

    } else {
      this.heldPiece = pieceToHold;
      this.spawnNewPiece();
    }
    this.currentPieceRotation = 0;
    this.notifyListeners();
  }

  public startGameLoop() {
    if (this.gameLoopInterval) clearInterval(this.gameLoopInterval);
    if (this.gameTimerInterval) clearInterval(this.gameTimerInterval);
    if (this.stateSyncInterval) clearInterval(this.stateSyncInterval);
    if (this.isPaused) return;

    this.lastDropTime = Date.now();

    this.gameLoopInterval = setInterval(() => {
      if (!this.isPaused) this.update();
    }, 16); // ~60 FPS

    this.gameTimerInterval = setInterval(() => {
      if (!this.isGameOver && !this.isPaused) {
        if (this.isPractice) {
          // Infinite mode: do not decrease time
        } else {
          this.gameTime--;
          if (this.gameTime <= 0) {
            this.gameTime = 0;
            this.endGame();
          }
        }

        // Check for skill acquisition (catch-up mechanic) - Disable in Practice
        if (!this.isPractice) {
          this.timeSinceLastScore++;
          if (this.timeSinceLastScore >= this.CATCH_UP_INTERVAL) {
            this.tryAcquireSkillCard();
            this.timeSinceLastScore = 0;
          }
        }

        this.notifyListeners();
      }
    }, 1000);

    // 步驟 B: 新增狀態同步迴圈 (20Hz)
    this.stateSyncInterval = setInterval(() => {
      if (this.isGameOver) return;

      // 擷取一個簡潔的狀態物件
      const currentState = {
        board: this.board,
        score: this.score,
        gameTime: this.gameTime,
        isGameOver: this.isGameOver,
        currentPiece: this.currentPiece
      };
      this.emitGameEvent('state', currentState);
    }, 50);
  }

  private update() {
    if (this.isGameOver || this.isPaused) return;

    const now = Date.now();
    if (now - this.lastDropTime > this.dropTime) {
      // console.log("Dropping piece...", this.currentPiece.y); // Debug log
      this.movePiece('down');
      this.lastDropTime = now;
    }

    this.modifierPipeline.update(this, 16);
  }

  private endGame() {
    if (this.isPractice) {
      audioManager.playSFX('game_over', 1.0);
      this.restartGame();
      return;
    }
    this.isGameOver = true;
    this.stopGameLoop();
    audioManager.playSFX('game_over', 1.0);
    this.notifyListeners();
    // Ensure final state is sent so spectators see the death
    this.emitGameEvent('state', {
      board: this.board,
      score: this.score,
      gameTime: this.gameTime,
      isGameOver: true,
      currentPiece: this.currentPiece
    });
    this.emitGameEvent('game:over');
  }

  stopGameLoop() {
    if (this.gameLoopInterval) clearInterval(this.gameLoopInterval);
    if (this.gameTimerInterval) clearInterval(this.gameTimerInterval);
    if (this.stateSyncInterval) clearInterval(this.stateSyncInterval);
    this.stopWarning(); // Stop warning sound when game stops
    this.gameLoopInterval = null;
    this.gameTimerInterval = null;
    this.stateSyncInterval = null;

    audioManager.stopAllSFX();

    if (this.isGameOver) {
      console.log("Sending game:over signal to server");
      this.emitGameEvent('game:over');
    }
  }

  private rotateMatrix(matrix: number[][], direction: 'clockwise' | 'counter-clockwise'): number[][] {
    const N = matrix.length;
    return matrix.map((row, i) =>
      row.map((_, j) => {
        if (direction === 'clockwise') return matrix[N - 1 - j][i];
        return matrix[j][N - 1 - i];
      })
    );
  }

  private resetLockDelay() {
    if (this.lockDelayTimer) {
      clearTimeout(this.lockDelayTimer);
      this.lockDelayTimer = null;
    }
  }

  movePiece(direction: 'left' | 'right' | 'down') {
    if (this.isGameOver || this.isInputLocked) return;

    let actualDirection = direction;
    // Restore Horizontal reverse: swap left/right keys
    if (direction !== 'down' && this.isHorizontalReversed) {
      actualDirection = direction === 'left' ? 'right' : 'left';
    }

    this.emitGameEvent('move', actualDirection); // Send move to server
    let newX = this.currentPiece.x;
    let newY = this.currentPiece.y;

    if (direction !== 'down') this.lastMoveWasTSpin = false;

    if (actualDirection === 'left') newX--;
    if (actualDirection === 'right') newX++;
    if (actualDirection === 'down') newY++;

    if (!this.checkCollision(newX, newY, this.currentPiece.shape)) {
      this.resetLockDelay();
      this.currentPiece.x = newX;
      this.currentPiece.y = newY;
      // Play move sound (very subtle)
      if (direction !== 'down') {
        audioManager.playSFX('piece_move', 0.3);
      }
    } else if (direction === 'down') {
      // Collision on down move
      if (!this.lockDelayTimer) {
        // Start lock delay if not already started
        console.log('Collision detected, starting lock delay');
        this.lockDelayTimer = setTimeout(() => this.lockPiece(), this.lockDelayDuration);
      }
      this.notifyListeners();
      return true;
    }
    this.notifyListeners();
    return false;
  }

  rotatePiece(clockwise: boolean = true) {
    if (this.isGameOver || this.isInputLocked) return;

    let actualDirection: 'clockwise' | 'counter-clockwise' = clockwise ? 'clockwise' : 'counter-clockwise';
    // Restore Vertical reverse: swap rotation direction
    if (this.isVerticalReversed) {
      actualDirection = actualDirection === 'clockwise' ? 'counter-clockwise' : 'clockwise';
    }

    this.emitGameEvent('rotate', actualDirection); // Send rotate to server
    this.lastMoveWasTSpin = false;

    const rotatedShape = this.rotateMatrix(this.currentPiece.shape, actualDirection);
    const pieceType = TETROMINOS.find(t => t.color === this.currentPiece.color)?.type;

    const isClockwise = actualDirection === 'clockwise';
    const oldRotation = this.currentPieceRotation;
    const newRotation = (oldRotation + (isClockwise ? 1 : 3)) % 4;

    let kickData = (pieceType === BlockType.I) ? (isClockwise ? I_WALL_KICKS : I_WALL_KICKS_CCW) : (isClockwise ? JLTSZ_WALL_KICKS : JLTSZ_WALL_KICKS_CCW);
    let kickTests = kickData[oldRotation];

    for (const [offsetX, offsetY] of kickTests) {
      let testX = this.currentPiece.x + offsetX;
      let testY = this.currentPiece.y - offsetY;

      if (!this.checkCollision(testX, testY, rotatedShape)) {
        this.currentPiece.shape = rotatedShape;
        this.currentPiece.x = testX;
        this.currentPiece.y = testY;
        this.currentPieceRotation = newRotation;
        this.resetLockDelay();
        if (this.checkCollision(testX, testY + 1, rotatedShape)) {
          this.lockDelayTimer = setTimeout(() => this.lockPiece(), this.lockDelayDuration);
        }

        if (pieceType === BlockType.T) {
          const centerX = testX + 1;
          const centerY = testY + 1;
          const corners = [this.board[centerY - 1]?.[centerX - 1], this.board[centerY - 1]?.[centerX + 1], this.board[centerY + 1]?.[centerX - 1], this.board[centerY + 1]?.[centerX + 1]];
          if (corners.filter(c => c !== undefined && c !== BlockType.EMPTY).length >= 3) {
            this.lastMoveWasTSpin = true;
          }
        }
        // Play rotation sound
        audioManager.playSFX('piece_rotate', 0.4);
        this.notifyListeners();
        return;
      }
    }
  }

  dropPiece() {
    if (this.isGameOver) {
      console.log("Game over, cannot drop piece.");
      return;
    }
    if (this.isInputLocked) {
      console.log("Input locked, cannot drop piece.");
      return;
    }
    this.emitGameEvent('drop'); // Send drop to server
    this.resetLockDelay();
    let newY = this.currentPiece.y;
    while (!this.checkCollision(this.currentPiece.x, newY + 1, this.currentPiece.shape)) {
      newY++;
    }
    this.currentPiece.y = newY;
    // Play hard drop sound
    // audioManager.playSFX('hard_drop', 0.7); // User requested to remove this to avoid double sound with lock
    this.lockPiece();
  }

  public applyModifier(modifier: GameModifier) {
    console.log(`[GameEngine] Applying modifier: ${modifier.name}, duration: ${modifier.duration}`);

    // 步驟 1: 檢查是否已經有相同的技能正在運作 (防止疊加導致效果抵消)
    if (modifier.duration > 0) {
      const refreshed = this.modifierPipeline.refreshDuration(modifier.skillId, modifier.duration);
      if (refreshed) {
        console.log(`[GameEngine] Modifier ${modifier.name} already active, refreshed duration.`);
        return; // 已經刷新，不需再次 apply
      }
    }

    // 步驟 2: 立即套用 Modifier 的效果
    // (這會執行 'apply' 函數，例如 isVerticalReversed = true)
    modifier.apply(this);

    // 步驟 3: 只有有持續時間的技能，才需要交給管線去倒數
    if (modifier.duration > 0) {
      this.modifierPipeline.addModifier(modifier);
    } else {
      console.log(`[GameEngine] Modifier ${modifier.name} has 0 duration, not adding to pipeline.`);
    }
  }

  private tryAcquireSkillCard() {
    if (this.rng.next() < this.skillAcquisitionChance && this.playerSkills.length < this.MAX_SKILLS) {
      const availableSkills = Object.values(SKILL_DEFINITIONS);
      const randomSkill = availableSkills[Math.floor(this.rng.next() * availableSkills.length)];
      this.playerSkills.push(randomSkill);
      console.log(`Acquired new skill: ${randomSkill.name}`);
    }
  }

  public addGarbageLines(amount: number) {
    if (this.isGameOver) return;

    // 不直接推入盤面，而是加入緩衝區
    this.pendingGarbage += amount;
    console.log(`Pending Garbage increased: ${this.pendingGarbage}`);

    this.notifyListeners(); // 通知 UI 更新紅色警告條
  }

  // ✅ 新增一個內部方法：真正執行垃圾進場 (由 lockPiece 觸發)
  private applyPendingGarbage() {
    if (this.pendingGarbage <= 0) return;

    // 這裡可以設定單次進場上限 (例如一次最多進 8 行)，避免瞬間暴斃
    // 根據你的要求：等到沒 Combo 時才加。我們這裡假設一次全加，或者你可以限制數量。
    const linesToAdd = this.pendingGarbage;

    // 執行原本的「推入盤面」邏輯
    for (let i = 0; i < linesToAdd; i++) {
      if (this.board[0].some(cell => cell !== BlockType.EMPTY)) {
        this.endGame();
        return;
      }
      this.board.shift();

      // Aligned garbage logic
      if (this.garbageLinesInBatch <= 0) {
        // Start a new batch with a new hole
        this.currentGarbageHole = Math.floor(this.rng.next() * this.BOARD_WIDTH);
        // Random batch size (e.g., 1 to 4 lines)
        this.garbageLinesInBatch = Math.floor(this.rng.next() * 4) + 1;
      }

      const garbageRow = Array(this.BOARD_WIDTH).fill(BlockType.GARBAGE);
      garbageRow[this.currentGarbageHole] = BlockType.EMPTY;
      this.garbageLinesInBatch--;

      this.board.push(garbageRow);
      this.currentPiece.y = Math.max(0, this.currentPiece.y - 1);
    }

    // 清空緩衝區
    this.pendingGarbage = 0;
    this.notifyListeners();
  }

  clearLines() {
    let linesCleared = 0;
    const newBoard: BlockType[][] = this.board.filter(row => !row.every(cell => cell !== BlockType.EMPTY));
    linesCleared = this.BOARD_HEIGHT - newBoard.length;

    if (linesCleared > 0) {
      for (let i = 0; i < linesCleared; i++) {
        newBoard.unshift(Array(this.BOARD_WIDTH).fill(BlockType.EMPTY));
      }
      this.board = newBoard;
      this.combo++;

      // Play line clear sound with pitch based on combo (max 8 octaves)
      // Pitch: 1.0 = original, each combo adds 1/8 octave
      const comboPitch = 1.0 + (Math.min(this.combo, 8) - 1) * (1.0 / 8);

      // T-Spin always uses max pitch (8th octave)
      const pitch = this.lastMoveWasTSpin ? 2.0 : comboPitch;
      // playSFX(id, volume, pitch)
      audioManager.playSFX('line_clear', 1.0, pitch);

      const isDifficult = linesCleared === 4 || this.lastMoveWasTSpin;

      let attack = 0;

      let attackLines = 0;
      switch (linesCleared) {
        case 1: attack = this.lastMoveWasTSpin ? 2 : 0; break; // T-Spin Single
        case 2: attack = this.lastMoveWasTSpin ? 4 : 1; break; // T-Spin Double / Normal Double
        case 3: attack = this.lastMoveWasTSpin ? 6 : 2; break; // T-Spin Triple / Normal Triple
        case 4: attack = 4; break; // Tetris
      }
      if (isDifficult && this.isBackToBack) {
        attack += 1;
        console.log("Back-to-Back Bonus!");
      } else if (isDifficult) {
        // 這次是難度動作，開啟 B2B 狀態
        this.isBackToBack = true;
      } else {
        // 這次是普通消行，中斷 B2B
        this.isBackToBack = false;
      }
      if (this.combo > 0) {
        const comboBonus = Math.floor(this.combo / 2); // 每 2 Combo +1 攻擊
        attack += comboBonus;
      }

      if (attack > 0) {
        if (this.pendingGarbage > 0) {
          // 如果有待處理垃圾，先抵消
          if (attack >= this.pendingGarbage) {
            // 攻擊力夠高，抵消全部垃圾，剩下的打出去
            attack -= this.pendingGarbage;
            this.pendingGarbage = 0;
            // 剩下的 attack 繼續往下走
          } else {
            // 攻擊力不夠，只能抵消一部分
            this.pendingGarbage -= attack;
            attack = 0; // 攻擊力被耗盡，沒東西打出去了
          }
        }
      }

      // 8. 發送攻擊 (如果還有剩餘攻擊力)
      if (attack > 0) {
        console.log(`Sending attack: ${attack} lines (Combo: ${this.combo}, B2B: ${this.isBackToBack})`);
        this.emitGameEvent('attack', attack);
      }

      let baseScore = [0, 100, 300, 500, 800][linesCleared] || 0;
      if (this.lastMoveWasTSpin) {
        baseScore = [0, 800, 1200, 1600][linesCleared] || 0;
        attackLines += linesCleared;
      }
      this.score += baseScore;
      this.timeSinceLastScore = 0; // Reset on score

      if (attackLines > 0) {
        console.log(`Sending extra attack: ${attackLines} lines`);
        this.emitGameEvent('attack', attackLines);
      }

      if (!this.isPractice) {
        skillManager.tryAcquireSkillCard(); // Attempt to acquire skill on line clear
      }
    } else if (this.lastMoveWasTSpin) {
      this.score += 400; // T-Spin Mini
      this.timeSinceLastScore = 0; // Reset on score
    } else {
      this.combo = -1;
    }

    this.lastMoveWasTSpin = false;
    //this.notifyListeners();
  }



  // ✅ 新增：被技能擊中的入口
  public onSkillReceived(skillId: string) {
    console.log(`[GameEngine] onSkillReceived: ${skillId}`);
    // 這裡的 skillId 可能是 string，轉成 enum
    skillManager.applyIncomingSkill(skillId as SkillId);
    // Emit visual event for UI effects
    this.emitGameEvent('skill:visual', { skillId });
  }

  public setGameState(state: GameState) {
    this.board = state.board;
    this.score = state.score;
    this.gameTime = state.gameTime;
    this.isGameOver = state.isGameOver;
    this.currentPiece = state.currentPiece;
    this.nextPieces = state.nextPieces;
    this.heldPiece = state.heldPiece;
    this.playerSkills = state.playerSkills;
    this.notifyListeners();
  }
}

export const gameEngine = new GameEngine();
