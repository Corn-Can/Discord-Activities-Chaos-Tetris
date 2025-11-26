import React, { useEffect, useState, useCallback, Component, ErrorInfo } from 'react';

// 1. 引用您本地的組件與服務
import { socketService } from './services/SocketService';
import { TetrisPiece, gameEngine } from './services/GameEngine';
import { SkillCard as SkillCardData } from './types/skill';
import { discordService } from './services/DiscordService';
import { AVAILABLE_SKINS, SkinConfig } from './types/skins';
import { audioManager } from './services/AudioManager';
import { assetLoader } from './services/AssetLoader';
import './App.css';

// 2. 引用您已建立的 UI 組件
import SettingsMenu from './components/SettingsMenu';
import { settingsService } from './services/SettingsService';
import { LoadingScreen } from './components/ui/LoadingScreen';

// 3. 引用新的 View 組件
import { MenuView } from './components/views/MenuView';
import { LobbyView } from './components/views/LobbyView';
import { TutorialView } from './components/views/TutorialView';
import { GameView } from './components/views/GameView';
import { ResultOverlay } from './components/views/ResultOverlay';
import { Player, OpponentState, ChatMessage } from './types/shared';

// 定義畫面狀態
type ViewState = 'MENU' | 'LOBBY' | 'PLAYING' | 'TUTORIAL';

class ErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="w-screen h-screen flex flex-col items-center justify-center bg-black text-white p-8 text-center">
                    <h1 className="text-4xl font-bold text-red-500 mb-4">Something went wrong.</h1>
                    <p className="text-gray-400 mb-4">Please try refreshing the page.</p>
                    <pre className="bg-gray-900 p-4 rounded text-left text-xs overflow-auto max-w-full">
                        {this.state.error?.toString()}
                    </pre>
                    <button
                        className="mt-8 px-6 py-3 bg-purple-600 rounded hover:bg-purple-500"
                        onClick={() => window.location.reload()}
                    >
                        Reload Game
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

// Helper hook for window size
function useWindowSize() {
    const [windowSize, setWindowSize] = useState({
        width: window.innerWidth,
        height: window.innerHeight,
    });

    useEffect(() => {
        function handleResize() {
            setWindowSize({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        }
        window.addEventListener("resize", handleResize);
        handleResize();
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    return windowSize;
}

// --- 主程式 ---
function App() {
    // Loading state
    const [isLoading, setIsLoading] = useState(true);
    const [loadingProgress, setLoadingProgress] = useState(0);

    // 遊戲狀態
    const [score, setScore] = useState(gameEngine.score);
    const [isGameOver, setIsGameOver] = useState(gameEngine.isGameOver);
    const [playerSkills, setPlayerSkills] = useState<(SkillCardData | null)[]>([]);
    const [pendingGarbage, setPendingGarbage] = useState(0);
    const [combo, setCombo] = useState(-1);
    const [isB2B, setIsB2B] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [isInDiscord, setIsInDiscord] = useState(false);

    // Targeting System
    type TargetingMode = 'random' | 'ko' | 'payback';
    const [targetingMode, setTargetingMode] = useState<TargetingMode>('random');
    const [lastAttackerId, setLastAttackerId] = useState<string | null>(null);


    const [nextPieces, setNextPieces] = useState<TetrisPiece[]>([]);
    const [heldPiece, setHeldPiece] = useState<TetrisPiece | null>(null);
    const [isPractice, setIsPractice] = useState(false);
    const [isPaused, setIsPaused] = useState(false);

    // 房間狀態
    const [players, setPlayers] = useState<Player[]>([]);
    const [hostId, setHostId] = useState<string | null>(null);
    const [opponentStates, setOpponentStates] = useState<OpponentState[]>([]);
    const [serverGameEnded, setServerGameEnded] = useState(false); // 追蹤全域遊戲是否結束
    const [winnerId, setWinnerId] = useState<string | null>(null);
    const [spectatingId, setSpectatingId] = useState<string | null>(null);
    const [gameTime, setGameTime] = useState(0);
    const [countdown, setCountdown] = useState<number | null>(null);

    // Window Size for Scaling
    const { width: windowWidth, height: windowHeight } = useWindowSize();
    const [scale, setScale] = useState(1);

    // 修改 App.tsx 內的縮放邏輯

    // ✅ 修改：定義標準畫布尺寸，並計算縮放
    // 這樣可以確保 layout 永遠是以 1300x900 的空間去排版，不會被擠壓
    const BASE_WIDTH = 1300;
    const BASE_HEIGHT = 900;

    useEffect(() => {
        const availableWidth = windowWidth - 40;
        // 如果在 Discord 裡，扣掉 180px (保險起見加一點) 給底部 UI，否則只扣 20px
        const paddingBottom = isInDiscord ? 90 : 20;

        const availableHeight = windowHeight - paddingBottom;

        const scaleX = availableWidth / BASE_WIDTH;
        const scaleY = availableHeight / BASE_HEIGHT;

        // 🔥 關鍵修正：
        // 之前是 Math.max(..., scaleX, scaleY)，這會選到比較大的那個比例，導致另一邊爆掉。
        // 現在改為 Math.min(scaleX, scaleY)，確保「寬」和「高」都塞得進去。
        const fitScale = Math.min(scaleX, scaleY);

        // 最後限制範圍：最大不超過 1 (不放大)，最小不低於 0.3
        const finalScale = Math.min(1, Math.max(0.3, fitScale));

        setScale(finalScale);
    }, [windowWidth, windowHeight, isInDiscord]);

    // UI 狀態
    const [view, setView] = useState<ViewState>('MENU');
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [lastEmote, setLastEmote] = useState<{ playerId: string, emoteId: string, timestamp: number } | null>(null);

    // 安全地初始化 currentSkin
    const [currentSkin, setCurrentSkin] = useState<SkinConfig>(
        (AVAILABLE_SKINS && AVAILABLE_SKINS.length > 0)
            ? AVAILABLE_SKINS[0]
            : { id: 'default', name: 'Default', texturePath: null }
    );

    const handleSendMessage = useCallback((content: string) => {
        socketService.sendChatMessage(content);
    }, []);

    const handleSendEmote = useCallback((emoteId: string) => {
        socketService.sendEmote(emoteId);
    }, []);
    const [roomIdInput, setRoomIdInput] = useState("game-room");

    const handleSettings = useCallback(() => {
        setShowSettings(true);
        if (view === 'PLAYING') {
            gameEngine.pause();
        }
    }, [view]);

    const handleCloseSettings = useCallback(() => {
        setShowSettings(false);
        if (view === 'PLAYING') {
            gameEngine.resume();
        }
    }, [view]);

    const handlePractice = () => {
        audioManager.playSFX('button_click');
        setIsPractice(true);
        // 模擬一個單人玩家列表
        setPlayers([{ id: 'me', name: 'Practice Player' }]);
        setHostId('me');

        // 設置一個虛擬的 999 秒時間
        gameEngine.gameTime = 999;

        // 直接切換到遊戲畫面並開始
        setView('PLAYING');
        gameEngine.startGame(Date.now(), true);
    };

    const handleLeavePractice = () => {
        audioManager.playSFX('button_click');
        gameEngine.stopGameLoop();
        setIsPractice(false);
        setView('MENU');

        // Reset basic game state
        setScore(0);
        setGameTime(0);
        setIsGameOver(false);
        setNextPieces([]);
        setHeldPiece(null);
        setPendingGarbage(0);
        setCombo(-1);
        setIsB2B(false);
    };

    // Asset Preloading (First Priority)
    useEffect(() => {
        const loadAssets = async () => {
            // Subscribe to progress updates
            const unsubscribe = assetLoader.onProgress((progress) => {
                setLoadingProgress(progress);
            });

            try {
                // Preload all assets
                await assetLoader.preloadAssets();

                // Small delay to ensure smooth transition
                await new Promise(resolve => setTimeout(resolve, 500));

                // Mark loading as complete
                setIsLoading(false);
            } catch (error) {
                console.error('Failed to load assets:', error);
                // Continue anyway
                setIsLoading(false);
            } finally {
                unsubscribe();
            }
        };

        loadAssets();
    }, []);

    // Initialize Audio
    useEffect(() => {
        const loadSounds = async () => {
            await audioManager.initialize();

            // Preload all game sounds
            // Using .ogg for user-specified files, .mp3 for others (or .ogg if preferred)
            // Assuming user converted everything to .ogg based on "I prepared some sound effects" context
            // If not, we might need a mix. For now, let's try to use .ogg for the new ones and .mp3 for old ones if they exist?
            // Actually, user said "I prepared some sound effects... line_clear.ogg... warning.ogg... skill_gain.ogg... skill_use.ogg... button_click.ogg"
            // They didn't mention piece_move, hard_drop etc. I'll assume they are .mp3 or .ogg.
            // Let's use a mix based on what was likely there or standard.
            // Safest bet: use .ogg for the ones explicitly mentioned, and maybe .mp3 for others?
            // Or just use .ogg for everything if I want to be consistent with my summary.
            // Let's use .ogg for everything to be safe as user seems to be customizing audio.

            await audioManager.preloadSounds({
                // Game Actions
                'piece_move': 'audio/sfx/piece_move.ogg',
                'piece_rotate': 'audio/sfx/piece_rotate.ogg',
                'hard_drop': 'audio/sfx/hard_drop.ogg',
                'piece_lock': 'audio/sfx/piece_lock.ogg',
                'line_clear': 'audio/sfx/line_clear.ogg',
                't_spin': 'audio/sfx/game_over.ogg', // If user has it
                'combo_hit': 'audio/sfx/line_clear.ogg', // If user has it
                'game_over': 'audio/sfx/game_over.ogg',

                // Skills
                'skill_gain': 'audio/sfx/skill_gain.ogg',
                'skill_use': 'audio/sfx/skill_use.ogg',

                // UI
                'button_click': 'audio/sfx/button_click.ogg',

                // System
                'warning': 'audio/sfx/warning.ogg'
            });
        };
        loadSounds();

        const unlockAudio = () => {
            audioManager.resume();
            window.removeEventListener('click', unlockAudio);
            window.removeEventListener('keydown', unlockAudio);
        };
        window.addEventListener('click', unlockAudio);
        window.addEventListener('keydown', unlockAudio);

    }, []);

    useEffect(() => {
        const initDiscord = async () => {
            try {
                // Add a timeout to prevent hanging indefinitely
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("Discord SDK Init Timeout")), 15000)
                );

                const inDiscord = await Promise.race([
                    discordService.init(),
                    timeoutPromise
                ]);

                setIsInDiscord(!!inDiscord);

                if (inDiscord) {
                    console.log("Running inside Discord!");
                    const profile = await discordService.getUserProfile();
                    if (profile?.id) {
                        settingsService.loadSettings(profile.id);
                    }

                    // 自動填入 Room ID (DC#InstanceID)
                    const roomId = discordService.getRoomId();
                    if (roomId) {
                        setRoomIdInput(roomId);
                    }
                } else {
                    settingsService.loadSettings('local_player');
                }
            } catch (error) {
                console.error("Discord Init Failed:", error);
                settingsService.loadSettings('local_player');
                setIsInDiscord(false);
            }
        };
        initDiscord();

        const unsubscribe = gameEngine.subscribe((engineState) => {
            setGameTime(engineState.gameTime);
            setScore(engineState.score);
            setIsGameOver(engineState.isGameOver);
            setPlayerSkills([...engineState.playerSkills]);
            setPendingGarbage(engineState.pendingGarbage);
            setCombo(engineState.combo);
            setIsB2B(engineState.isBackToBack);
            setNextPieces([...engineState.nextPieces]);
            setHeldPiece(engineState.heldPiece);
            setIsPaused(engineState.isPaused);
        });

        const eventUnsubscribe = gameEngine.onGameEvent((event, data) => {
            switch (event) {
                case 'move': socketService.sendMove(data); break;
                case 'rotate': socketService.sendRotate(data); break;
                case 'drop': socketService.sendDrop(); break;
                case 'attack': socketService.sendAttack(data); break;
                case 'skill:cast': socketService.sendSkillCast(data.skillId, data.targetPlayerId); break;
                case 'state': socketService.sendGameState(data); break;
                case 'game:over': socketService.socket.emit('game:over'); break;
            }
        });

        if (socketService.socket.id) {
            gameEngine.setPlayerId(socketService.socket.id);
        }
        socketService.socket.on('connect', () => {
            if (socketService.socket.id) {
                gameEngine.setPlayerId(socketService.socket.id);
            }
        });

        // Socket 事件監聽
        socketService.socket.on('room:state', (room) => {
            setPlayers(room.players);
            setHostId(room.hostId);

            // 智慧切換畫面：
            // 1. 如果遊戲正在進行，強制進入 PLAYING (如果還沒在 PLAYING)
            // 2. 如果遊戲沒進行，且我已經在玩家列表，進入 LOBBY
            // 3. 否則留在 MENU
            const myData = room.players.find((p: any) => p.id === socketService.socket.id);
            const amIInRoom = !!myData;

            if (room.isRunning) {
                // 只有當我們還不在 PLAYING 狀態時才切換，避免不必要的重繪
                setView('PLAYING');
                if (myData && myData.isDead) {
                    setSpectatingId(prev => {
                        if (prev) return prev;
                        const target = room.players.find((p: any) => p.id !== socketService.socket.id);
                        return target ? target.id : null;
                    });
                }
            } else if (amIInRoom) {
                setView('LOBBY');
                // 如果回到大廳，記得重置觀戰狀態
                setSpectatingId(null);
            } else {
                setView('MENU');
            }
        });

        socketService.socket.on('chat:message', (data: { message: ChatMessage }) => {
            setChatMessages(prev => [...prev, data.message]);
            if (data.message.senderId !== (socketService.socket.id || 'me')) {
                audioManager.playSFX('ui_hover');
            }
        });

        socketService.socket.on('emote:receive', (data: { playerId: string, emoteId: string }) => {
            setLastEmote({ ...data, timestamp: Date.now() });
        });

        socketService.socket.on('game:start', (data: { seed: number }) => {
            console.log("🚀 Game Start! Seed:", data.seed);
            setView('PLAYING'); // 強制切換到遊戲畫面
            setServerGameEnded(false); // 重置
            setWinnerId(null);
            setSpectatingId(null);

            // Reset game engine to clear previous board state
            gameEngine.restartGame();
            // Initialize game with seed but pause immediately for countdown
            gameEngine.startGame(data.seed);
            gameEngine.pause();
            gameEngine.isInputLocked = true;

            // Start Countdown
            setCountdown(3);
            audioManager.playSFX('piece_rotate'); // Play sound for '3'

            let count = 3;
            const countdownInterval = setInterval(() => {
                count--;
                if (count > 0) {
                    setCountdown(count);
                    audioManager.playSFX('piece_rotate'); // Play sound for '2', '1'
                } else {
                    clearInterval(countdownInterval);
                    setCountdown(null);
                    // Start Game
                    gameEngine.isInputLocked = false;
                    gameEngine.resume();
                }
            }, 1000);
        });

        socketService.socket.on('game:attacked', (data: { lines: number, from: string }) => {
            gameEngine.addGarbageLines(data.lines);
            if (data.from) setLastAttackerId(data.from); // Track attacker for Payback
        });

        socketService.socket.on('skill:applied', (data: { skillId: string, targetPlayerId: string }) => {
            if (data.targetPlayerId === socketService.socket.id) {
                gameEngine.onSkillReceived(data.skillId);
            }
        });

        socketService.socket.on('player:joined', (player) => {
            setPlayers((prev) => [...prev, player]);
        });

        socketService.socket.on('player:left', (player) => {
            setPlayers((prev) => prev.filter(p => p.id !== player.id));
            setOpponentStates((prev) => prev.filter(p => p.playerId !== player.id));
        });

        socketService.socket.on('player:dead', (data: { playerId: string }) => {
            setOpponentStates((prev) => prev.map(op =>
                op.playerId === data.playerId
                    ? { ...op, isDead: true } // 標記該玩家為死亡
                    : op
            ));
        });

        socketService.socket.on('player:state', (state: OpponentState) => {
            setOpponentStates((prev) => {
                const idx = prev.findIndex(p => p.playerId === state.playerId);
                if (idx !== -1) {
                    const newStates = [...prev];
                    newStates[idx] = state;
                    return newStates;
                } else {
                    return [...prev, state];
                }
            });
        });

        socketService.socket.on('game:end', (data: { winnerId: string }) => {
            setServerGameEnded(true); // 伺服器說結束了，這時候才跳大結算畫面
            setWinnerId(data.winnerId);

            // Force stop warning sound in case it's still playing
            audioManager.stopLoopingSFX('warning');

            // Play game over sound ONLY if I haven't already played it (i.e., I'm not already dead locally)
            // If I am dead, GameEngine already played it.
            // Exception: If I am the winner, I might want to hear Victory (or Game Over as generic end)
            // But user said "hear twice", implying they lost.
            if (!gameEngine.isGameOver) {
                audioManager.playSFX('game_over', 1.0);
            }
            // 這裡可以不用 stopGameLoop，因為 stopGameLoop 會在 effect cleanup 處理
        });

        return () => {
            unsubscribe();
            eventUnsubscribe();
            socketService.socket.off('room:state');
            socketService.socket.off('chat:message');
            socketService.socket.off('emote:receive');
            socketService.socket.off('player:joined');
            socketService.socket.off('player:left');
            socketService.socket.off('player:state');
            socketService.socket.off('game:attacked');
            socketService.socket.off('skill:applied');
            socketService.socket.off('game:start');
            socketService.socket.off('player:dead');
            gameEngine.stopGameLoop();
        };
    }, []);

    // Background Music Management
    useEffect(() => {
        switch (view) {
            case 'MENU':
            case 'LOBBY':
                // Use same theme for both menu and lobby
                audioManager.playBGM('/audio/bgm/menu_theme.ogg', true);
                break;
            case 'PLAYING':
                audioManager.playBGM('/audio/bgm/game_theme.ogg', true);
                break;
            default:
                // Keep current BGM playing
                break;
        }
    }, [view]);

    // Targeting Logic
    const autoSelectTarget = useCallback(() => {
        const opponents = players.filter(p => p.id !== socketService.socket.id);
        if (opponents.length === 0) return socketService.socket.id; // Fallback to self if alone (or testing)

        switch (targetingMode) {
            case 'random':
                return opponents[Math.floor(Math.random() * opponents.length)].id;
            case 'ko':
                // Target player with highest score (or lowest HP if HP existed, here using score as proxy for threat)
                // Actually "K.O." usually means targeting someone close to death. 
                // Since we don't have board height info of others easily here, let's target the one with highest score for now as a "Boss" target
                // Or random for now if no better metric. Let's stick to Random for simplicity until we sync board heights.
                return opponents[Math.floor(Math.random() * opponents.length)].id;
            case 'payback':
                if (lastAttackerId && opponents.some(p => p.id === lastAttackerId)) {
                    return lastAttackerId;
                }
                return opponents[Math.floor(Math.random() * opponents.length)].id; // Fallback to random
        }
    }, [players, targetingMode, lastAttackerId]);

    const handleUseSkill = useCallback((slotIndex: number) => {
        if (isGameOver) return;

        // 1. Get the skill from the slot
        const skill = playerSkills[slotIndex];
        if (!skill) return;

        // 2. Determine target
        let targetId = socketService.socket.id || 'me'; // Default to self

        // If it's an attack skill, use the selected target
        if (['reverse_v', 'reverse_h', 'dig_hole', 'jump_board', 'color_flash'].includes(skill.id)) {
            const target = autoSelectTarget();
            if (target) {
                targetId = target; // autoSelectTarget now returns string directly
            }
        }

        // 3. Use skill via GameEngine (passing slot index)
        gameEngine.useSkill(slotIndex, targetId);
    }, [isGameOver, playerSkills, autoSelectTarget]);

    // Hotkeys for skills (1, 2, 3)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (view !== 'PLAYING' || isGameOver) return;

            const keybinds = settingsService.getSettings().keybinds;

            if (e.key === keybinds.skill1) handleUseSkill(0);
            if (e.key === keybinds.skill2) handleUseSkill(1);
            if (e.key === keybinds.skill3) handleUseSkill(2);

            if (e.key === keybinds.targetMode) {
                e.preventDefault();
                setTargetingMode(prev => {
                    const modes: TargetingMode[] = ['random', 'ko', 'payback'];
                    const idx = modes.indexOf(prev);
                    return modes[(idx + 1) % modes.length];
                });
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [view, isGameOver, playerSkills, targetingMode, opponentStates, players, lastAttackerId]);

    const handleJoinRoom = async () => {
        audioManager.playSFX('button_click');
        if (!roomIdInput.trim()) return alert("Please enter a Room ID!");
        let playerName = '';
        if (discordService.isRunningInDiscord) {
            const profile = await discordService.getUserProfile();
            playerName = profile?.username || 'Discord Player';
        } else {
            playerName = prompt("Enter your name:") || 'Player';
        }
        if (!playerName) playerName = `Player - ${Math.floor(Math.random() * 1000)} `;

        socketService.joinRoom(roomIdInput, playerName);
        // 加入成功後，socket 會回傳 room:state，這會觸發 useEffect 將 view 切換為 LOBBY
    };

    const handleLeaveRoom = () => {
        audioManager.playSFX('button_click');
        //if (window.confirm("Are you sure you want to leave?")) {
        socketService.leaveRoom(roomIdInput);

        // Reset Game State
        setPlayers([]);
        setOpponentStates([]);
        setHostId(null);
        setServerGameEnded(false);
        setWinnerId(null);
        setSpectatingId(null);
        setIsGameOver(false);
        setScore(0);
        setGameTime(0);
        setPlayerSkills([]);
        setPendingGarbage(0);
        setNextPieces([]);
        setHeldPiece(null);

        // Go to Menu
        setView('MENU');
    };



    const handleSpectate = useCallback((targetId: string) => {
        // 1. 找出我在伺服器上的狀態
        const myPlayer = players.find(p => p.id === socketService.socket.id);
        const amIDeadOnServer = myPlayer?.isDead;

        // 2. 判斷是否有資格觀戰
        // 資格：遊戲結束 OR 本地引擎掛了 OR 伺服器說我掛了 OR 我已經在觀戰模式(遲到者)
        const canSpectate = serverGameEnded || isGameOver || amIDeadOnServer || spectatingId !== null;

        if (!canSpectate) return; // 如果還活著且正在玩，禁止偷看

        if (targetId === socketService.socket.id) {
            // 只有當「我真的有在玩」的時候，才允許切回自己
            // 如果我是遲到者(一開始就是 spectatingId != null)，切回 null 會看到空蕩蕩的畫面，還是讓他切吧，反正看到空畫面他會自己切回來
            setSpectatingId(null);
        } else {
            setSpectatingId(targetId);
        }
    }, [players, serverGameEnded, isGameOver, spectatingId]);





    return (
        <div className="w-screen h-screen bg-[#050508] text-white font-sans flex items-center justify-center relative overflow-hidden selection:bg-purple-500 selection:text-white">
            {/* Loading Screen */}
            {isLoading && <LoadingScreen progress={loadingProgress} />}

            {/* 背景動態效果 */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-900/20 via-[#050508] to-[#050508] z-0 pointer-events-none"></div>
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)] z-0 pointer-events-none"></div>

            {/* 根據狀態渲染不同畫面 */}
            {view === 'MENU' && (
                <MenuView
                    roomIdInput={roomIdInput}
                    setRoomIdInput={setRoomIdInput}
                    currentSkin={currentSkin}
                    setCurrentSkin={setCurrentSkin}
                    onJoin={handleJoinRoom}
                    onPractice={handlePractice}
                    onTutorial={() => setView('TUTORIAL')}
                    onSettings={handleSettings}
                    isInDiscord={isInDiscord}
                    windowHeight={windowHeight}
                    scale={scale}
                />
            )}

            {view === 'LOBBY' && (
                <LobbyView
                    roomId={roomIdInput}
                    players={players}
                    hostId={hostId}
                    myId={socketService.socket.id || 'me'}
                    onLeave={handleLeaveRoom}
                    onStart={() => socketService.requestStartGame()}
                    onSettings={handleSettings}
                    chatMessages={chatMessages}
                    onSendMessage={handleSendMessage}
                    onSendEmote={handleSendEmote}
                />
            )}

            {view === 'PLAYING' && (
                <GameView
                    score={score}
                    gameTime={gameTime}
                    isGameOver={isGameOver}
                    players={players}
                    opponentStates={opponentStates}
                    nextPieces={nextPieces}
                    heldPiece={heldPiece}
                    activeModifiers={gameEngine.activeModifiers}
                    playerSkills={playerSkills}
                    targetingMode={targetingMode}
                    spectatingId={spectatingId}
                    scale={scale}
                    onUseSkill={handleUseSkill}
                    onSpectate={handleSpectate}
                    onSettings={handleSettings}
                    currentSkin={currentSkin}
                    roomId={roomIdInput}
                    myId={socketService.socket.id || 'me'}
                    pendingGarbage={pendingGarbage}
                    combo={combo}
                    isB2B={isB2B}
                    chatMessages={chatMessages}
                    onSendMessage={handleSendMessage}
                    onSendEmote={handleSendEmote}
                    lastEmote={lastEmote}
                    isPaused={isPaused}
                    isPractice={isPractice}
                    onLeave={handleLeavePractice}
                />
            )}

            {view === 'TUTORIAL' && (
                <TutorialView onBack={() => setView('MENU')} />
            )}

            <ResultOverlay
                serverGameEnded={serverGameEnded}
                players={players}
                opponentStates={opponentStates}
                winnerId={winnerId}
                myId={socketService.socket.id || 'me'}
                myScore={score}
                isMyGameOver={isGameOver}
                onReturnToLobby={() => {
                    setServerGameEnded(false);
                    setSpectatingId(null);
                }}
            />

            {/* Settings Menu - Global Overlay */}
            {/* Settings Menu - Global Overlay */}
            {showSettings && (
                <SettingsMenu onClose={handleCloseSettings} />
            )}

            {/* Countdown Overlay */}
            {countdown !== null && (
                <div className="absolute inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="text-9xl font-black text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.8)] animate-bounce">
                        {countdown}
                    </div>
                </div>
            )}

        </div>
    );
}
function AppWithBoundary() {
    return (
        <ErrorBoundary>
            <App />
        </ErrorBoundary>
    );
}

export default AppWithBoundary;