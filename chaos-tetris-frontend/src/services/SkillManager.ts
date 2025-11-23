// chaos-tetris-frontend/src/services/SkillManager.ts

import { GameEngine } from "./GameEngine";
import { SkillCard, SKILL_DEFINITIONS, SkillId } from "../types/skill";
import { GameModifier } from "../types/modifier";
import {
    ReverseVModifier, ReverseHModifier, DigHoleModifier,
    ColorFlashModifier, JumpBoardModifier, SpeedBoostModifier
} from './ModifierSystem'; // Import all concrete modifiers
import { audioManager } from './AudioManager';

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
        if (this.gameEngine) this.gameEngine.playerSkills = [null, null, null];
        this.skillCooldowns.clear();
        // Reset any other state related to skills
    }

    // Call this when lines are cleared to try and acquire a new skill
    tryAcquireSkillCard(): void {
        if (!this.gameEngine) {
            console.warn("SkillManager: No GameEngine instance!");
            return;
        }

        // Debug log
        console.log("SkillManager: tryAcquireSkillCard called. Current skills:", this.gameEngine.playerSkills);

        // Check if there is space (any null slot)
        const hasSpace = this.gameEngine.playerSkills.some(s => s === null);
        if (!hasSpace) {
            console.log("SkillManager: No space for new skill.");
            return;
        }

        // Placeholder for actual probabilities from BALANCE or skill definitions
        const acquisitionChance = 0.2; // 30% chance for now

        if (Math.random() < acquisitionChance) {
            const skillIds = Object.values(SkillId);
            const randomSkillId = skillIds[Math.floor(Math.random() * skillIds.length)];
            const newSkillCard = SKILL_DEFINITIONS[randomSkillId];

            if (newSkillCard) {
                console.log("SkillManager: Adding skill", newSkillCard.name);
                this.addSkillToPlayer(newSkillCard);
                console.log(`Player acquired skill: ${newSkillCard.name}`);
            } else {
                console.error("SkillManager: Failed to find definition for skill ID:", randomSkillId);
            }
        } else {
            console.log("SkillManager: Skill acquisition failed (chance).");
        }
    }

    // Grants a skill card directly, bypassing probability checks. Used for catch-up.
    public grantSkillCard(): void {
        if (!this.gameEngine) return;

        // Check if there is space (any null slot)
        const hasSpace = this.gameEngine.playerSkills.some(s => s === null);
        if (!hasSpace) return;

        const skillIds = Object.values(SkillId);
        const randomSkillId = skillIds[Math.floor(Math.random() * skillIds.length)];
        const newSkillCard = SKILL_DEFINITIONS[randomSkillId];

        if (newSkillCard) {
            this.addSkillToPlayer(newSkillCard);
            console.log(`Player granted catch-up skill: ${newSkillCard.name}`);
        }
    }

    private addSkillToPlayer(skill: SkillCard): void {
        if (!this.gameEngine) return;

        // Find first empty slot
        const emptyIndex = this.gameEngine.playerSkills.findIndex(s => s === null);

        if (emptyIndex !== -1) {
            // Fill the empty slot
            const newSkills = [...this.gameEngine.playerSkills];
            newSkills[emptyIndex] = skill;
            this.gameEngine.playerSkills = newSkills;
            this.gameEngine.notifyListeners();
            // Play skill acquisition sound
            audioManager.playSFX('skill_gain', 0.9);
        }
        // If full, do nothing (as per user request "fill empty slot")
    }

    private createModifier(skillId: SkillId, targetPlayerId: string | null): GameModifier | null {
        // 取得技能設定以獲得持續時間 (如果 playerSkills 裡沒有這個技能資料，我們從靜態設定拿)
        const skillDef = SKILL_DEFINITIONS[skillId];
        const duration = skillDef ? skillDef.duration || 0 : 0;

        switch (skillId) {
            case SkillId.ReverseV:
                return new ReverseVModifier(duration, targetPlayerId);
            case SkillId.ReverseH:
                return new ReverseHModifier(duration, targetPlayerId);
            case SkillId.DigHole:
                return new DigHoleModifier(targetPlayerId);
            case SkillId.ColorFlash:
                return new ColorFlashModifier(duration, targetPlayerId);
            case SkillId.JumpBoard:
                return new JumpBoardModifier(duration, targetPlayerId);
            case SkillId.SpeedBoost:
                return new SpeedBoostModifier(duration, targetPlayerId);
            default:
                console.error(`Unknown skill ID: ${skillId}`);
                return null;
        }
    }

    // Updated to use slot index
    public useSkill(slotIndex: number, isSelfTarget: boolean): boolean {
        if (!this.gameEngine) return false;

        const skillCard = this.gameEngine.playerSkills[slotIndex];
        if (!skillCard) { // Slot is empty or invalid
            console.warn(`No skill found in slot ${slotIndex}.`);
            return false;
        }

        // Check cooldown
        const now = Date.now();
        const lastUsed = this.skillCooldowns.get(skillCard.id) || 0;
        if (now - lastUsed < (skillCard.cooldown || 0)) {
            console.log(`Skill ${skillCard.name} is on cooldown.`);
            return false;
        }

        // Determine target for the modifier
        const targetPlayerId = isSelfTarget ? this.gameEngine.myPlayerId : null; // null means target is opponent (handled by socket)

        // Create modifier
        const modifier = this.createModifier(skillCard.id, targetPlayerId);
        if (modifier) {
            // Apply modifier if it's a self-target skill or for local testing
            if (isSelfTarget) {
                this.gameEngine.applyModifier(modifier);
            }
            // If it's an attack skill, it will be sent via socket and applied by the opponent's GameEngine.

            // Set cooldown
            this.skillCooldowns.set(skillCard.id, now);

            // Remove skill from slot (set to null)
            const newSkills = [...this.gameEngine.playerSkills];
            newSkills[slotIndex] = null;
            this.gameEngine.playerSkills = newSkills;

            this.gameEngine.notifyListeners(); // Notify UI to update skill display
            console.log(`Used skill: ${skillCard.name} from slot ${slotIndex}`);
            // Play skill usage sound (unified for all skills)
            audioManager.playSFX('skill_use', 0.8);
            return true;
        }

        return false;
    }

    applyIncomingSkill(skillId: SkillId) {
        if (!this.gameEngine || this.gameEngine.isGameOver) return;

        console.log(`Being hit by skill: ${skillId}`);
        const modifier = this.createModifier(skillId, null); // null 代表作用於本地 (我被打了)

        if (modifier) {
            this.gameEngine.applyModifier(modifier);
            this.gameEngine.notifyListeners();
        }
    }

    // This method will be called by GameEngine to check for skills based on score.
    // (This is the old acquisition logic, keeping it here for reference or future use)
    checkScoreForSkills(currentScore: number, elapsedSeconds: number): void {
        // Old score-based logic here if needed
    }
}

export const skillManager = new SkillManager();