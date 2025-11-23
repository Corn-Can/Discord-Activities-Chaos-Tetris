import React from 'react';

interface LoadingScreenProps {
    progress: number;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ progress }) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-black">
            {/* Animated Background Pattern */}
            <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] animate-pulse"></div>
            </div>

            {/* Main Content */}
            <div className="relative z-10 flex flex-col items-center gap-8 px-8">
                {/* Logo / Title */}
                <div className="text-center animate-in fade-in zoom-in duration-700">
                    <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 mb-4 drop-shadow-[0_0_30px_rgba(168,85,247,0.5)] tracking-tight">
                        TETRIS TOGETHER
                    </h1>
                    <p className="text-gray-400 text-sm tracking-widest uppercase">Loading Assets...</p>
                </div>

                {/* Progress Bar Container */}
                <div className="w-96 max-w-full">
                    {/* Progress Bar Background */}
                    <div className="relative h-4 bg-black/50 rounded-full overflow-hidden border border-white/10 backdrop-blur-sm">
                        {/* Shimmer Effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer"></div>

                        {/* Progress Fill */}
                        <div
                            className="h-full bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 rounded-full transition-all duration-300 ease-out shadow-[0_0_20px_rgba(168,85,247,0.6)]"
                            style={{ width: `${progress}%` }}
                        >
                            {/* Inner Glow */}
                            <div className="h-full w-full bg-gradient-to-t from-white/20 to-transparent rounded-full"></div>
                        </div>
                    </div>

                    {/* Progress Percentage */}
                    <div className="mt-4 text-center">
                        <span className="text-3xl font-black text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
                            {progress}%
                        </span>
                    </div>
                </div>

                {/* Loading Tips */}
                <div className="mt-8 text-center animate-pulse">
                    <p className="text-gray-500 text-xs italic">
                        {progress < 30 && "Preparing game board..."}
                        {progress >= 30 && progress < 60 && "Loading skins and textures..."}
                        {progress >= 60 && progress < 90 && "Setting up audio..."}
                        {progress >= 90 && "Almost ready!"}
                    </p>
                </div>

                {/* Animated Tetris Blocks (Optional) */}
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-2 opacity-30">
                    <div className="w-8 h-8 bg-cyan-500 rounded animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-8 h-8 bg-yellow-500 rounded animate-bounce" style={{ animationDelay: '100ms' }}></div>
                    <div className="w-8 h-8 bg-purple-500 rounded animate-bounce" style={{ animationDelay: '200ms' }}></div>
                    <div className="w-8 h-8 bg-green-500 rounded animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
            </div>

            {/* Custom CSS for shimmer animation */}
            <style>{`
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                .animate-shimmer {
                    animation: shimmer 2s infinite;
                }
            `}</style>
        </div>
    );
};
