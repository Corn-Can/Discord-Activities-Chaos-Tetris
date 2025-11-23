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
  // Other properties like rarity, icon, etc.
}

// Full skill definitions (for frontend display and logic)
export const SKILL_DEFINITIONS: Record<SkillId, SkillCard> = {
  [SkillId.ReverseV]: {
    id: SkillId.ReverseV,
    name: '上下顛倒',
    description: '顯示翻轉 + 操作反向 (8s)',
    duration: 8,
    targetType: 'opponent',
  },
  [SkillId.ReverseH]: {
    id: SkillId.ReverseH,
    name: '左右顛倒',
    description: '左右翻轉 + 操作反向 (8s)',
    duration: 8,
    targetType: 'opponent',
  },
  [SkillId.DigHole]: {
    id: SkillId.DigHole,
    name: '挖洞',
    description: '隨機在對手棋盤挖 4 個洞 (一次性)',
    targetType: 'opponent',
  },
  [SkillId.ColorFlash]: {
    id: SkillId.ColorFlash,
    name: '色盲',
    description: '顏色每 0.5 秒換一次 (20s)',
    duration: 20,
    targetType: 'opponent',
  },
  [SkillId.JumpBoard]: {
    id: SkillId.JumpBoard,
    name: '彈跳模式',
    description: '棋盤每 0.8s 跳動 (10s)',
    duration: 10,
    targetType: 'opponent',
  },
  [SkillId.SpeedBoost]: {
    id: SkillId.SpeedBoost,
    name: '肥宅快樂水',
    description: '下落速度 x2 (10s)',
    duration: 10,
    targetType: 'self',
  },
};
