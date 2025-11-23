import { ModifierPipeline, GameModifier } from './modifier';
import { SkillCard, SKILL_DEFINITIONS, SkillId } from './skill';
import { skillManager } from './SkillManager'; // Import skillManager


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

  public modifierPipeline: ModifierPipeline;

  // skill related
  public isVerticalReversed: boolean = false;
  public isHorizontalReversed: boolean = false;
  public isColorFlashActive: boolean = false;
  public isJumpBoardActive: boolean = false;
  public playerSkills: SkillCard[] = [];
  private readonly skillAcquisitionChance: number = 0.2; // Increased for testing
  private readonly MAX_SKILLS: number = 3;
  private timeSinceLastScore: number = 0;
  private readonly CATCH_UP_INTERVAL: number = 15; // In seconds

  private gameLoopInterval: NodeJS.Timeout | null = null;
  private gameTimerInterval: NodeJS.Timeout | null = null;
  private lockDelayTimer: NodeJS.Timeout | null = null;

  private bag: number[] = [];
  public dropTime: number = 1000;
  private readonly lockDelayDuration: number = 500;

  readonly BOARD_WIDTH: number;
  readonly BOARD_HEIGHT: number;
  currentPieceRotation!: number;

  constructor(boardWidth: number = 10, boardHeight: number = 20) {
    this.BOARD_WIDTH = boardWidth;
    this.BOARD_HEIGHT = boardHeight;
    this.modifierPipeline = new ModifierPipeline();
    skillManager.init(this);
    this.restartGame();
  }

  restartGame() {
    this.board = Array(this.BOARD_HEIGHT).fill(0).map(() => Array(this.BOARD_WIDTH).fill(BlockType.EMPTY));
    this.score = 0;
    this.gameTime = 120;
    this.isGameOver = false;
    this.heldPiece = null;
    this.canHold = true;
    this.playerSkills = [];
    this.timeSinceLastScore = 0;

    this.fillBag();
    this.nextPieces = [];
    for (let i = 0; i < 5; i++) {
      this.nextPieces.push(this.createPiece());
    }
    this.spawnNewPiece(false);

    this.modifierPipeline.clearAll(this);
    skillManager.reset();
    this.startGameLoop();
  }

  private fillBag() {
    this.bag = Array.from({ length: TETROMINOS.length }, (_, i) => i);
    for (let i = this.bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
    }
  }

  private createPiece(): TetrisPiece {
    if (this.bag.length === 0) this.fillBag();
    const randTetromino = TETROMINOS[this.bag.pop()!];
    return {
      shape: randTetromino.shape,
      color: randTetromino.color,
      x: Math.floor(this.BOARD_WIDTH / 2) - Math.floor(randTetromino.shape[0].length / 2),
      y: 0,
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
      this.isGameOver = true;
      this.stopGameLoop();
    }
  }

  private lockPiece() {
    this.mergePiece();
    this.spawnNewPiece();
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
    if (!this.canHold || this.isGameOver) return;
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
  }

  startGameLoop() {
    this.stopGameLoop();
    this.gameLoopInterval = setInterval(() => this.movePiece('down'), this.dropTime);
    this.gameTimerInterval = setInterval(() => {
      if (this.gameTime > 0 && !this.isGameOver) {
        this.gameTime--;
        this.timeSinceLastScore++;

        // Check for catch-up skill
        if (this.timeSinceLastScore >= this.CATCH_UP_INTERVAL) {
          console.log("Awarding catch-up skill card due to inactivity.");
          skillManager.grantSkillCard(); // Give a pity skill
          this.timeSinceLastScore = 0; // Reset timer
        }

        this.modifierPipeline.update(this, 1000);
      } else if (this.gameTime <= 0 && !this.isGameOver) {
        this.isGameOver = true;
        this.stopGameLoop();
      }
    }, 1000);
  }

  stopGameLoop() {
    if (this.gameLoopInterval) clearInterval(this.gameLoopInterval);
    if (this.gameTimerInterval) clearInterval(this.gameTimerInterval);
    this.gameLoopInterval = null;
    this.gameTimerInterval = null;
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
    if (this.isGameOver) return;

    let actualDirection = direction;
    // XOR: If one of the reversals is active (but not both), flip controls.
    const reverseControls = this.isVerticalReversed !== this.isHorizontalReversed;
    if (direction !== 'down' && reverseControls) {
      actualDirection = direction === 'left' ? 'right' : 'left';
    }

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
    } else if (direction === 'down' && !this.lockDelayTimer) {
      this.lockDelayTimer = setTimeout(() => this.lockPiece(), this.lockDelayDuration);
    }
  }

  rotatePiece(direction: 'clockwise' | 'counter-clockwise' = 'clockwise') {
    if (this.isGameOver) return;

    let actualDirection = direction;
    // XOR: If one of the reversals is active (but not both), flip rotation.
    const reverseControls = this.isVerticalReversed !== this.isHorizontalReversed;
    if (reverseControls) {
      actualDirection = direction === 'clockwise' ? 'counter-clockwise' : 'clockwise';
    }

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
        return;
      }
    }
  }

  dropPiece() {
    if (this.isGameOver) return;
    this.resetLockDelay();
    let newY = this.currentPiece.y;
    while (!this.checkCollision(this.currentPiece.x, newY + 1, this.currentPiece.shape)) {
      newY++;
    }
    this.currentPiece.y = newY;
    this.lockPiece();
  }

  public applyModifier(modifier: GameModifier) {
    this.modifierPipeline.add(modifier, this);
  }

  private tryAcquireSkillCard() {
    if (Math.random() < this.skillAcquisitionChance && this.playerSkills.length < this.MAX_SKILLS) {
      const availableSkills = Object.values(SKILL_DEFINITIONS);
      const randomSkill = availableSkills[Math.floor(Math.random() * availableSkills.length)];
      this.playerSkills.push(randomSkill);
      console.log(`Acquired new skill: ${randomSkill.name}`);
    }
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
      let baseScore = [0, 100, 300, 500, 800][linesCleared] || 0;
      if (this.lastMoveWasTSpin) {
        baseScore = [0, 800, 1200, 1600][linesCleared] || 0;
      }
      this.score += baseScore;
      this.timeSinceLastScore = 0; // Reset on score

      skillManager.tryAcquireSkillCard(); // Attempt to acquire skill on line clear
    } else if (this.lastMoveWasTSpin) {
      this.score += 400; // T-Spin Mini
      this.timeSinceLastScore = 0; // Reset on score
    }

    this.lastMoveWasTSpin = false;
  }

  public useSkill(skillId: SkillId, targetPlayerId: string) {
    const skillIndex = this.playerSkills.findIndex(s => s.id === skillId);
    if (skillIndex === -1) return;

    this.playerSkills.splice(skillIndex, 1);

    // Apply the skill locally for instant feedback
    skillManager.useSkill(skillId);
  }

  public getGameState() {
    return {
      board: this.board,
      score: this.score,
      gameTime: this.gameTime,
      isGameOver: this.isGameOver,
      currentPiece: this.currentPiece,
      nextPieces: this.nextPieces,
      heldPiece: this.heldPiece,
      playerSkills: this.playerSkills,
      isVerticalReversed: this.isVerticalReversed,
      isHorizontalReversed: this.isHorizontalReversed,
      isColorFlashActive: this.isColorFlashActive,
      isJumpBoardActive: this.isJumpBoardActive,
    };
  }
}
