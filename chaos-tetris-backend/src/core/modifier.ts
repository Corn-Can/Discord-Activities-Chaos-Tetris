import { SkillId } from './skill';
import { GameEngine } from './GameEngine'; // Correctly import GameEngine class

export interface Modifier {
  id: string;
  name: string;
  duration: number;           // Seconds (-1 = permanent)
  targetPlayerId: string | null; // Target player ID or null for self/global
  appliedAt: number;          // Timestamp when applied (performance.now())

  // Apply the modifier's effect to the game engine or player state
  apply(gameEngine: GameEngine): void;
  // Remove the modifier's effect
  remove(gameEngine: GameEngine): void;
  // Update the modifier's state (e.g., duration countdown)
  update(gameEngine: GameEngine, deltaTime: number): void;
}

export interface GameModifier extends Modifier { // Extend the Modifier interface
  skillId: SkillId;
  // Add any skill-specific properties here if needed
}

export class ModifierPipeline {
  private modifiers: Modifier[] = [];

  add(modifier: Modifier, gameEngine: GameEngine) {
    this.modifiers.push(modifier);
    modifier.apply(gameEngine);
  }

  remove(modifierId: string, gameEngine: GameEngine) {
    const index = this.modifiers.findIndex(m => m.id === modifierId);
    if (index !== -1) {
      const modifier = this.modifiers[index];
      modifier.remove(gameEngine);
      this.modifiers.splice(index, 1);
    }
  }

  update(gameEngine: GameEngine, deltaTime: number) {
    for (let i = this.modifiers.length - 1; i >= 0; i--) {
      const modifier = this.modifiers[i];
      modifier.update(gameEngine, deltaTime); // Update modifier state

      // Handle duration countdown
      if (modifier.duration > 0) {
        modifier.duration -= deltaTime / 1000; // Convert deltaTime to seconds
        if (modifier.duration <= 0) {
          modifier.remove(gameEngine); // Remove its effect
          this.modifiers.splice(i, 1); // Remove from pipeline
        }
      }
    }
  }

  clearAll(gameEngine: GameEngine) {
    for (const modifier of this.modifiers) {
      modifier.remove(gameEngine);
    }
    this.modifiers = [];
  }

  // Example of how a modifier might affect a value
  applyToValue<T>(key: string, baseValue: T): T {
    let modifiedValue = baseValue;
    // Iterate through active modifiers and apply their effects to 'key'
    // This is a placeholder, actual implementation depends on modifier types
    return modifiedValue;
  }
}
