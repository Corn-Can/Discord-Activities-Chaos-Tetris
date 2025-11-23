import React, { useState, useEffect, useRef } from 'react';
import { Send, Smile, X } from 'lucide-react';
import { ChatMessage, Emote } from '../../types/shared';
import { socketService } from '../../services/SocketService';

// 預定義的 Emote 列表
const AVAILABLE_EMOTES: Emote[] = [
    { id: 'gg', symbol: '🤝', name: 'GG' },
    { id: 'fire', symbol: '🔥', name: 'Fire' },
    { id: 'cry', symbol: '😭', name: 'Cry' },
    { id: 'laugh', symbol: '😂', name: 'Laugh' },
    { id: 'angry', symbol: '😡', name: 'Angry' },
    { id: 'heart', symbol: '❤️', name: 'Heart' },
    { id: 'thumbsup', symbol: '👍', name: 'Nice' },
    { id: 'surprised', symbol: '😲', name: 'Wow' },
];

interface ChatSystemProps {
    messages: ChatMessage[];
    onSendMessage: (msg: string) => void;
    onSendEmote: (emoteId: string) => void;
    className?: string;
}

export const ChatSystemComponent: React.FC<ChatSystemProps> = ({ messages, onSendMessage, onSendEmote, className = "" }) => {
    const [inputValue, setInputValue] = useState("");
    const [showEmotePicker, setShowEmotePicker] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSend = () => {
        if (inputValue.trim()) {
            onSendMessage(inputValue);
            setInputValue("");
            setShowEmotePicker(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSend();
        }
    };

    return (
        <div className={`flex flex-col bg-black/80 backdrop-blur-md border border-white/10 rounded-lg overflow-hidden ${className}`}>
            {/* Chat History */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
                {messages.map((msg) => (
                    <div key={msg.id} className={`text-sm break-words ${msg.isSystem ? 'text-yellow-400 italic' : 'text-white'}`}>
                        <span className="font-bold text-cyan-400 opacity-80">{msg.senderName}: </span>
                        <span className="opacity-90">{msg.content}</span>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Emote Picker */}
            {showEmotePicker && (
                <div className="p-2 bg-gray-900/90 border-t border-white/10 grid grid-cols-4 gap-2 animate-in slide-in-from-bottom-2">
                    {AVAILABLE_EMOTES.map((emote) => (
                        <button
                            key={emote.id}
                            onClick={() => {
                                onSendEmote(emote.id);
                                setShowEmotePicker(false);
                            }}
                            className="p-2 hover:bg-white/10 rounded text-2xl transition-colors flex items-center justify-center"
                            title={emote.name}
                        >
                            {emote.symbol}
                        </button>
                    ))}
                </div>
            )}

            {/* Input Area */}
            <div className="p-2 bg-white/5 border-t border-white/10 flex items-center gap-2">
                <button
                    onClick={() => setShowEmotePicker(!showEmotePicker)}
                    className={`p-2 rounded-full transition-colors ${showEmotePicker ? 'bg-cyan-500/20 text-cyan-400' : 'hover:bg-white/10 text-gray-400'}`}
                >
                    <Smile size={20} />
                </button>
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    className="flex-1 bg-transparent border-none outline-none text-white placeholder-gray-500 text-sm"
                />
                <button
                    onClick={handleSend}
                    disabled={!inputValue.trim()}
                    className="p-2 text-cyan-400 hover:text-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <Send size={20} />
                </button>
            </div>
        </div>
    );
};

export const ChatSystem = React.memo(ChatSystemComponent);
