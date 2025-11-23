import React from 'react';
import { Palette, Settings, Zap } from 'lucide-react';
import { GlassPanel } from '../ui/GlassPanel';
import { NeonButton } from '../ui/NeonButton';
import { SkinConfig, AVAILABLE_SKINS } from '../../types/skins';

interface MenuViewProps {
    roomIdInput: string;
    setRoomIdInput: (val: string) => void;
    currentSkin: SkinConfig;
    setCurrentSkin: (skin: SkinConfig) => void;
    onJoin: () => void;
    onPractice: () => void;
    onSettings: () => void;
    isInDiscord: boolean;
    windowHeight: number;
    scale: number;
}

export const MenuView: React.FC<MenuViewProps> = ({
    roomIdInput,
    setRoomIdInput,
    currentSkin,
    setCurrentSkin,
    onJoin,
    onPractice,
    onSettings,
    isInDiscord,
    windowHeight,
    scale
}) => {
    return (
        <div className="flex flex-col items-center justify-center h-full w-full max-w-md animate-in fade-in zoom-in duration-500">
            <div className="mb-8 text-center">
                <h1 className="text-6xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 drop-shadow-[0_0_25px_rgba(168,85,247,0.6)] mb-2">
                    CHAOS<br /><span className="text-white text-4xl tracking-[0.2em]">TETRIS</span>
                </h1>
                <p className="text-purple-300/80 tracking-widest text-sm uppercase font-bold">Multiplayer Battle Arena</p>
            </div>


            {/* --- Debug 資訊 (測試完後刪除) --- */}
            <div className="absolute top-0 left-0 bg-red-500 text-white z-[9999] text-xs p-2 font-mono">
                Discord Detected: {isInDiscord ? "YES" : "NO"} <br />
                Window Height: {windowHeight} <br />
                Calculated Scale: {scale.toFixed(3)}
            </div>

            <GlassPanel className="w-full p-6 gap-6">
                {/* Room Input */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Room ID</label>
                    <input
                        type="text"
                        value={roomIdInput}
                        onChange={(e) => setRoomIdInput(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all text-center font-mono text-lg uppercase placeholder-gray-600"
                        placeholder="ENTER ROOM CODE"
                    />
                </div>

                {/* Skin Selector */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                        <Palette size={14} /> Select Skin
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        {AVAILABLE_SKINS.map(s => (
                            <button key={s.id} onClick={() => setCurrentSkin(s)}
                                className={`relative py-2 px-3 rounded-lg border text-xs font-bold transition-all overflow-hidden group ${currentSkin.id === s.id ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 'bg-white/5 border-white/10 text-gray-500 hover:bg-white/10 hover:text-white'} `}>
                                <span className="relative z-10">{s.name}</span>
                                {currentSkin.id === s.id && <div className="absolute inset-0 bg-cyan-400/10 animate-pulse"></div>}
                                {s.rarity && <span className={`absolute top-0 right-0 text-[8px] px-1 rounded-bl ${s.rarity === 'legendary' ? 'bg-yellow-500/20 text-yellow-400' :
                                        s.rarity === 'epic' ? 'bg-purple-500/20 text-purple-400' :
                                            s.rarity === 'rare' ? 'bg-blue-500/20 text-blue-400' : 'hidden'
                                    }`}>{s.rarity.toUpperCase()}</span>}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="pt-4 space-y-3">
                    <NeonButton variant="warning" className="w-full py-3 text-base" onClick={onPractice}>
                        <div className="flex items-center gap-2"><Zap size={18} /> SOLO PRACTICE</div>
                    </NeonButton>
                    <NeonButton variant="primary" className="w-full py-4 text-lg" onClick={onJoin}>
                        JOIN GAME
                    </NeonButton>
                    <NeonButton variant="secondary" className="w-full py-3 text-base" onClick={onSettings}>
                        <div className="flex items-center gap-2"><Settings size={18} /> SETTINGS</div>
                    </NeonButton>
                </div>
            </GlassPanel>
        </div>
    );
};
