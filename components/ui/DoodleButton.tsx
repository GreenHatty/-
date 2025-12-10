import React from 'react';

interface DoodleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'danger' | 'success' | 'neutral';
}

export const DoodleButton: React.FC<DoodleButtonProps> = ({ 
  children, 
  variant = 'neutral', 
  className = '', 
  ...props 
}) => {
  const baseStyle = "doodle-btn doodle-border px-4 py-2 font-bold transition-all text-sm md:text-base";
  
  const variants = {
    neutral: "bg-white hover:bg-gray-50 text-black",
    primary: "bg-blue-300 hover:bg-blue-200 text-black",
    danger: "bg-red-300 hover:bg-red-200 text-black",
    success: "bg-green-300 hover:bg-green-200 text-black",
  };

  return (
    <button 
      className={`${baseStyle} ${variants[variant]} ${className}`} 
      {...props}
    >
      {children}
    </button>
  );
};

export const DoodleCard: React.FC<{ children: React.ReactNode; className?: string; title?: string }> = ({ children, className = '', title }) => {
  return (
    <div className={`doodle-border bg-white p-4 relative ${className}`}>
      {title && (
        <div className="absolute -top-4 left-4 bg-yellow-200 doodle-border px-2 py-1 text-sm font-bold rotate-[-2deg]">
          {title}
        </div>
      )}
      {children}
    </div>
  );
};