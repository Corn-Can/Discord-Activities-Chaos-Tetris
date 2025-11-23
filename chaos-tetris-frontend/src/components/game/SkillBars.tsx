import React from 'react';
import { GameModifier } from '../../types/modifier';

interface SkillBarsProps {
    activeModifiers: GameModifier[];
}

export const SkillBars: React.FC<SkillBarsProps> = ({ activeModifiers }) => {
    const MAX_DURATION = 8;
    return (
        <div className="flex flex-row items-end gap-1 h-32">
            {activeModifiers.filter(m => m.duration > 0).map(mod => {
                const progress = Math.min(100, Math.max(0, (mod.duration / MAX_DURATION) * 100));
                return (
                    <div key={mod.id} className="relative group flex flex-col justify-end h-full">
                        <div className="w-3 bg-gray-900/80 border border-gray-700/50 rounded-full overflow-hidden relative shadow-lg h-full">
                            <div
                                className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-purple-600 via-blue-500 to-cyan-400 transition-all duration-1000 ease-linear shadow-[0_0_8px_rgba(139,92,246,0.6)]"
                                style={{ height: `${progress}%` }}
                            />
                        </div>
                        {/* Tooltip */}
                        <div className="absolute right-full bottom-0 mb-2 mr-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                            <div className="bg-black/90 text-white text-[10px] font-bold px-2 py-1 rounded whitespace-nowrap border border-white/10">
                                {mod.name}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
