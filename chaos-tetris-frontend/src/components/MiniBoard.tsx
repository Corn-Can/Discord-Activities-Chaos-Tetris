import React, { useEffect, useRef } from 'react';

// 簡單的顏色映射，與 GameCanvas 保持一致但更扁平化
const MINI_COLORS = [
    '#000000', // 0: Empty (透明或黑色)
    '#06b6d4', // 1: I (Cyan)
    '#3b82f6', // 2: J (Blue)
    '#f97316', // 3: L (Orange)
    '#eab308', // 4: O (Yellow)
    '#22c55e', // 5: S (Green)
    '#a855f7', // 6: T (Purple)
    '#ef4444', // 7: Z (Red)
    '#4b5563', // 8: Garbage (Gray)
];

interface MiniBoardProps {
    board: number[][];
    className?: string;
    activePiece?: {
        shape: number[][];
        x: number;
        y: number;
        color: string;
    };
    skinId?: string;
}

const MiniBoardComponent: React.FC<MiniBoardProps> = ({ board, className = "", activePiece, skinId }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !board || board.length === 0) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const cols = 10;
        const rows = 20;
        // 計算每個格子的大小 (自動適應 Canvas 寬度)
        const cellWidth = canvas.width / cols;
        const cellHeight = canvas.height / rows;

        // 清空畫布
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 繪製背景 (半透明黑)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Helper function to draw a cell
        const drawCell = (x: number, y: number, color: string, isGhost: boolean = false) => {
            ctx.fillStyle = isGhost ? color + '40' : color; // 40 = 25% opacity for ghost
            ctx.fillRect(
                x * cellWidth + 0.5,
                y * cellHeight + 0.5,
                cellWidth - 1,
                cellHeight - 1
            );

            if (!isGhost) {
                // (選用) 簡單的亮面效果，增加立體感
                ctx.fillStyle = 'rgba(255,255,255,0.2)';
                ctx.fillRect(
                    x * cellWidth + 0.5,
                    y * cellHeight + 0.5,
                    cellWidth - 1,
                    (cellHeight - 1) / 2
                );
            } else {
                // Ghost border
                ctx.strokeStyle = color;
                ctx.lineWidth = 1;
                ctx.strokeRect(
                    x * cellWidth + 0.5,
                    y * cellHeight + 0.5,
                    cellWidth - 1,
                    cellHeight - 1
                );
            }
        };

        // 1. 繪製靜態盤面
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const cellValue = board[y][x];
                if (cellValue !== 0) {
                    const color = MINI_COLORS[cellValue] || '#ffffff';
                    drawCell(x, y, color);
                }
            }
        }

        // 2. 繪製正在掉落的方塊 (Active Piece)
        if (activePiece) {
            const { shape, x, y, color } = activePiece;
            shape.forEach((row, dy) => {
                row.forEach((value, dx) => {
                    if (value !== 0) {
                        const boardX = x + dx;
                        const boardY = y + dy;
                        if (boardX >= 0 && boardX < cols && boardY >= 0 && boardY < rows) {
                            drawCell(boardX, boardY, color);
                        }
                    }
                });
            });
        }

    }, [board, activePiece, skinId]); // 當 board 或 activePiece 資料改變時重繪

    // 設定固定寬高比 10:20 -> 1:2
    return (
        <canvas
            ref={canvasRef}
            width={100}
            height={200}
            className={`w-full h-full object-contain bg-black/20 rounded ${className}`}
        />
    );
};

export const MiniBoard = React.memo(MiniBoardComponent);