import React from 'react';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ size = 'medium', showText = false }) => {
  const sizeMap = {
    small: 'w-8 h-8 text-lg',
    medium: 'w-12 h-12 text-2xl',
    large: 'w-20 h-20 text-5xl',
  };

  return (
    <div className={`flex items-center gap-2`}>
      <div className={`${sizeMap[size]} flex items-center justify-center bg-gradient-to-br from-purple-400 via-pink-300 to-blue-300 rounded-lg font-black text-white drop-shadow-lg`}>
        ☁️
      </div>
      {showText && <span className="font-black text-white drop-shadow-lg tracking-tight text-2xl">HeadM8</span>}
    </div>
  );
};

export default Logo;
