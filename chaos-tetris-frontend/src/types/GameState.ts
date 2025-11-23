import { BlockType, TetrisPiece } from '../services/GameEngine';
import { SkillCard } from './skill';

export interface GameState {
    board: BlockType[][];
    score: number;
    gameTime: number;
    isGameOver: boolean;
    currentPiece: TetrisPiece;
    nextPieces: TetrisPiece[];
    heldPiece: TetrisPiece | null;
    playerSkills: SkillCard[];
}
