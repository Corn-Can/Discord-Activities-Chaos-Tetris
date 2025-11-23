import React from 'react';
import { Users, Play, Settings, LogOut } from 'lucide-react';
import { Player, ChatMessage } from '../../types/shared';
import { NeonButton } from '../ui/NeonButton';
import { GlassPanel } from '../ui/GlassPanel';
import { ChatSystem } from '../social/ChatSystem';

interface LobbyViewProps {
    roomId: string;
    players: Player[];
    hostId: string | null;
    myId: string;
    onLeave: () => void;
    onStart: () => void;
    onSettings: () => void;
    chatMessages: ChatMessage[];
    onSendMessage: (msg: string) => void;
    onSendEmote: (emoteId: string) => void;
}

export const LobbyView: React.FC<LobbyViewProps> = ({
    roomId,
    players,
    hostId,
    myId,
    onLeave,
    onStart,
    onSettings,
    chatMessages,
    onSendMessage,
    onSendEmote
}) => {
    const isHost = hostId === myId;

    return (
        <div className="w-full h-full flex flex-col items-center justify-center p-8 relative z-10">
            <div className="max-w-6xl w-full h-[80vh] grid grid-cols-12 gap-6">
                {/* Left Panel: Room Info & Players */}
                <div className="col-span-8 flex flex-col gap-6">
                    {/* Header */}
                    <GlassPanel className="p-6 flex items-center justify-between">
                        <div>
                            <h2 className="text-3xl font-black text-white tracking-wider flex items-center gap-3">
                                <Users className="text-cyan-400" size={32} />
                                LOBBY
                            </h2>
                            <p className="text-gray-400 mt-1">Room ID: <span className="text-white font-mono bg-white/10 px-2 py-1 rounded">{roomId}</span></p>
                        </div>
                        <div className="flex items-center gap-3">
                            <NeonButton
                                variant="secondary"
                                icon={<Settings size={20} />}
                                onClick={onSettings}
                            >
                                SETTINGS
                            </NeonButton>
                            <NeonButton
                                variant="danger"
                                icon={<LogOut size={20} />}
                                onClick={onLeave}
                            >
                                LEAVE
                            </NeonButton>
                        </div>
                    </GlassPanel>

                    {/* Player List */}
                    <GlassPanel className="flex-1 p-6 overflow-hidden flex flex-col">
                        <h3 className="text-xl font-bold text-cyan-400 mb-4 flex items-center gap-2">
                            PLAYERS <span className="text-sm text-gray-500 bg-gray-900 px-2 py-0.5 rounded-full">{players.length}/8</span>
                        </h3>
                        <div className="grid grid-cols-2 gap-4 overflow-y-auto pr-2">
                            {players.map((player) => (
                                <div
                                    key={player.id}
                                    className={`
                                        relative p-4 rounded-xl border transition-all duration-300 group
                                        ${player.id === myId
                                            ? 'bg-cyan-900/20 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                                            : 'bg-white/5 border-white/10 hover:bg-white/10'
                                        }
                                    `}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`
                                            w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold
                                            ${player.id === myId ? 'bg-cyan-500 text-black' : 'bg-gray-700 text-gray-300'}
                                        `}>
                                            {player.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="font-bold text-lg flex items-center gap-2">
                                                {player.name}
                                                {player.id === hostId && (
                                                    <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded border border-yellow-500/30">HOST</span>
                                                )}
                                                {player.id === myId && (
                                                    <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded border border-cyan-500/30">YOU</span>
                                                )}
                                            </div>
                                            <div className="text-xs text-gray-500 mt-1">Ready to play</div>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Empty Slots */}
                            {Array.from({ length: Math.max(0, 8 - players.length) }).map((_, i) => (
                                <div key={`empty-${i}`} className="p-4 rounded-xl border border-white/5 bg-black/20 flex items-center justify-center text-gray-600 border-dashed">
                                    Waiting for player...
                                </div>
                            ))}
                        </div>
                    </GlassPanel>
                </div>

                {/* Right Panel: Chat & Actions */}
                <div className="col-span-4 flex flex-col gap-6">
                    {/* Chat System */}
                    <ChatSystem
                        messages={chatMessages}
                        onSendMessage={onSendMessage}
                        onSendEmote={onSendEmote}
                        className="flex-1 h-full min-h-0"
                    />

                    {/* Start Button */}
                    <GlassPanel className="p-6 flex flex-col gap-4">
                        {isHost ? (
                            <NeonButton
                                variant="primary"
                                size="lg"
                                icon={<Play size={24} />}
                                onClick={onStart}
                                className="w-full py-6 text-xl"
                                glowColor="#22c55e"
                            >
                                START GAME
                            </NeonButton>
                        ) : (
                            <div className="text-center p-4 bg-white/5 rounded-lg border border-white/10 animate-pulse">
                                <p className="text-gray-400">Waiting for host to start...</p>
                            </div>
                        )}
                    </GlassPanel>
                </div>
            </div>
        </div>
    );
};
