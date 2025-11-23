import React from 'react';

interface NeonButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'danger' | 'warning' | 'secondary';
  fullWidth?: boolean;
  icon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  glowColor?: string;
}

export const NeonButton: React.FC<NeonButtonProps> = ({
  children,
  variant = 'primary',
  fullWidth = false,
  className = "",
  icon,
  size = 'md',
  glowColor,
  ...props
}) => {

  const sizeStyles = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg",
  };

  const baseStyles = `relative group ${sizeStyles[size]} font-bold text-white transition-all duration-200 ease-out rounded-lg overflow-hidden transform hover:-translate-y-1 active:translate-y-0 active:scale-95`;

  const variants = {
    primary: "bg-purple-600 hover:bg-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.5)] hover:shadow-[0_0_30px_rgba(168,85,247,0.8)]",
    danger: "bg-red-600 hover:bg-red-500 shadow-[0_0_20px_rgba(220,38,38,0.5)] hover:shadow-[0_0_30px_rgba(220,38,38,0.8)]",
    warning: "bg-yellow-500 hover:bg-yellow-400 text-black shadow-[0_0_20px_rgba(234,179,8,0.5)] hover:shadow-[0_0_30px_rgba(234,179,8,0.8)]",
    secondary: "bg-cyan-600 hover:bg-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.5)] hover:shadow-[0_0_30px_rgba(6,182,212,0.8)]",
  };

  const style = glowColor ? {
    boxShadow: `0 0 20px ${glowColor}80`,
  } : {};

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      style={style}
      {...props}
    >
      <span className="relative z-10 flex items-center justify-center gap-2">
        {icon && <span className="flex items-center">{icon}</span>}
        {children}
      </span>
      {/* 掃光特效 */}
      <div className="absolute inset-0 h-full w-full scale-0 rounded-lg transition-all duration-300 group-hover:scale-100 group-hover:bg-white/10"></div>
    </button>
  );
};