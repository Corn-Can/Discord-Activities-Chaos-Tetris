// chaos-tetris-frontend/src/types/skill.ts

export enum SkillId {
  ReverseV = 'reverse_v',
  ReverseH = 'reverse_h',
  DigHole = 'dig_hole',
  ColorFlash = 'color_flash',
  JumpBoard = 'jump_board',
  SpeedBoost = 'speed_boost',
}

export interface SkillCard {
  id: SkillId;
  name: string;
  description: string;
  duration?: number; // For timed skills
  cooldown?: number; // Cooldown before skill can be used again
  targetType: 'self' | 'opponent' | 'global';
  type: 'attack' | 'buff' | 'special'; // New property
  // Other properties like rarity, icon, etc.
}

// Full skill definitions (for frontend display and logic)
export const SKILL_DEFINITIONS: Record<SkillId, SkillCard> = {
  [SkillId.ReverseV]: {
    id: SkillId.ReverseV,
    name: 'Vertical Reverse',
    description: 'Opponent board reversed (8s)',
    duration: 8,
    targetType: 'opponent',
    type: 'attack',
  },
  [SkillId.ReverseH]: {
    id: SkillId.ReverseH,
    name: 'Horizontal Reverse',
    description: 'Opponent board control reversed (8s)',
    duration: 8,
    targetType: 'opponent',
    type: 'attack',
  },
  [SkillId.DigHole]: {
    id: SkillId.DigHole,
    name: 'Dig Hole',
    description: 'Opponent board dig 4 holes (1 time)',
    targetType: 'opponent',
    type: 'attack',
  },
  [SkillId.ColorFlash]: {
    id: SkillId.ColorFlash,
    name: 'Color Flash',
    description: 'Opponent board color flash (20s)',
    duration: 20,
    targetType: 'opponent',
    type: 'attack',
  },
  [SkillId.JumpBoard]: {
    id: SkillId.JumpBoard,
    name: 'Jump Board',
    description: 'Opponent board jump (10s)',
    duration: 10,
    targetType: 'opponent',
    type: 'attack',
  },
  [SkillId.SpeedBoost]: {
    id: SkillId.SpeedBoost,
    name: 'Speed Boost',
    description: 'Opponent board speed boost (10s)',
    duration: 10,
    targetType: 'opponent',
    type: 'attack',
  },
};
