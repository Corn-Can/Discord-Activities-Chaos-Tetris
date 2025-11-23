import React from 'react';
import { Clock, Trophy, Settings, Users, Skull, LogOut } from 'lucide-react';
import { GlassPanel } from '../ui/GlassPanel';
import { MiniBoard } from '../MiniBoard';
import GameCanvas from '../GameCanvas';
import { PiecePreview } from '../game/PiecePreview';
import { SkillBars } from '../game/SkillBars';
import { SkillSlot } from '../game/SkillSlot';
import { Player, OpponentState, ChatMessage } from '../../types/shared';
import { TetrisPiece } from '../../services/GameEngine';
import { GameModifier } from '../../types/modifier';
import { SkillCard as SkillCardData } from '../../types/skill';
import { SkinConfig } from '../../types/skins';
import { ChatSystem } from '../social/ChatSystem';

// Helper component to display emote symbol
const EmoteDisplay: React.FC<{ emoteId: string }> = ({ emoteId }) => {
    const map: Record<string, string> = {
        'gg': '🤝', 'fire': '🔥', 'cry': '😭', 'laugh': '😂',
        'angry': '😡', 'heart': '❤️', 'thumbsup': '👍', 'surprised': '😲'
    };
    return <>{map[emoteId] || '❓'}</>;
};

interface GameViewProps {
    score: number;
    gameTime: number;
    isGameOver: boolean;
    players: Player[];
    opponentStates: OpponentState[];
    nextPieces: TetrisPiece[];
    heldPiece: TetrisPiece | null;
    activeModifiers: GameModifier[];
    playerSkills: (SkillCardData | null)[];
    targetingMode: 'random' | 'ko' | 'payback';
    spectatingId: string | null;
    scale: number;
    onUseSkill: (index: number) => void;
    onSpectate: (id: string) => void;
    onSettings: () => void;
    currentSkin: SkinConfig;
    roomId: string;
    myId: string;
    pendingGarbage: number;
    combo: number;
    isB2B: boolean;
    chatMessages: ChatMessage[];
    onSendMessage: (msg: string) => void;
    onSendEmote: (emoteId: string) => void;
    lastEmote: { playerId: string, emoteId: string, timestamp: number } | null;
    isPaused: boolean;
    isPractice: boolean;
    onLeave?: () => void;
}

export const GameView: React.FC<GameViewProps> = ({
    score,
    gameTime,
    isGameOver,
    players,
    opponentStates,
    nextPieces,
    heldPiece,
    activeModifiers,
    playerSkills,
    targetingMode,
    spectatingId,
    scale,
    onUseSkill,
    onSpectate,
    onSettings,
    currentSkin,
    roomId,
    myId,
    pendingGarbage,
    combo,
    isB2B,
    chatMessages,
    onSendMessage,
    onSendEmote,
    lastEmote,
    isPaused,
    isPractice,
    onLeave
}) => {
    return (
        <div className="relative z-10 flex items-center justify-center w-full h-full overflow-hidden">
            {/* Practice Mode Exit Button */}
            {isPractice && onLeave && (
                <div className="absolute top-4 left-4 z-50">
                    <button
                        onClick={onLeave}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/40 border border-red-500/40 hover:border-red-500/60 rounded-lg transition-all backdrop-blur-sm group text-red-200 hover:text-white"
                    >
                        <LogOut size={20} />
                        <span className="font-bold text-sm">LEAVE PRACTICE</span>
                    </button>
                </div>
            )}

            <div
                className="flex gap-6 items-center justify-center px-4 transition-transform duration-300 origin-center shrink-0"
                style={{
                    transform: `scale(${scale})`,
                    width: '1300px',
                    height: '900px'
                }}
            >

                {/* 左側：Stats & Chat */}
                <div className="w-72 flex flex-col gap-4 h-full pt-20 hidden xl:flex opacity-80 hover:opacity-100 transition-opacity">
                    {/* Chat System */}
                    <GlassPanel className="flex-1 flex flex-col overflow-hidden p-0">
                        <div className="p-3 border-b border-white/10 bg-white/5 font-bold text-sm flex items-center gap-2">
                            <Users size={16} className="text-cyan-400" />
                            CHAT
                        </div>
                        <ChatSystem
                            messages={chatMessages}
                            onSendMessage={onSendMessage}
                            onSendEmote={onSendEmote}
                            className="flex-1 border-none bg-transparent"
                        />
                    </GlassPanel>

                    <GlassPanel title="INFO" className="h-1/3 relative p-4">
                        <button
                            onClick={onSettings}
                            className="absolute top-3 right-3 text-gray-500 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-full"
                            title="Settings"
                        >
                            <Settings size={16} />
                        </button>
                        <div className="text-xs text-gray-400 space-y-2">
                            <p>Room: <span className="text-white font-mono">{roomId}</span></p>
                            <p>Skin: <span className="text-white">{currentSkin.name}</span></p>
                        </div>
                    </GlassPanel>
                </div>

                {/* 中央核心：HUD + 遊戲本體 */}
                <div className="relative flex-1 flex flex-col items-center h-full justify-center">

                    {/* HUD */}
                    <div className="flex items-end justify-between w-full px-8 mb-4 max-w-[600px]">
                        <div className="text-left">
                            <div className="text-[10px] text-gray-500 font-bold tracking-[0.2em] uppercase mb-1">Time</div>
                            <div className="flex items-baseline gap-2 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]">
                                <Clock size={20} />
                                <span className="text-4xl font-mono font-black">{gameTime}</span>
                                <span className="text-sm font-bold opacity-60">s</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-[10px] text-gray-500 font-bold tracking-[0.2em] uppercase mb-1">Score</div>
                            <div className="flex items-baseline gap-2 justify-end text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.6)]">
                                <Trophy size={20} />
                                <span className="text-4xl font-mono font-black">{score.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Game Unit */}
                    <div className="relative flex items-start gap-4">

                        {/* Left Wing */}
                        <div className="flex flex-col gap-4 pt-8 relative w-[100px] items-center">
                            <PiecePreview piece={heldPiece} label="HOLD" />

                            {/* 垃圾行計量條 (移回這裡避免跑版) */}
                            <div className="absolute top-8 -right-4 h-[600px] w-4 bg-black/40 border border-white/10 rounded-lg overflow-hidden flex flex-col justify-end p-1 shadow-inner z-10">
                                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNCIgaGVpZ2h0PSI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxwYXRoIGQ9Ik0wIDhoNHY0SDB6IiBmaWxsPSIjMDAwIiBmaWxsLW9wYWNpdHk9IjAuMiIvPjwvc3ZnPg==')] opacity-30 z-10"></div>
                                <div
                                    className="w-full bg-gradient-to-t from-red-600 via-orange-500 to-yellow-400 rounded transition-all duration-300 opacity-90 shadow-[0_0_15px_rgba(220,38,38,0.6)]"
                                    style={{ height: `${Math.min(pendingGarbage * 5, 100)}%` }}
                                />
                                {pendingGarbage > 0 && (
                                    <div className="absolute top-2 w-full text-center z-20">
                                        <div className="text-[8px] font-black text-red-500 tracking-widest animate-pulse">!</div>
                                    </div>
                                )}
                            </div>

                            {/* 狀態指示燈 */}
                            <div className="mt-8 flex flex-col items-center gap-2 w-full">
                                {combo > 0 && (
                                    <div className="text-yellow-300 font-black text-xl italic tracking-tighter drop-shadow-[0_0_6px_rgba(250,204,21,0.8)] animate-bounce text-center">
                                        {combo} COMBO
                                    </div>
                                )}
                                {isB2B && (
                                    <div className="text-[10px] font-bold text-purple-300 px-2 py-1 rounded border border-purple-500/50 bg-purple-500/10 animate-pulse tracking-widest whitespace-nowrap">
                                        🔥 B2B 🔥
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 中央：主畫布 */}
                        <div className="relative mx-4">
                            <div className={`absolute -inset-[2px] rounded-xl blur-md opacity-75 transition-colors duration-500 ${spectatingId ? 'bg-yellow-500/30' : 'bg-gradient-to-b from-cyan-500/20 via-purple-500/20 to-pink-500/20'} `}></div>
                            <div className="relative border-[4px] border-[#2a2a35] bg-black rounded-lg shadow-2xl overflow-hidden w-[320px] h-[600px] flex items-center justify-center transition-all">
                                {spectatingId ? (
                                    <div className="w-full h-full relative animate-in fade-in zoom-in duration-300">
                                        <div className="absolute top-10 left-0 w-full text-center z-10">
                                            <div className="inline-block px-3 py-1 bg-yellow-600/80 backdrop-blur text-black font-bold text-xs rounded-full border border-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.6)] animate-pulse">
                                                👁 SPECTATING: {players.find(p => p.id === spectatingId)?.name || 'Unknown'}
                                            </div>
                                        </div>
                                        <MiniBoard
                                            board={opponentStates.find(op => op.playerId === spectatingId)?.board || []}
                                            className="!w-full !h-full !bg-gray-900"
                                        />
                                    </div>
                                ) : (
                                    <GameCanvas skin={currentSkin} />
                                )}

                                {spectatingId && opponentStates.find(op => op.playerId === spectatingId)?.isDead && (
                                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60">
                                        <span className="text-4xl font-black text-red-500 border-4 border-red-500 px-4 py-1 -rotate-12 opacity-80">K.O.</span>
                                    </div>
                                )}

                                {/* Emote Overlay */}
                                {lastEmote && lastEmote.playerId === myId && (Date.now() - lastEmote.timestamp < 3000) && (
                                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 animate-bounce text-6xl drop-shadow-[0_0_20px_rgba(255,255,255,0.8)] pointer-events-none">
                                        <EmoteDisplay emoteId={lastEmote.emoteId} />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right Wing */}
                        <div className="flex flex-col gap-4 pt-8 w-[100px] items-center">
                            <PiecePreview piece={nextPieces[0]} label="NEXT" />
                            <div className="flex flex-col gap-2 opacity-50 scale-90 origin-top">
                                {nextPieces.slice(1, 4).map((p, i) => <PiecePreview key={i} piece={p} small />)}
                            </div>

                            <div className="mt-8">
                                {!isPractice && <SkillBars activeModifiers={activeModifiers} />}
                            </div>
                        </div>
                    </div>

                    {/* Skill Bar */}
                    {!isPractice && (
                        <div className="mt-6 w-full max-w-[400px]">
                            <div className="flex justify-center gap-3">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <SkillSlot
                                        key={i}
                                        index={i}
                                        skill={playerSkills[i]}
                                        onClick={onUseSkill}
                                    />
                                ))}
                            </div>
                            {playerSkills.length === 0 && (
                                <div className="text-center mt-2">
                                    <span className="text-[10px] text-gray-600 uppercase tracking-widest">Clear lines to charge skills</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* PAUSED Overlay */}
                    {isPaused && (
                        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 rounded-xl">
                            <div className="flex flex-col items-center gap-4">
                                <h2 className="text-6xl font-black text-white tracking-[0.2em] drop-shadow-[0_0_20px_rgba(255,255,255,0.5)]">
                                    PAUSED
                                </h2>
                                <p className="text-gray-400 text-sm uppercase tracking-widest animate-pulse">
                                    Game Paused
                                </p>
                            </div>
                        </div>
                    )}

                    {/* 死亡/等待狀態顯示 */}
                    {isGameOver && (
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none w-full">
                            {!spectatingId ? (
                                <div className="flex flex-col items-center animate-bounce">
                                    <h2 className="text-5xl font-black text-gray-400 italic tracking-tighter stroke-white drop-shadow-[0_5px_5px_rgba(0,0,0,0.8)] mb-4">
                                        WAITING...
                                    </h2>
                                    <div className="bg-black/80 text-white px-6 py-3 rounded-full text-sm border border-white/20 animate-pulse flex items-center gap-2 shadow-xl backdrop-blur-md">
                                        <span> Click opponents to spectate ＞</span>
                                    </div>
                                </div>
                            ) : (
                                // 正在觀戰時顯示的提示
                                <div className="flex justify-center">
                                    <div className="bg-purple-900/90 text-purple-200 px-6 py-2 rounded-full border border-purple-500/50 text-xs font-bold tracking-[0.2em] shadow-lg backdrop-blur-md">
                                        SPECTATING MODE
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                </div>

                {/* --- 右側：對手列表 (修正版：自動填滿高度) --- */}
                <div className="w-80 h-full flex flex-col pt-20 pb-4 transition-all duration-300"> {/* ✅ 加入 pb-4 底部留白 */}

                    {/* ✅ 關鍵修正：
                        1. 使用 flex-1 讓它自動填滿剩餘高度
                        2. overflow-y-auto 讓內容過長時可滾動 (但隱藏 scrollbar)
                        3. 確保 GlassPanel 也是 h-full
                    */}
                    <div className="flex-1 overflow-y-auto scrollbar-hide">
                        <GlassPanel title="OPPONENTS" className="min-h-full flex flex-col gap-4 p-4">
                            {opponentStates.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-gray-500 gap-2 opacity-50">
                                    <Users size={32} />
                                    <span className="text-sm font-bold tracking-widest">NO OPPONENTS</span>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-4">
                                    {opponentStates.map((opponent) => (
                                        <div
                                            key={opponent.playerId}
                                            className={`relative group cursor-pointer transition-all duration-300 ${spectatingId === opponent.playerId ? 'ring-2 ring-yellow-400 scale-105 z-10' : 'hover:scale-102 hover:bg-white/5'
                                                }`}
                                            onClick={() => onSpectate(opponent.playerId)}
                                        >
                                            {/* 對手卡片 */}
                                            <div className="bg-black/40 rounded-lg p-3 border border-white/10 backdrop-blur-sm relative overflow-hidden">
                                                {/* 背景動態光效 */}
                                                <div className={`absolute inset-0 opacity-20 transition-opacity duration-500 ${opponent.isDead ? 'bg-red-900' : 'bg-gradient-to-br from-blue-500/10 to-purple-500/10'
                                                    }`}></div>

                                                {/* 標頭資訊 */}
                                                <div className="flex justify-between items-center mb-2 relative z-10">
                                                    <span className="font-bold text-white text-sm flex items-center gap-2">
                                                        {opponent.isDead && <Skull size={14} className="text-red-500" />}
                                                        {players.find(p => p.id === opponent.playerId)?.name || 'Unknown'}
                                                    </span>
                                                    {opponent.targetingMode && (
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30">
                                                            {opponent.targetingMode}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* 迷你棋盤預覽 */}
                                                <div className="relative aspect-[10/20] w-full bg-black/60 rounded border border-white/5 overflow-hidden">
                                                    <MiniBoard board={opponent.board} className="w-full h-full opacity-80" />

                                                    {/* K.O. 標記 */}
                                                    {opponent.isDead && (
                                                        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[1px]">
                                                            <span className="text-2xl font-black text-red-500 -rotate-12 border-2 border-red-500 px-2 opacity-80">K.O.</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* 狀態數據 */}
                                                <div className="flex justify-between mt-2 text-[10px] text-gray-400 font-mono relative z-10">
                                                    <span>SCORE: {opponent.score}</span>
                                                    {spectatingId === opponent.playerId && (
                                                        <span className="text-yellow-400 animate-pulse">● WATCHING</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </GlassPanel>
                    </div>
                </div>

            </div>
        </div>
    );
};