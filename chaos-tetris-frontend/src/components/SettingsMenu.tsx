import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Volume2, Gamepad2, Keyboard, HelpCircle, RefreshCw } from 'lucide-react';
import { GlassPanel } from './ui/GlassPanel';
import { settingsService, GameSettings, Keybinds } from '../services/SettingsService';

interface SettingsMenuProps {
    onClose: () => void;
}

const TABS = [
    { id: 'audio', label: 'Audio', icon: Volume2 },
    { id: 'controls', label: 'Controls', icon: Gamepad2 },
    { id: 'keybinds', label: 'Keybinds', icon: Keyboard },
];

const ControlTester = () => {
    const [position, setPosition] = useState(50); // 0-100%
    const requestRef = useRef<number | null>(null);
    const lastTimeRef = useRef<number>(0);

    // Movement state
    const moveState = useRef({
        left: false,
        right: false,
        dasTimer: 0,
        arrTimer: 0,
        isDasActive: false
    });

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const settings = settingsService.getSettings();
            if (e.key === settings.keybinds.moveLeft) moveState.current.left = true;
            if (e.key === settings.keybinds.moveRight) moveState.current.right = true;
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            const settings = settingsService.getSettings();
            if (e.key === settings.keybinds.moveLeft) {
                moveState.current.left = false;
                moveState.current.dasTimer = 0;
                moveState.current.isDasActive = false;
            }
            if (e.key === settings.keybinds.moveRight) {
                moveState.current.right = false;
                moveState.current.dasTimer = 0;
                moveState.current.isDasActive = false;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        const update = (time: number) => {
            const deltaTime = time - lastTimeRef.current;
            lastTimeRef.current = time;

            const settings = settingsService.getSettings();
            const { das, arr } = settings.controls;

            // Simple movement logic for testing feel
            if (moveState.current.left || moveState.current.right) {
                const direction = moveState.current.left ? -1 : 1;

                if (!moveState.current.isDasActive) {
                    // Initial move
                    if (moveState.current.dasTimer === 0) {
                        setPosition(p => Math.max(0, Math.min(100, p + direction * 5)));
                    }

                    moveState.current.dasTimer += deltaTime;
                    if (moveState.current.dasTimer >= das) {
                        moveState.current.isDasActive = true;
                        moveState.current.arrTimer = arr; // Trigger immediately
                    }
                } else {
                    // DAS Active
                    moveState.current.arrTimer += deltaTime;
                    if (moveState.current.arrTimer >= arr) {
                        const steps = Math.floor(moveState.current.arrTimer / (arr || 1)); // Avoid divide by zero
                        moveState.current.arrTimer %= (arr || 1);
                        // If arr is 0, instant movement (teleport to wall)
                        if (arr === 0) {
                            setPosition(direction === -1 ? 0 : 100);
                        } else {
                            setPosition(p => Math.max(0, Math.min(100, p + direction * 5 * steps)));
                        }
                    }
                }
            } else {
                moveState.current.dasTimer = 0;
                moveState.current.isDasActive = false;
            }

            requestRef.current = requestAnimationFrame(update);
        };

        requestRef.current = requestAnimationFrame(update);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, []);

    return (
        <div className="mt-8 p-4 bg-black/40 rounded-lg border border-white/10">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Control Test Area</div>
            <div className="relative h-8 bg-gray-800 rounded overflow-hidden">
                <div className="absolute top-0 bottom-0 w-[2px] bg-white/20 left-1/2 -translate-x-1/2"></div>
                <div
                    className="absolute top-1 bottom-1 w-6 bg-cyan-500 rounded shadow-[0_0_10px_rgba(6,182,212,0.6)] transition-transform duration-75"
                    style={{ left: `${position}%`, transform: 'translate(-50%, -50%)' }}
                />
            </div>
        </div>
    );
};

const SettingsMenu: React.FC<SettingsMenuProps> = ({ onClose }) => {
    const [activeTab, setActiveTab] = useState('audio');
    const [settings, setSettings] = useState<GameSettings>(settingsService.getSettings());
    const [bindingKey, setBindingKey] = useState<keyof Keybinds | null>(null);

    useEffect(() => {
        const unsubscribe = settingsService.subscribe(() => {
            // Use spread to force re-render on object update
            setSettings({ ...settingsService.getSettings() });
        });
        return () => { unsubscribe(); };
    }, []);

    // Key binding listener
    useEffect(() => {
        if (!bindingKey) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            e.preventDefault();
            e.stopPropagation();

            // Allow Escape to cancel binding
            if (e.key === 'Escape') {
                setBindingKey(null);
                return;
            }

            settingsService.updateSettings({
                keybinds: {
                    [bindingKey]: e.key
                }
            });
            setBindingKey(null);
        };

        window.addEventListener('keydown', handleKeyDown, { capture: true });
        return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
    }, [bindingKey]);

    const handleReset = () => {
        const sectionName = activeTab === 'audio' ? 'Audio' : activeTab === 'controls' ? 'Controls' : 'Keybinds';
        if (window.confirm(`Are you sure you want to reset ${sectionName} settings to default?`)) {
            settingsService.resetToDefaults(activeTab as any);
        }
    };

    const Tooltip = ({ text }: { text: string }) => {
        const [coords, setCoords] = useState({ x: 0, y: 0 });
        const [visible, setVisible] = useState(false);

        return (
            <div
                className="relative inline-block ml-2"
                onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setCoords({ x: rect.left + rect.width / 2, y: rect.top });
                    setVisible(true);
                }}
                onMouseLeave={() => setVisible(false)}
            >
                <HelpCircle size={14} className="text-gray-500 hover:text-white cursor-help transition-colors" />
                {visible && createPortal(
                    <div
                        className="fixed z-[9999] p-2 bg-black/90 border border-white/20 rounded text-[10px] text-gray-300 pointer-events-none shadow-xl w-48 text-center backdrop-blur-md"
                        style={{
                            left: coords.x,
                            top: coords.y - 10,
                            transform: 'translate(-50%, -100%)'
                        }}
                    >
                        {text}
                        {/* Arrow */}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-white/20"></div>
                    </div>,
                    document.body
                )}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <GlassPanel className="w-full max-w-3xl h-[80vh] flex flex-col p-0 overflow-hidden shadow-2xl border-purple-500/20">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10 bg-black/40">
                    <h2 className="text-2xl font-black italic tracking-tighter text-white flex items-center gap-3">
                        SETTINGS
                        <button
                            onClick={handleReset}
                            className="text-xs font-normal text-gray-500 hover:text-red-400 flex items-center gap-1 transition-colors ml-4"
                            title="Reset to Defaults"
                        >
                            <RefreshCw size={12} /> RESET
                        </button>
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar Tabs */}
                    <div className="w-48 bg-black/20 border-r border-white/5 flex flex-col p-4 gap-2">
                        {TABS.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-sm font-bold uppercase tracking-wider
                                    ${activeTab === tab.id
                                        ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.1)]'
                                        : 'text-gray-500 hover:text-white hover:bg-white/5'
                                    }
                                `}
                            >
                                <tab.icon size={18} />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-gradient-to-br from-transparent to-purple-900/5">

                        {/* AUDIO TAB */}
                        {activeTab === 'audio' && (
                            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm font-bold text-gray-300">
                                            <span>Master Volume</span>
                                            <span>{Math.round(settings.audio.master * 100)}%</span>
                                        </div>
                                        <input
                                            type="range" min="0" max="1" step="0.01"
                                            value={settings.audio.master}
                                            onChange={(e) => settingsService.updateSettings({ audio: { master: parseFloat(e.target.value) } })}
                                            className="w-full accent-purple-500 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm font-bold text-gray-300">
                                            <span>Music (BGM)</span>
                                            <span>{Math.round(settings.audio.bgm * 100)}%</span>
                                        </div>
                                        <input
                                            type="range" min="0" max="1" step="0.01"
                                            value={settings.audio.bgm}
                                            onChange={(e) => settingsService.updateSettings({ audio: { bgm: parseFloat(e.target.value) } })}
                                            className="w-full accent-pink-500 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm font-bold text-gray-300">
                                            <span>Sound Effects (SFX)</span>
                                            <span>{Math.round(settings.audio.sfx * 100)}%</span>
                                        </div>
                                        <input
                                            type="range" min="0" max="1" step="0.01"
                                            value={settings.audio.sfx}
                                            onChange={(e) => settingsService.updateSettings({ audio: { sfx: parseFloat(e.target.value) } })}
                                            className="w-full accent-cyan-500 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                                    <span className="font-bold text-white">Mute All Audio</span>
                                    <button
                                        onClick={() => settingsService.updateSettings({ audio: { muted: !settings.audio.muted } })}
                                        className={`w-12 h-6 rounded-full transition-colors relative ${settings.audio.muted ? 'bg-red-500' : 'bg-gray-600'}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.audio.muted ? 'left-7' : 'left-1'}`} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* CONTROLS TAB */}
                        {activeTab === 'controls' && (
                            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                                <div className="grid grid-cols-1 gap-6">
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm font-bold text-gray-300">
                                            <span className="flex items-center">DAS (Delayed Auto Shift) <Tooltip text="Time (ms) before auto-repeat starts when holding a key." /></span>
                                            <span className="text-cyan-400">{settings.controls.das} ms</span>
                                        </div>
                                        <input
                                            type="range" min="50" max="300" step="10"
                                            value={settings.controls.das}
                                            onChange={(e) => settingsService.updateSettings({ controls: { das: parseInt(e.target.value) } })}
                                            className="w-full accent-cyan-500 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm font-bold text-gray-300">
                                            <span className="flex items-center">ARR (Auto Repeat Rate) <Tooltip text="Interval (ms) between each repeat movement. 0 = Instant." /></span>
                                            <span className="text-cyan-400">{settings.controls.arr} ms</span>
                                        </div>
                                        <input
                                            type="range" min="0" max="100" step="2"
                                            value={settings.controls.arr}
                                            onChange={(e) => settingsService.updateSettings({ controls: { arr: parseInt(e.target.value) } })}
                                            className="w-full accent-cyan-500 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm font-bold text-gray-300">
                                            <span className="flex items-center">SDF (Soft Drop Factor) <Tooltip text="Multiplier for soft drop speed. Higher is faster." /></span>
                                            <span className="text-cyan-400">{settings.controls.sdf}x</span>
                                        </div>
                                        <input
                                            type="range" min="1" max="100" step="1"
                                            value={settings.controls.sdf}
                                            onChange={(e) => settingsService.updateSettings({ controls: { sdf: parseInt(e.target.value) } })}
                                            className="w-full accent-cyan-500 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                        />
                                    </div>
                                </div>

                                <ControlTester />
                            </div>
                        )}

                        {/* KEYBINDS TAB */}
                        {activeTab === 'keybinds' && (
                            <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                                <div className="text-xs text-gray-500 uppercase tracking-widest mb-4">Click a button to rebind</div>
                                <div className="grid grid-cols-2 gap-4">
                                    {Object.entries(settings.keybinds).map(([action, key]) => (
                                        <div key={action} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5 hover:border-white/20 transition-colors">
                                            <span className="text-sm font-bold text-gray-300 uppercase tracking-wider">
                                                {action.replace(/([A-Z])/g, ' $1').trim()}
                                            </span>
                                            <button
                                                onClick={() => setBindingKey(action as keyof Keybinds)}
                                                className={`min-w-[80px] px-3 py-1.5 rounded text-xs font-mono font-bold transition-all
                                                    ${bindingKey === action
                                                        ? 'bg-red-500 text-white animate-pulse'
                                                        : 'bg-black/50 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20'
                                                    }
                                                `}
                                            >
                                                {bindingKey === action ? 'PRESS KEY' : key}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </GlassPanel>
        </div>
    );
};

export default SettingsMenu;
