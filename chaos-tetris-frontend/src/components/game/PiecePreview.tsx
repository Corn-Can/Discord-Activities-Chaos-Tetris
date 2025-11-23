import React from 'react';
import { TetrisPiece } from '../../services/GameEngine';

interface PiecePreviewProps {
    piece: TetrisPiece | null;
    label?: string;
    small?: boolean;
}

export const PiecePreview: React.FC<PiecePreviewProps> = ({ piece, label, small = false }) => {
    // 1. Calculate Bounding Box
    let grid: number[][] = [];
    let color = 'transparent';

    if (piece) {
        color = piece.color;
        // Find bounds
        let minX = 4, maxX = -1, minY = 4, maxY = -1;
        piece.shape.forEach((row, y) => {
            row.forEach((cell, x) => {
                if (cell) {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            });
        });

        // Extract trimmed shape
        if (minX <= maxX && minY <= maxY) {
            for (let y = minY; y <= maxY; y++) {
                const newRow: number[] = [];
                for (let x = minX; x <= maxX; x++) {
                    newRow.push(piece.shape[y][x]);
                }
                grid.push(newRow);
            }
        }
    }

    // Container Size
    const containerSize = small ? 'w-16 h-16' : 'w-28 h-28';
    const blockSize = small ? 'w-3 h-3' : 'w-6 h-6';

    return (
        <div className="flex flex-col items-center">
            {label && <span className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-2">{label}</span>}

            <div className={`${containerSize} bg-black/40 rounded-xl border border-white/10 flex items-center justify-center shadow-inner overflow-hidden`}>
                {piece ? (
                    <div className="flex flex-col gap-[2px]">
                        {grid.map((row, y) => (
                            <div key={y} className="flex gap-[2px]">
                                {row.map((cell, x) => (
                                    <div
                                        key={`${x}-${y}`}
                                        className={`${blockSize} rounded-[2px] shadow-sm`}
                                        style={{
                                            backgroundColor: cell ? color : 'transparent',
                                            boxShadow: cell ? `inset 0 0 4px rgba(0,0,0,0.2), 0 0 8px ${color}` : 'none',
                                        }}
                                    />
                                ))}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-white/10 text-xs">EMPTY</div>
                )}
            </div>
        </div>
    );
};
