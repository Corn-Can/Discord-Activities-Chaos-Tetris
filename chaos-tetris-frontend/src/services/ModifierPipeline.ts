import { GameEngine } from './GameEngine';
import { GameModifier } from '../types/modifier'; // 確保路徑正確

export class ModifierPipeline {
  private modifiers: GameModifier[] = [];

  /**
   * 添加一個新的 Modifier 到管線中。
   * @param modifier 
   */
  public addModifier(modifier: GameModifier) {
    // 這裡可以加入堆疊邏輯，例如同類型的 Modifier 覆蓋或延長
    console.log(`[ModifierPipeline] Adding ${modifier.name} with duration ${modifier.duration}s`);
    this.modifiers.push(modifier);
  }

  public get activeModifiers(): GameModifier[] {
    return this.modifiers;
  }

  /**
   * 遊戲的主更新迴圈（應由 GameEngine 定期調用）。
   * @param gameEngine GameEngine 的實例
   * @param deltaTime 距離上次更新的時間（毫秒）
   */
  public update(gameEngine: GameEngine, deltaTime: number) {
    const deltaSeconds = deltaTime / 1000;

    for (let i = this.modifiers.length - 1; i >= 0; i--) {
      const mod = this.modifiers[i];

      // 更新 Modifier 自身的狀態（如果它有 update 邏輯）
      // 雖然你目前的 Modifier.update 都是空的，但這是個好習慣
      mod.update(gameEngine, deltaTime);

      const prevDuration = mod.duration;
      // 更新持續時間
      mod.duration -= deltaSeconds;

      console.log(`[ModifierPipeline] ${mod.name}: duration ${prevDuration.toFixed(2)}s -> ${mod.duration.toFixed(2)}s (delta: ${deltaSeconds}s)`);

      // 檢查是否到期
      if (mod.duration <= 0) {
        console.log(`[ModifierPipeline] ${mod.name} expired, removing...`);
        mod.remove(gameEngine); // 調用 Modifier 的 remove 邏輯
        this.modifiers.splice(i, 1); // 從陣列中移除
      }
    }
  }

  /**
   * (可選) 清空所有 Modifier，例如遊戲結束時
   */
  public clearAll(gameEngine: GameEngine) {
    this.modifiers.forEach(mod => mod.remove(gameEngine));
    this.modifiers = [];
  }

  /**
   * 嘗試刷新現有 Modifier 的持續時間
   * @param skillId 技能 ID
   * @param duration 新的持續時間
   * @returns true if refreshed, false if not found
   */
  public refreshDuration(skillId: string, duration: number): boolean {
    const existingMod = this.modifiers.find(m => m.skillId === skillId);
    if (existingMod) {
      console.log(`[ModifierPipeline] Refreshing duration for ${existingMod.name}: ${existingMod.duration.toFixed(2)}s -> ${duration}s`);
      existingMod.duration = Math.max(existingMod.duration, duration);
      return true;
    }
    return false;
  }
}