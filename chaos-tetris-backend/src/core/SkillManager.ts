// chaos-tetris-frontend/src/services/SkillManager.ts

import { GameEngine } from "./GameEngine";
import { SkillCard, SKILL_DEFINITIONS, SkillId } from "./skill";
import { GameModifier } from "./modifier";
import {
    ReverseVModifier, ReverseHModifier, DigHoleModifier,
    ColorFlashModifier, JumpBoardModifier, SpeedBoostModifier
} from './ModifierSystem'; // Import all concrete modifiers

class SkillManager {
    private gameEngine: GameEngine | null = null;
    private availableSkills: SkillCard[] = [];
    private skillCooldowns: Map<SkillId, number> = new Map(); // Track cooldowns

    // For now, let's keep a simple list of acquired skills for the player
    // In a multiplayer setting, this would be player-specific
    public playerSkills: SkillCard[] = [];
    private readonly MAX_PLAYER_SKILLS = 3; // Max skills player can hold

    // Call this to initialize with the game engine
    init(engine: GameEngine) {
        this.gameEngine = engine;
        this.reset();
    }

    reset() {
        if (this.gameEngine) this.gameEngine.playerSkills = [];
        this.skillCooldowns.clear();
        // Reset any other state related to skills
    }

    // Call this when lines are cleared to try and acquire a new skill
    tryAcquireSkillCard(): void {
        if (!this.gameEngine || this.gameEngine.playerSkills.length >= this.MAX_PLAYER_SKILLS) {
            return;
        }

        // Placeholder for actual probabilities from BALANCE or skill definitions
        const acquisitionChance = 0.2; // 30% chance for now

        if (Math.random() < acquisitionChance) {
            const skillIds = Object.values(SkillId);
            const randomSkillId = skillIds[Math.floor(Math.random() * skillIds.length)];
            const newSkillCard = SKILL_DEFINITIONS[randomSkillId];

            if (newSkillCard) {
                this.addSkillToPlayer(newSkillCard);
                console.log(`Player acquired skill: ${newSkillCard.name}`);
            }
        }
    }

    // Grants a skill card directly, bypassing probability checks. Used for catch-up.
    public grantSkillCard(): void {
        if (!this.gameEngine || this.gameEngine.playerSkills.length >= this.MAX_PLAYER_SKILLS) {
            return;
        }
        const skillIds = Object.values(SkillId);
        const randomSkillId = skillIds[Math.floor(Math.random() * skillIds.length)];
        const newSkillCard = SKILL_DEFINITIONS[randomSkillId];

        if (newSkillCard) {
            this.addSkillToPlayer(newSkillCard);
            console.log(`Player granted catch-up skill: ${newSkillCard.name}`);
        }
    }

    private addSkillToPlayer(skill: SkillCard): void {
        if (this.gameEngine && this.gameEngine.playerSkills.length < this.MAX_PLAYER_SKILLS) {
            this.gameEngine.playerSkills.push(skill);
        } else if (this.gameEngine) {
            // Replace the oldest skill (FIFO)
            this.gameEngine.playerSkills.shift();
            this.gameEngine.playerSkills.push(skill);
        }
        this.gameEngine?.notifyListeners(); // Notify UI to update skill display
    }

    // Use a skill - this would typically be called by UI action
    useSkill(skillId: SkillId): boolean {
        if (!this.gameEngine || this.gameEngine.isGameOver) return false;

        const skillIndex = this.gameEngine.playerSkills.findIndex(s => s.id === skillId);
        if (skillIndex === -1) {
            console.warn(`Skill ${skillId} not found in player's inventory.`);
            return false;
        }

        const skillToUse = this.gameEngine.playerSkills[skillIndex];
        // Check cooldowns here if implemented

        // Remove from player's inventory
        this.gameEngine.playerSkills.splice(skillIndex, 1);

        // Apply the skill's effect via a Modifier
        let modifier: GameModifier | null = null;
        switch (skillToUse.id) {
            case SkillId.ReverseV:
                modifier = new ReverseVModifier(skillToUse.duration!, null); // targetPlayerId will be opponent in multiplayer
                break;
            case SkillId.ReverseH:
                modifier = new ReverseHModifier(skillToUse.duration!, null);
                break;
            case SkillId.DigHole:
                modifier = new DigHoleModifier(null);
                break;
            case SkillId.ColorFlash:
                modifier = new ColorFlashModifier(skillToUse.duration!, null);
                break;
            case SkillId.JumpBoard:
                modifier = new JumpBoardModifier(skillToUse.duration!, null);
                break;
            case SkillId.SpeedBoost:
                modifier = new SpeedBoostModifier(skillToUse.duration!, null);
                break;
            default:
                console.error(`Unknown skill ID: ${skillToUse.id}`);
                return false;
        }

        if (modifier) {
            this.gameEngine.applyModifier(modifier);
            this.gameEngine.notifyListeners(); // Notify UI for any state changes from skill
            return true;
        }

        return false;
    }

    // This method will be called by GameEngine to check for skills based on score.
    // (This is the old acquisition logic, keeping it here for reference or future use)
    checkScoreForSkills(currentScore: number, elapsedSeconds: number): void {
        // Old score-based logic here if needed
    }
}

export const skillManager = new SkillManager();