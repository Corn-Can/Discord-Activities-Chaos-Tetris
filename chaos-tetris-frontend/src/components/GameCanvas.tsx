import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Engine, Scene, FreeCamera, HemisphericLight, Vector3, MeshBuilder, Color4, StandardMaterial, Color3, Mesh, Camera, Texture } from '@babylonjs/core';
import { gameEngine, BlockType, TETROMINOS } from '../services/GameEngine';
import { settingsService } from '../services/SettingsService';

import { SkinConfig } from '../types/skins';
import { SkillEffects } from './effects/SkillEffects';

interface GameCanvasProps {
    skin: SkinConfig;
}

const CELL_SIZE = 1;
const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const NEXT_PIECE_PREVIEW_OFFSET_X = BOARD_WIDTH * CELL_SIZE + CELL_SIZE * 3;
const HOLD_PIECE_PREVIEW_OFFSET_X = -CELL_SIZE * 5;

const GameCanvas: React.FC<GameCanvasProps> = ({ skin }) => {
    const engineRef = useRef<Engine | null>(null);
    const resizeHandlerRef = useRef<(() => void) | undefined>(undefined);
    const cellsRef = useRef<Record<string, Mesh>>({});
    const [, setUpdateCounter] = useState(0);

    const activeKeys = useRef(new Set<string>()).current;

    // Movement State (DAS/ARR/SDF)
    const dasTimer = useRef(0);
    const arrTimer = useRef(0);
    const dcdTimer = useRef(0);
    const isDasActive = useRef(false);
    const lastSoftDropTime = useRef(0);
    const lastTimeRef = useRef(0);
    const lastPieceRef = useRef<any>(null);

    // 閃爍特效計時器
    const flashTimer = useRef(0);
    const currentFlashMap = useRef<Record<string, string>>({});

    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        if (gameEngine.isGameOver) return;
        const settings = settingsService.getSettings();
        const { keybinds } = settings;

        if (event.key === keybinds.hardDrop) event.preventDefault(); // Prevent scrolling

        if (!activeKeys.has(event.key)) {
            activeKeys.add(event.key);

            if (!gameEngine.isGameOver) {
                // Initial Press Handling
                if (event.key === keybinds.rotateCW) gameEngine.rotatePiece(true);
                if (event.key === keybinds.rotateCCW) gameEngine.rotatePiece(false);
                if (event.key === keybinds.hardDrop) gameEngine.dropPiece();
                if (event.key === keybinds.hold) gameEngine.holdPiece();

                // Movement Initial Press
                if (event.key === keybinds.moveLeft) {
                    gameEngine.movePiece('left');
                    dasTimer.current = 0;
                    isDasActive.current = false;
                }
                if (event.key === keybinds.moveRight) {
                    gameEngine.movePiece('right');
                    dasTimer.current = 0;
                    isDasActive.current = false;
                }
                if (event.key === keybinds.softDrop) {
                    gameEngine.movePiece('down');
                    lastSoftDropTime.current = performance.now();
                }
            }
        }
    }, [activeKeys]);

    const handleKeyUp = useCallback((event: KeyboardEvent) => {
        activeKeys.delete(event.key);
        const settings = settingsService.getSettings();
        // Reset DAS if movement keys are released
        if (event.key === settings.keybinds.moveLeft || event.key === settings.keybinds.moveRight) {
            // If both were held and one released, we might want to handle that, but for now simple reset
            if (!activeKeys.has(settings.keybinds.moveLeft) && !activeKeys.has(settings.keybinds.moveRight)) {
                dasTimer.current = 0;
                isDasActive.current = false;
            }
        }
    }, [activeKeys]);

    // 使用 Callback Ref 確保 Canvas DOM 存在時才初始化 Engine
    const canvasRef = useCallback((canvas: HTMLCanvasElement | null) => {
        if (!canvas) {
            // Cleanup when canvas is removed
            if (resizeHandlerRef.current) {
                window.removeEventListener('resize', resizeHandlerRef.current);
                resizeHandlerRef.current = undefined;
            }
            if (engineRef.current) {
                engineRef.current.dispose();
                engineRef.current = null;
            }
            return;
        }

        // Initialize Engine
        const engine = new Engine(canvas, true, {
            preserveDrawingBuffer: true,
            stencil: true
        });
        engineRef.current = engine;

        const scene = new Scene(engine);
        scene.clearColor = new Color4(0.1, 0.1, 0.1, 1); // 深灰背景

        // 設定攝影機
        const camera = new FreeCamera('camera1', new Vector3(BOARD_WIDTH / 2 * CELL_SIZE, BOARD_HEIGHT / 2 * CELL_SIZE, -BOARD_HEIGHT * 0.8), scene);
        camera.setTarget(new Vector3(BOARD_WIDTH / 2 * CELL_SIZE, BOARD_HEIGHT / 2 * CELL_SIZE, 0));
        camera.mode = Camera.ORTHOGRAPHIC_CAMERA;

        // 保持寬高比
        const updateCameraOrtho = () => {
            const renderingCanvas = engine.getRenderingCanvas();
            if (renderingCanvas) {
                const aspectRatio = renderingCanvas.width / renderingCanvas.height;
                const orthoHeight = BOARD_HEIGHT * CELL_SIZE + 2;
                const orthoWidth = orthoHeight * aspectRatio;
                camera.orthoTop = orthoHeight / 2;
                camera.orthoBottom = -orthoHeight / 2;
                camera.orthoLeft = -orthoWidth / 2;
                camera.orthoRight = orthoWidth / 2;
            }
        };

        // Force resize and update camera immediately
        engine.resize();
        updateCameraOrtho();

        camera.inputs.clear();

        const light = new HemisphericLight('light1', new Vector3(0, 1, 0), scene);
        light.intensity = 1.0;

        // --- 材質系統 ---
        const materials: Record<string, StandardMaterial> = {};

        const createMaterial = (name: string, color: Color3, alpha: number = 1.0) => {
            const mat = new StandardMaterial(name, scene);
            mat.diffuseColor = color;
            mat.emissiveColor = color.scale(0.6); // Default brighter without texture
            mat.alpha = alpha;
            return mat;
        };

        const colorMap: { [key: string]: string } = {
            empty: '#191919',
            cyan: '#00FFFF',
            blue: '#0000FF',
            orange: '#FFA500',
            yellow: '#FFFF00',
            green: '#00FF00',
            purple: '#800080',
            red: '#FF0000',
            garbage: '#8e96a1ff',
        };

        // 1. 建立實體方塊材質
        Object.keys(colorMap).forEach(colorName => {
            materials[colorName] = createMaterial(`${colorName}Mat`, Color3.FromHexString(colorMap[colorName]));
        });

        // 2. 建立幽靈方塊材質
        Object.keys(colorMap).filter(k => k !== 'empty').forEach(colorName => {
            materials[`${colorName}Ghost`] = createMaterial(
                `${colorName}GhostMat`,
                Color3.FromHexString(colorMap[colorName]),
                0.4
            );
        });

        // 背景板
        const boardPlane = MeshBuilder.CreatePlane("boardPlane", { width: BOARD_WIDTH * CELL_SIZE, height: BOARD_HEIGHT * CELL_SIZE }, scene);
        boardPlane.position.x = (BOARD_WIDTH / 2) * CELL_SIZE;
        boardPlane.position.y = (BOARD_HEIGHT / 2) * CELL_SIZE;
        boardPlane.position.z = 0.5;
        boardPlane.material = createMaterial('boardMat', new Color3(0.05, 0.05, 0.05));

        // Async Texture Loading
        if (skin.texturePath) {
            const texture = new Texture(skin.texturePath, scene, undefined, undefined, undefined, () => {
                // On Load
                Object.values(materials).forEach(mat => {
                    mat.diffuseTexture = texture;
                    // Adjust emissive if needed, but keeping it bright is usually fine or we can darken it
                    // mat.emissiveColor = mat.diffuseColor.scale(0.3); 
                });
            });
        }

        // 建立物件池 (Object Pooling)
        const createBlockPool = (prefix: string, count: number) =>
            Array.from({ length: count }, (_, i) => {
                const block = MeshBuilder.CreateBox(`${prefix}-${i}`, { size: CELL_SIZE * 0.95 }, scene);
                block.isVisible = false;
                return block;
            });

        // 棋盤格子池
        cellsRef.current = {}; // Reset refs
        for (let y = 0; y < BOARD_HEIGHT; y++) {
            for (let x = 0; x < BOARD_WIDTH; x++) {
                const cell = MeshBuilder.CreateBox(`cell-${x}-${y}`, { size: CELL_SIZE * 0.95 }, scene);
                cell.position.x = x * CELL_SIZE + CELL_SIZE / 2;
                cell.position.y = (BOARD_HEIGHT - 1 - y) * CELL_SIZE + CELL_SIZE / 2;
                cell.isVisible = false;
                cellsRef.current[`${x}-${y}`] = cell;
            }
        }

        const currentPieceBlocks = createBlockPool('current', 4);
        const ghostPieceBlocks = createBlockPool('ghost', 4);
        const heldPieceBlocks = createBlockPool('held', 4);
        const nextPieceBlocks: Mesh[][] = [];
        for (let i = 0; i < 4; i++) nextPieceBlocks.push(createBlockPool(`next-${i}`, 4));

        const moveDelay = 100;
        const softDropDelay = 50;
        const originalCameraPosition = camera.position.clone();
        const colorKeys = Object.keys(colorMap).filter(k => k !== 'empty');

        // --- Render Loop ---
        let frameCount = 0;
        engine.runRenderLoop(() => {
            frameCount++;
            if (frameCount % 60 === 0) {
                console.log('GameCanvas Render Debug:', {
                    hasBoard: !!gameEngine.board,
                    boardLength: gameEngine.board?.length,
                    cellsCount: Object.keys(cellsRef.current).length,
                    cameraPos: camera.position.toString(),
                    engineRef: !!engineRef.current,
                    sceneReady: scene.isReady()
                });
            }

            const now = performance.now();
            const deltaTime = now - lastTimeRef.current;
            lastTimeRef.current = now;

            const settings = settingsService.getSettings();
            const { das, arr, sdf, dcd } = settings.controls;
            const { keybinds } = settings;

            // --- DCD Handling (Detect Piece Change) ---
            if (gameEngine.currentPiece !== lastPieceRef.current) {
                lastPieceRef.current = gameEngine.currentPiece;
                // If DAS is active (holding key), apply DCD
                if (isDasActive.current && dcd > 0) {
                    dcdTimer.current = dcd;
                }
            }

            // --- DAS / ARR Handling ---
            const isLeft = activeKeys.has(keybinds.moveLeft);
            const isRight = activeKeys.has(keybinds.moveRight);

            if (isLeft || isRight) {
                // If both pressed, prioritize the most recent one? Or cancel out? 
                // For simplicity, let's prioritize Right if both (or just one)
                // Actually, standard is "most recent", but we don't track order in Set.
                // Let's just check one.
                const direction = isRight && !isLeft ? 'right' : (isLeft && !isRight ? 'left' : null);

                if (direction) {
                    if (!isDasActive.current) {
                        dasTimer.current += deltaTime;
                        if (dasTimer.current >= das) {
                            isDasActive.current = true;
                            arrTimer.current = arr; // Trigger immediately
                        }
                    } else {
                        // DAS is active, check DCD
                        if (dcdTimer.current > 0) {
                            dcdTimer.current -= deltaTime;
                            // Skip ARR while DCD is active
                        } else {
                            arrTimer.current += deltaTime;
                            if (arrTimer.current >= arr) {
                                if (arr === 0) {
                                    // Instant movement (teleport to wall)
                                    // We'll just move many times
                                    for (let i = 0; i < 10; i++) gameEngine.movePiece(direction);
                                } else {
                                    const steps = Math.floor(arrTimer.current / arr);
                                    arrTimer.current %= arr;
                                    for (let i = 0; i < steps; i++) {
                                        gameEngine.movePiece(direction);
                                    }
                                }
                            }
                        }
                    }
                }

            } else {
                dasTimer.current = 0;
                isDasActive.current = false;
            }

            // --- SDF Handling ---
            if (activeKeys.has(keybinds.softDrop)) {
                // Calculate delay based on SDF.
                // Base gravity is roughly 1000ms (1G).
                // SDF 20 means 20x speed => 1000 / 20 = 50ms delay.
                const softDropDelay = Math.max(0, 1000 / sdf);

                if (now - lastSoftDropTime.current > softDropDelay) {
                    gameEngine.movePiece('down');
                    lastSoftDropTime.current = now;
                }
            }

            // 特效處理
            if (gameEngine.isJumpBoardActive) {
                camera.position.x = originalCameraPosition.x + (Math.random() - 0.5) * 0.5;
                camera.position.y = originalCameraPosition.y + (Math.random() - 0.5) * 0.5;
            } else {
                camera.position.copyFrom(originalCameraPosition);
            }

            if (gameEngine.isColorFlashActive) {
                if (now - flashTimer.current > 200) {
                    flashTimer.current = now;
                    currentFlashMap.current = {};
                }
            }

            const getMaterial = (colorName: string, uniqueKey: string) => {
                if (gameEngine.isColorFlashActive) {
                    if (!currentFlashMap.current[uniqueKey]) {
                        const randomColor = colorKeys[Math.floor(Math.random() * colorKeys.length)];
                        currentFlashMap.current[uniqueKey] = randomColor;
                    }
                    return materials[currentFlashMap.current[uniqueKey]];
                }
                return materials[colorName];
            };

            // 只有當 board 存在時才渲染方塊
            if (gameEngine.board) {
                // 1. 渲染棋盤
                for (let y = 0; y < BOARD_HEIGHT; y++) {
                    for (let x = 0; x < BOARD_WIDTH; x++) {
                        const cell = cellsRef.current[`${x}-${y}`];
                        if (cell) {
                            let displayX = x;
                            let displayY = y;
                            // Only vertical reverse affects visual display
                            if (gameEngine.isVerticalReversed) displayY = BOARD_HEIGHT - 1 - y;

                            const blockType = gameEngine.board[displayY][displayX];
                            cell.isVisible = blockType !== BlockType.EMPTY;
                            if (cell.isVisible) {
                                const def = TETROMINOS.find(t => t.type === blockType);
                                cell.material = getMaterial(def?.color || 'empty', `board-${x}-${y}`);
                            }
                        }
                    }
                }

                // 2. 渲染當前方塊
                let blockIdx = 0;
                if (gameEngine.currentPiece) {
                    const { x: cx, y: cy, shape, color } = gameEngine.currentPiece;
                    shape.forEach((row, dy) => {
                        row.forEach((value, dx) => {
                            if (value !== 0) {
                                const block = currentPieceBlocks[blockIdx++];
                                if (block) {
                                    let finalX = cx + dx;
                                    let finalY = cy + dy;
                                    // Only vertical reverse affects visual display
                                    if (gameEngine.isVerticalReversed) finalY = (BOARD_HEIGHT - 1) - finalY;

                                    block.position.x = finalX * CELL_SIZE + CELL_SIZE / 2;
                                    block.position.y = (BOARD_HEIGHT - 1 - finalY) * CELL_SIZE + CELL_SIZE / 2;
                                    block.material = getMaterial(color, `curr-${blockIdx}`);
                                    block.isVisible = true;
                                }
                            }
                        });
                    });
                }
                for (let i = blockIdx; i < currentPieceBlocks.length; i++) currentPieceBlocks[i].isVisible = false;

                // 3. 渲染幽靈方塊 (Ghost Piece)
                let ghostIdx = 0;
                if (gameEngine.currentPiece && !gameEngine.isGameOver) {
                    let ghostY = gameEngine.currentPiece.y;
                    while (!gameEngine.checkCollision(gameEngine.currentPiece.x, ghostY + 1, gameEngine.currentPiece.shape)) {
                        ghostY++;
                    }
                    gameEngine.currentPiece.shape.forEach((row, dy) => {
                        row.forEach((value, dx) => {
                            if (value !== 0) {
                                const block = ghostPieceBlocks[ghostIdx++];
                                if (block) {
                                    let finalX = gameEngine.currentPiece.x + dx;
                                    let finalY = ghostY + dy;
                                    // Only vertical reverse affects visual display
                                    if (gameEngine.isVerticalReversed) finalY = (BOARD_HEIGHT - 1) - finalY;

                                    block.position.x = finalX * CELL_SIZE + CELL_SIZE / 2;
                                    block.position.y = (BOARD_HEIGHT - 1 - finalY) * CELL_SIZE + CELL_SIZE / 2;

                                    const ghostColorKey = `${gameEngine.currentPiece.color}Ghost`;
                                    block.material = materials[ghostColorKey] || materials['cyanGhost'];
                                    block.isVisible = true;
                                }
                            }
                        });
                    });
                }
                for (let i = ghostIdx; i < ghostPieceBlocks.length; i++) ghostPieceBlocks[i].isVisible = false;

                // 4. 渲染 Next Pieces
                gameEngine.nextPieces.forEach((piece, qIdx) => {
                    const pool = nextPieceBlocks[qIdx];
                    if (!pool || !piece) return;
                    let idx = 0;
                    piece.shape.forEach((row, dy) => {
                        row.forEach((value, dx) => {
                            if (value !== 0) {
                                const block = pool[idx++];
                                if (block) {
                                    block.position.x = (dx * CELL_SIZE) + NEXT_PIECE_PREVIEW_OFFSET_X;
                                    block.position.y = (BOARD_HEIGHT - 1 - (dy * CELL_SIZE)) - 2 - (qIdx * 4);
                                    block.material = materials[piece.color];
                                    block.isVisible = true;
                                }
                            }
                        });
                    });
                    for (let i = idx; i < pool.length; i++) pool[i].isVisible = false;
                });

                // 5. 渲染 Held Piece
                let holdIdx = 0;
                if (gameEngine.heldPiece) {
                    gameEngine.heldPiece.shape.forEach((row, dy) => {
                        row.forEach((value, dx) => {
                            if (value !== 0) {
                                const block = heldPieceBlocks[holdIdx++];
                                if (block) {
                                    block.position.x = (dx * CELL_SIZE) + HOLD_PIECE_PREVIEW_OFFSET_X;
                                    block.position.y = (BOARD_HEIGHT - 1 - (dy * CELL_SIZE)) - 2;
                                    block.material = materials[gameEngine.heldPiece!.color];
                                    block.isVisible = true;
                                }
                            }
                        });
                    });
                }
                for (let i = holdIdx; i < heldPieceBlocks.length; i++) heldPieceBlocks[i].isVisible = false;
            }

            scene.render();
        });

        // Resize handler
        const resizeHandler = () => {
            engine.resize();
            updateCameraOrtho();
        };
        window.addEventListener('resize', resizeHandler);
        resizeHandlerRef.current = resizeHandler;

    }, [skin, activeKeys]); // Re-run if skin changes

    // Cleanup effect
    useEffect(() => {
        const unsubscribe = gameEngine.subscribe(() => setUpdateCounter(c => c + 1));
        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('keyup', handleKeyUp);

        return () => {
            unsubscribe();
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('keyup', handleKeyUp);

            // Clean up engine if it exists
            if (engineRef.current) {
                // The canvasRef callback handles disposing the engine when canvas is null.
                // This is a fallback in case the component unmounts without the ref being set to null first,
                // or if the engine was created but the canvas ref was never called with null.
                // However, with a proper callback ref, the `if (!canvas)` branch should handle it.
                // Keeping this here for robustness, but it might be redundant if canvasRef works perfectly.
                engineRef.current.dispose();
                engineRef.current = null;
            }
        };
    }, [handleKeyDown, handleKeyUp]);

    // Determine CSS classes for board effects
    const getBoardEffects = () => {
        const classes = [];
        // REMOVED: Visual transforms for Reverse skills (User requested no panel animations)
        // if (gameEngine.isVerticalReversed) classes.push('rotate-180');
        // if (gameEngine.isHorizontalReversed) classes.push('scale-x-[-1]');

        if (gameEngine.isColorFlashActive) classes.push('animate-rainbow');
        if (gameEngine.isJumpBoardActive) classes.push('animate-bounce-board');

        return classes.join(' ');
    };

    return (
        <div className="relative">
            {/* Skill Effects Overlay - Outside the shaking container */}
            <SkillEffects gameEngine={gameEngine} playerId={gameEngine.myPlayerId} activeModifiers={gameEngine.activeModifiers} />

            {/* Main Game Canvas Container - This one shakes */}
            <div className={`relative transition-transform duration-500 ${getBoardEffects()}`}>
                <canvas
                    ref={canvasRef}
                    style={{ width: '320px', height: '600px', outline: 'none', background: '#1a1a1a' }}
                    className="game-canvas block"
                />
            </div>
        </div>
    );
};

export default GameCanvas;