import React, { useEffect, useState } from 'react';
import { GameEngine } from '../../services/GameEngine';
import { SkillId, SKILL_DEFINITIONS } from '../../types/skill';
import { GameModifier } from '../../types/modifier';
import { Zap, RefreshCw, Move, EyeOff, ArrowDownCircle, Activity, AlertTriangle } from 'lucide-react';

interface SkillEffectsProps {
    gameEngine: GameEngine;
    playerId: string;
    activeModifiers: GameModifier[];
}

interface ActiveEffect {
    id: string;
    type: 'shake' | 'flash' | 'card-overlay';
    skillId?: SkillId;
    duration?: number;
}

const SkillDurationBar: React.FC<{ modifier: GameModifier }> = ({ modifier }) => {
    // Assume max duration is 8s for now, or use a constant if available
    const MAX_DURATION = 8;
    const progress = Math.min(100, Math.max(0, (modifier.duration / MAX_DURATION) * 100));

    return (
        <div className="relative group">
            {/* Vertical Bar */}
            <div className="w-6 h-32 bg-gray-900/80 border border-gray-700 rounded-lg overflow-hidden relative shadow-xl">
                {/* Progress fill from bottom to top */}
                <div
                    className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-orange-500 via-orange-400 to-yellow-300 transition-all duration-1000 ease-linear shadow-[0_0_10px_rgba(251,146,60,0.8)]"
                    style={{ height: `${progress}%` }}
                />

                {/* Skill name tooltip on hover */}
                <div className="absolute -left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <div className="bg-black/90 text-white text-[10px] font-bold px-2 py-1 rounded whitespace-nowrap -translate-x-full mr-2">
                        {modifier.name}
                    </div>
                </div>
            </div>
        </div>
    );
};

const ControlHint: React.FC<{ type: 'reverse-v' | 'reverse-h' }> = ({ type }) => {
    return (
        <div className="absolute top-1/4 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center animate-pulse">
            <AlertTriangle className="w-12 h-12 text-yellow-400 mb-2 drop-shadow-lg" />
            <div className="bg-black/60 text-yellow-300 px-4 py-2 rounded-lg border border-yellow-500/50 font-bold text-lg backdrop-blur-md shadow-xl">
                {type === 'reverse-v' ? 'CONTROLS INVERTED' : 'MIRROR CONTROLS'}
            </div>
        </div>
    );
};

export const SkillEffects: React.FC<SkillEffectsProps> = ({ gameEngine, playerId, activeModifiers }) => {
    const [effects, setEffects] = useState<ActiveEffect[]>([]);
    const [activeSkillCard, setActiveSkillCard] = useState<SkillId | null>(null);

    useEffect(() => {
        const unsubscribe = gameEngine.onGameEvent((event, data) => {
            if (event === 'skill:cast' || event === 'skill:applied') {
                if (data && data.targetPlayerId === playerId) {
                    triggerSkillEffect(data.skillId);
                }
            }
        });

        const effectUnsub = gameEngine.onGameEvent((event, data) => {
            if (event === 'skill:visual') {
                triggerSkillEffect(data.skillId);
            }
        });

        return () => {
            unsubscribe();
            effectUnsub();
        };
    }, [gameEngine, playerId]);

    const triggerSkillEffect = (skillId: SkillId) => {
        setActiveSkillCard(skillId);
        setTimeout(() => setActiveSkillCard(null), 2000);

        if (skillId === SkillId.DigHole) {
            addEffect({ id: Date.now().toString(), type: 'shake', duration: 500 });
        }

        if (SKILL_DEFINITIONS[skillId]?.type === 'attack') {
            addEffect({ id: Date.now().toString() + 'f', type: 'flash', duration: 500 });
        }
    };

    const addEffect = (effect: ActiveEffect) => {
        setEffects(prev => [...prev, effect]);
        if (effect.duration) {
            setTimeout(() => {
                setEffects(prev => prev.filter(e => e.id !== effect.id));
            }, effect.duration);
        }
    };

    const getSkillIcon = (skillId: SkillId) => {
        // Uniform pale purple color, no animations
        const iconClass = "w-32 h-32 text-purple-200 opacity-60";

        switch (skillId) {
            case SkillId.ReverseV: return <RefreshCw className={iconClass} />;
            case SkillId.ReverseH: return <Move className={iconClass} />;
            case SkillId.DigHole: return <Activity className={iconClass} />;
            case SkillId.ColorFlash: return <EyeOff className={iconClass} />;
            case SkillId.JumpBoard: return <Zap className={iconClass} />;
            case SkillId.SpeedBoost: return <ArrowDownCircle className={iconClass} />;
            default: return <Zap className={iconClass} />;
        }
    };

    const hasReverseV = activeModifiers.some(m => m.skillId === SkillId.ReverseV);
    const hasReverseH = activeModifiers.some(m => m.skillId === SkillId.ReverseH);

    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-50">
            {/* Control Hints Removed as per user request */}

            {/* Card Overlay - Simple Ghost Style */}
            {activeSkillCard && (
                <div className="absolute inset-0 flex items-center justify-center animate-card-overlay">
                    <div className="relative">
                        {/* Subtle Glow */}
                        <div className="absolute inset-0 blur-3xl opacity-20 bg-purple-500 rounded-full"></div>

                        {/* Icon Only - No border, no background, just the ghost icon */}
                        <div className="relative z-10 transform">
                            {getSkillIcon(activeSkillCard)}
                        </div>
                    </div>
                </div>
            )}

            {/* Flash Effect */}
            {effects.some(e => e.type === 'flash') && (
                <div className="absolute inset-0 bg-red-500/10 animate-pulse-red mix-blend-overlay"></div>
            )}
        </div>
    );
};
