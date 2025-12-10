
import React, { useEffect, useState } from 'react';
import { audioService } from '../../services/audioService';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'danger' | 'success' | 'neutral';
}

export const RetroButton: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'neutral', 
  className = '', 
  onClick,
  ...props 
}) => {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      audioService.playClick();
      if (onClick) onClick(e);
  };

  const baseStyle = "cozy-btn px-4 py-2 font-bold text-sm md:text-base relative overflow-hidden transition-all duration-200 active:scale-95";
  
  const variants = {
    neutral: "bg-white text-gray-700 hover:bg-gray-50 border-gray-300",
    primary: "bg-[#B5EAD7] text-[#4A3B4E] hover:bg-[#A3DCC9] border-[#4A3B4E]",
    danger: "bg-[#FFB7B2] text-[#4A3B4E] hover:bg-[#FF9E99] border-[#4A3B4E]",
    success: "bg-[#E2F0CB] text-[#4A3B4E] hover:bg-[#D4E2BD] border-[#4A3B4E]",
  };

  return (
    <button 
      className={`${baseStyle} ${variants[variant]} ${className}`} 
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  );
};

export const RetroCard: React.FC<{ children: React.ReactNode; className?: string; title?: string }> = ({ children, className = '', title }) => {
  return (
    <div className={`cozy-card p-4 relative ${className}`}>
      {title && (
        <div className="absolute -top-3 left-4 bg-[#FFDAC1] px-3 py-0.5 rounded-full text-sm font-bold border-2 border-[#4A3B4E] text-[#4A3B4E] z-10 transform -rotate-2">
          {title}
        </div>
      )}
      {children}
    </div>
  );
};

export const AchievementPopup: React.FC<{ title: string; icon: string }> = ({ title, icon }) => {
    return (
        <div className="fixed top-8 left-1/2 transform -translate-x-1/2 bg-white border-4 border-[#4A3B4E] rounded-full px-6 py-3 shadow-[0_8px_0_rgba(0,0,0,0.2)] z-50 animate-pop flex items-center gap-4">
            <div className="text-3xl animate-float">{icon}</div>
            <div>
                <div className="text-[10px] text-[#FFB7B2] font-black uppercase tracking-widest">ACHIEVEMENT UNLOCKED</div>
                <div className="text-lg font-black text-[#4A3B4E]">{title}</div>
            </div>
        </div>
    );
}

export const RetroProgressBar: React.FC<{ value: number; max: number; color?: string; label?: string; showText?: boolean }> = ({ value, max, color = 'bg-[#FFB7B2]', label, showText=true }) => {
    const percent = Math.min(100, Math.max(0, (value / max) * 100));
    return (
        <div className="w-full">
            {label && <div className="flex justify-between text-xs mb-1 font-bold text-gray-500"><span>{label}</span>{showText && <span>{Math.floor(value)}/{max}</span>}</div>}
            <div className="h-4 w-full border-2 border-[#4A3B4E] bg-white rounded-full overflow-hidden relative shadow-inner">
                <div className={`h-full ${color} transition-all duration-300 relative`} style={{ width: `${percent}%` }}>
                     <div className="absolute top-0 right-0 h-full w-full bg-gradient-to-b from-white/30 to-transparent"></div>
                </div>
            </div>
        </div>
    );
}
