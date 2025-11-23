import React, { useState } from 'react';
import { GlassPanel } from '../ui/GlassPanel';
import { NeonButton } from '../ui/NeonButton';
import { SKILL_DEFINITIONS } from '../../types/skill';
import { ArrowLeft, Keyboard, Zap, Info, Swords } from 'lucide-react';

interface TutorialViewProps {
    onBack: () => void;
}

export const TutorialView: React.FC<TutorialViewProps> = ({ onBack }) => {
    const [activeTab, setActiveTab] = useState<'controls' | 'skills' | 'rules'>('controls');

    return (
        <div className="w-full h-full flex flex-col items-center justify-center p-4 md:p-8">
            <GlassPanel className="w-full max-w-4xl h-[85vh] flex flex-col relative overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10 bg-black/20">
                    <div className="flex items-center gap-3">
                        <Info className="w-8 h-8 text-cyan-400" />
                        <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
                            HOW TO PLAY
                        </h2>
                    </div>
                    <NeonButton onClick={onBack} variant="secondary" className="!px-4">
                        <ArrowLeft className="w-5 h-5 mr-2" />
                        Back
                    </NeonButton>
                </div>

                {/* Tabs */}
                <div className="flex p-2 gap-2 bg-black/40 border-b border-white/5">
                    <TabButton
                        active={activeTab === 'controls'}
                        onClick={() => setActiveTab('controls')}
                        icon={<Keyboard className="w-4 h-4" />}
                        label="Controls"
                    />
                    <TabButton
                        active={activeTab === 'skills'}
                        onClick={() => setActiveTab('skills')}
                        icon={<Zap className="w-4 h-4" />}
                        label="Skills"
                    />
                    <TabButton
                        active={activeTab === 'rules'}
                        onClick={() => setActiveTab('rules')}
                        icon={<Swords className="w-4 h-4" />}
                        label="Rules"
                    />
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {activeTab === 'controls' && <ControlsSection />}
                    {activeTab === 'skills' && <SkillsSection />}
                    {activeTab === 'rules' && <RulesSection />}
                </div>
            </GlassPanel>
        </div>
    );
};

const TabButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
    <button
        onClick={onClick}
        className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg transition-all duration-200 ${active
            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
            : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
            }`}
    >
        {icon}
        <span className="font-bold tracking-wider">{label}</span>
    </button>
);

const ControlsSection = () => (
    <div className="space-y-8 animate-fadeIn">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ControlCard title="Movement" keys={['←', '↓', '→']} description="Move Left / Soft Drop / Move Right" />
            <ControlCard title="Rotation" keys={['↑', 'Z']} description="Rotate Clockwise / Counter-Clockwise" />
            <ControlCard title="Hard Drop" keys={['Space']} description="Instantly drop and lock the piece" />
            <ControlCard title="Hold" keys={['Shift', 'C']} description="Hold current piece for later" />
            <ControlCard title="Use Skills" keys={['1', '2', '3']} description="Activate collected skills" />
            <ControlCard title="Chat" keys={['Enter']} description="Open chat window" />
        </div>
    </div>
);

const ControlCard: React.FC<{ title: string; keys: string[]; description: string }> = ({ title, keys, description }) => (
    <div className="bg-white/5 p-5 rounded-xl border border-white/10 hover:border-cyan-500/30 transition-colors">
        <h3 className="text-xl font-bold text-cyan-300 mb-3">{title}</h3>
        <div className="flex flex-wrap gap-2 mb-3">
            {keys.map(k => (
                <kbd key={k} className="px-3 py-1 bg-black/50 rounded border border-white/20 text-white font-mono text-sm min-w-[30px] text-center">
                    {k}
                </kbd>
            ))}
        </div>
        <p className="text-gray-400 text-sm">{description}</p>
    </div>
);

const SkillsSection = () => (
    <div className="grid grid-cols-1 gap-4 animate-fadeIn">
        {Object.values(SKILL_DEFINITIONS).map(skill => (
            <div key={skill.id} className="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/10 hover:bg-white/10 transition-colors">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl bg-gradient-to-br ${getSkillColor(skill.type)} shadow-lg`}>
                    {skill.type === 'attack' ? '⚔️' : skill.type === 'buff' ? '🛡️' : '✨'}
                </div>
                <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                        <h3 className="text-lg font-bold text-white">{skill.name}</h3>
                        <span className={`text-xs px-2 py-1 rounded uppercase font-bold ${skill.type === 'attack' ? 'bg-red-500/20 text-red-300' :
                            skill.type === 'buff' ? 'bg-green-500/20 text-green-300' :
                                'bg-purple-500/20 text-purple-300'
                            }`}>
                            {skill.type}
                        </span>
                    </div>
                    <p className="text-gray-300 text-sm">{skill.description}</p>
                    {skill.duration && (
                        <div className="mt-2 text-xs text-cyan-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                            Duration: {skill.duration}s
                        </div>
                    )}
                </div>
            </div>
        ))}
    </div>
);

const getSkillColor = (type: 'attack' | 'buff' | 'special') => {
    switch (type) {
        case 'attack': return 'from-red-600 to-orange-600';
        case 'buff': return 'from-green-600 to-emerald-600';
        case 'special': return 'from-purple-600 to-indigo-600';
        default: return 'from-gray-600 to-gray-500';
    }
};

const RulesSection = () => (
    <div className="space-y-6 animate-fadeIn text-gray-300">
        <div className="bg-white/5 p-6 rounded-xl border border-white/10">
            <h3 className="text-xl font-bold text-purple-300 mb-4 flex items-center gap-2">
                <Swords className="w-5 h-5" />
                Multiplayer Battle
            </h3>
            <ul className="space-y-3 list-disc list-inside">
                <li><strong className="text-white">Objective:</strong> Be the last player standing!</li>
                <li><strong className="text-white">Garbage Lines:</strong> Clearing 2+ lines sends garbage to opponents.</li>
                <li><strong className="text-white">K.O.:</strong> If your blocks reach the top of the grid, you are out.</li>
            </ul>
        </div>

        <div className="bg-white/5 p-6 rounded-xl border border-white/10">
            <h3 className="text-xl font-bold text-yellow-300 mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Skill System
            </h3>
            <ul className="space-y-3 list-disc list-inside">
                <li><strong className="text-white">Acquiring Skills:</strong> Clearing lines gives you a chance to get a skill card.</li>
                <li><strong className="text-white">Inventory:</strong> You can hold up to 3 skills at once.</li>
                <li><strong className="text-white">Strategy:</strong> Use attack skills to disrupt opponents or defense skills to survive.</li>
            </ul>
        </div>
    </div>
);
