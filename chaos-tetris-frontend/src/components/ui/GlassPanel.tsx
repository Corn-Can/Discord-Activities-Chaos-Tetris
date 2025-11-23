import React from 'react';

interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
}

export const GlassPanel: React.FC<GlassPanelProps> = ({ children, className = "", title }) => {
  return (
    <div className={`relative bg-gray-900/60 backdrop-blur-xl border border-white/10 rounded-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] overflow-hidden ${className}`}>
      {/* 頂部光暈條 */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-50"></div>
      
      {title && (
        <div className="px-4 py-2 border-b border-white/5 bg-black/20">
          <h3 className="text-xs font-bold text-purple-300 uppercase tracking-widest">{title}</h3>
        </div>
      )}
      
      <div className="p-4">
        {children}
      </div>
    </div>
  );
};