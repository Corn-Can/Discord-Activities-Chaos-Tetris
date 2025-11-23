import React from 'react';
import { Crown } from 'lucide-react';
import { GlassPanel } from '../ui/GlassPanel';
import { NeonButton } from '../ui/NeonButton';
import { Player, OpponentState } from '../../types/shared';

interface ResultOverlayProps {
    serverGameEnded: boolean;
    players: Player[];
    opponentStates: OpponentState[];
    winnerId: string | null;
    myId: string;
    myScore: number;
    isMyGameOver: boolean;
    onReturnToLobby: () => void;
}

export const ResultOverlay: React.FC<ResultOverlayProps> = ({
    serverGameEnded,
    players,
    opponentStates,
    winnerId,
    myId,
    myScore,
    isMyGameOver,
    onReturnToLobby
}) => {
    if (!serverGameEnded) return null;

    const getFinalLeaderboard = () => {
        // 合併自己與對手的資料
        const allResults = players.map(p => {
            // 如果是自己
            if (p.id === myId) {
                return { ...p, finalScore: myScore, isDead: isMyGameOver };
            }
            // 如果是對手
            const op = opponentStates.find(o => o.playerId === p.id);
            return { ...p, finalScore: op ? op.score : 0, isDead: op?.isDead };
        });

        // 依照分數高低排序
        return allResults.sort((a, b) => b.finalScore - a.finalScore);
    };

    const leaderboard = getFinalLeaderboard();

    return (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl animate-in fade-in duration-500">
            {/* 背景光效 */}
            <div className="absolute w-[600px] h-[600px] bg-purple-900/30 rounded-full blur-[120px] pointer-events-none"></div>

            <GlassPanel className="w-full max-w-2xl p-0 overflow-hidden border-purple-500/30 shadow-[0_0_50px_rgba(168,85,247,0.2)] bg-black/80 backdrop-blur-2xl">
                {/* Header */}
                <div className="relative bg-gradient-to-b from-purple-900/40 to-black/60 p-8 text-center border-b border-white/10">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-50"></div>
                    <h2 className="text-5xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-purple-200 to-purple-400 mb-2 drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]">
                        MATCH RESULTS
                    </h2>
                    <div className="flex items-center justify-center gap-2 text-sm text-purple-300/80 font-bold tracking-[0.3em] uppercase">
                        <Crown size={14} className="text-yellow-400" />
                        <span>Winner: <span className="text-white">{players.find(p => p.id === winnerId)?.name || "Unknown"}</span></span>
                        <Crown size={14} className="text-yellow-400" />
                    </div>
                </div>

                {/* Leaderboard */}
                <div className="p-6 space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar bg-black/20">
                    {leaderboard.map((p, index) => {
                        const isWinner = p.id === winnerId;
                        const isMe = p.id === myId;

                        return (
                            <div key={p.id} className={`relative flex items-center justify-between p-4 rounded-xl border transition-all duration-300 group overflow-hidden
                                ${isWinner
                                    ? 'bg-gradient-to-r from-yellow-900/20 to-black border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.1)]'
                                    : isMe
                                        ? 'bg-white/5 border-white/20 hover:bg-white/10'
                                        : 'bg-black/40 border-white/5 hover:border-white/10'
                                }
                            `}>
                                {/* Rank & Info */}
                                <div className="flex items-center gap-5 relative z-10">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-xl transform rotate-3 group-hover:rotate-0 transition-transform
                                        ${index === 0 ? 'bg-yellow-400 text-black shadow-[0_0_10px_rgba(250,204,21,0.5)]' :
                                            index === 1 ? 'bg-gray-300 text-black' :
                                                index === 2 ? 'bg-orange-700 text-white' : 'bg-gray-800 text-gray-500'
                                        }
                                    `}>
                                        {index + 1}
                                    </div>

                                    <div className="flex flex-col">
                                        <span className={`font-bold text-lg ${isMe ? 'text-white' : 'text-gray-300'}`}>
                                            {p.name} {isMe && <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded ml-2 border border-purple-500/30">YOU</span>}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            {p.isDead && !isWinner && <span className="text-[10px] text-red-500 font-bold uppercase bg-red-900/20 px-1.5 py-0.5 rounded border border-red-900/30">Eliminated</span>}
                                            {isWinner && <span className="text-[10px] text-yellow-400 font-bold uppercase bg-yellow-900/20 px-1.5 py-0.5 rounded border border-yellow-900/30">Victory</span>}
                                        </div>
                                    </div>
                                </div>

                                {/* Score */}
                                <div className="text-right relative z-10">
                                    <div className={`font-mono font-black text-2xl tracking-tight ${isWinner ? 'text-yellow-400' : 'text-white'}`}>
                                        {p.finalScore.toLocaleString()}
                                    </div>
                                    <div className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">Total Score</div>
                                </div>

                                {/* Hover Glow Effect */}
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none"></div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer Actions */}
                <div className="p-8 bg-black/40 border-t border-white/10 flex gap-4 justify-center">
                    <NeonButton
                        onClick={onReturnToLobby}
                        className="w-full max-w-xs py-4 text-lg font-bold shadow-[0_0_30px_rgba(168,85,247,0.3)] hover:shadow-[0_0_50px_rgba(168,85,247,0.5)]"
                        variant="primary"
                    >
                        RETURN TO LOBBY
                    </NeonButton>
                </div>
            </GlassPanel>
        </div>
    );
};
