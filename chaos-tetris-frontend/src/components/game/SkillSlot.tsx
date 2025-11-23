import React from 'react';
import { Zap } from 'lucide-react';
import { SkillCard as SkillCardData } from '../../types/skill';

interface SkillSlotProps {
    skill?: SkillCardData | null;
    index: number;
    onClick: (index: number) => void;
}

export const SkillSlot: React.FC<SkillSlotProps> = ({ skill, index, onClick }) => {
    const hotkey = index + 1;
    const isEmpty = !skill;

    return (
        <button
            onClick={() => skill && onClick(index)}
            disabled={isEmpty}
            className={`
                relative group w-20 h-28 rounded-xl border-2 transition-all duration-300 flex flex-col items-center justify-between p-2 overflow-hidden
                ${isEmpty
                    ? 'border-white/10 bg-white/5 cursor-default hover:border-white/20'
                    : 'border-purple-500/50 bg-gradient-to-b from-purple-900/80 to-black hover:border-purple-400 hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] active:scale-95 cursor-pointer'
                }
            `}
        >
            {/* Hotkey Indicator */}
            <div className={`absolute top-1 left-2 text-[10px] font-black font-mono ${isEmpty ? 'text-gray-500' : 'text-purple-300'}`}>
                {hotkey}
            </div>

            {/* Icon / Content */}
            <div className="flex-1 flex items-center justify-center">
                {isEmpty ? (
                    <div className="w-8 h-8 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center group-hover:border-white/30 transition-colors">
                        <div className="w-1 h-1 bg-white/20 rounded-full" />
                    </div>
                ) : (
                    <Zap size={24} className="text-purple-300 group-hover:text-white drop-shadow-[0_0_8px_rgba(168,85,247,0.8)] transition-colors" />
                )}
            </div>

            {/* Name */}
            <div className={`text-[9px] font-bold uppercase tracking-wider text-center w-full truncate ${isEmpty ? 'text-transparent' : 'text-purple-200 group-hover:text-white'}`}>
                {skill?.name || '-'}
            </div>

            {/* Bottom Glow for active skills */}
            {!isEmpty && (
                <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-purple-500 via-fuchsia-500 to-purple-500 opacity-70 group-hover:opacity-100 transition-opacity" />
            )}
        </button>
    );
};
