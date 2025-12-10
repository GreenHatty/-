
import React, { useState, useEffect } from 'react';
import { RetroButton } from '../ui/RetroUI';
import { audioService } from '../../services/audioService';
import { AssetUtils, EmojiImg } from '../ui/GameAssets';

interface GameItem {
  id: string;
  url: string;
  typeKey: string; // Used for grouping
  x: number;
  y: number;
  rot: number;
  scale: number;
  zIndex: number;
}

interface Target {
    typeKey: string;
    count: number;
    sampleUrl: string;
}

interface FindItGameProps {
  onComplete: (score: number) => void;
  onUnlockAchievement: (id: string, title: string, icon: string) => void;
  onExit: () => void;
}

interface ThemeConfig {
    bg: string;
    items?: string[];
    isBot?: boolean;
    count?: number;
}

// THEMES mapping to Asset URLs
const THEMES: Record<string, ThemeConfig> = {
    FOOD: {
        bg: '#FFF8E1',
        items: ['1f354', '1f355', '1f369', '1f366', '1f35f', '1f379', '1f349', '1f347', '1f36d', '1f36c'] // Burger, Pizza, Donut, IceCream...
    },
    ANIMALS: {
        bg: '#E8F5E9',
        items: ['1f431', '1f436', '1f430', '1f43b', '1f42d', '1f439', '1f437', '1f424', '1f419', '1f984'] // Cat, Dog, Rabbit, Bear...
    },
    ROBOTS: {
        bg: '#E3F2FD',
        isBot: true, // Special flag to use DiceBear
        count: 10
    }
};

export const FindItGame: React.FC<FindItGameProps> = ({ onComplete, onUnlockAchievement, onExit }) => {
  const [level, setLevel] = useState(1);
  const [items, setItems] = useState<GameItem[]>([]);
  const [targets, setTargets] = useState<Target[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [maxTime, setMaxTime] = useState(0);
  const [gameState, setGameState] = useState<'INIT' | 'PLAYING' | 'WIN' | 'GAMEOVER'>('INIT');
  const [score, setScore] = useState(0);
  const [currentTheme, setCurrentTheme] = useState<keyof typeof THEMES>('FOOD');

  // INIT LEVEL
  useEffect(() => {
    if (gameState === 'INIT') {
        startLevel(1);
    }
  }, [gameState]);

  const startLevel = (lvl: number, existingItems?: GameItem[]) => {
      setLevel(lvl);
      setGameState('PLAYING');
      
      let pool: GameItem[] = existingItems || [];

      // If new game or items cleared, generate new pool
      if (pool.length === 0) {
        const themeKeys = Object.keys(THEMES) as Array<keyof typeof THEMES>;
        const themeKey = themeKeys[Math.floor(Math.random() * themeKeys.length)];
        setCurrentTheme(themeKey);
        const themeData = THEMES[themeKey];

        const itemCount = 50 + lvl * 5; // Increase density

        for (let i = 0; i < itemCount; i++) {
            let url = '';
            let typeKey = '';

            if (themeData.isBot) {
                // Robots: Use seed as type
                const seed = `bot-${Math.floor(Math.random() * 10)}`; // 10 types of bots
                url = AssetUtils.getRobot(seed);
                typeKey = seed;
            } else {
                // Emojis
                const codes = (themeData as any).items as string[];
                const code = codes[Math.floor(Math.random() * codes.length)];
                url = AssetUtils.getEmoji(code);
                typeKey = code;
            }

            pool.push({
                id: `item-${Date.now()}-${i}`,
                url,
                typeKey,
                x: Math.random() * 85 + 5, // 5% to 90%
                y: Math.random() * 80 + 10, // 10% to 90%
                rot: Math.random() * 60 - 30, // -30 to 30 deg
                scale: 0.8 + Math.random() * 0.4,
                zIndex: Math.floor(Math.random() * 100)
            });
        }
      }

      setItems(pool);

      // Select Target
      // Group items by type
      const counts: Record<string, number> = {};
      pool.forEach(i => counts[i.typeKey] = (counts[i.typeKey] || 0) + 1);

      // Find types with at least 3 items (or less if pool small)
      const validTypes = Object.keys(counts).filter(k => counts[k] >= 1);
      
      if (validTypes.length === 0) {
          handleWin();
          return;
      }

      // Pick random target
      const targetType = validTypes[Math.floor(Math.random() * validTypes.length)];
      const targetCount = Math.min(counts[targetType], 3 + Math.floor(lvl / 3)); // Find up to 3-5

      setTargets([{
          typeKey: targetType,
          count: targetCount,
          sampleUrl: pool.find(i => i.typeKey === targetType)!.url
      }]);

      // Timer
      const time = 30 - lvl;
      setMaxTime(Math.max(10, time));
      setTimeLeft(Math.max(10, time));
      
      audioService.startBGM('UPBEAT');
  };

  // Timer Tick
  useEffect(() => {
    if (gameState !== 'PLAYING') return;
    const timer = setInterval(() => {
        setTimeLeft(prev => {
            if (prev <= 0) {
                setGameState('GAMEOVER');
                audioService.stopBGM();
                audioService.playError();
                return 0;
            }
            return prev - 0.1;
        });
    }, 100);
    return () => clearInterval(timer);
  }, [gameState]);

  const handleWin = () => {
      setGameState('WIN');
      audioService.playSuccess();
      onUnlockAchievement('find_master', '火眼金睛', '👁️');
  };

  const handleItemClick = (item: GameItem) => {
      if (gameState !== 'PLAYING') return;

      const targetIdx = targets.findIndex(t => t.typeKey === item.typeKey);

      if (targetIdx !== -1) {
          // Correct
          audioService.playClick();
          setScore(s => s + 10);
          
          // Remove item from pool
          const newItems = items.filter(i => i.id !== item.id);
          setItems(newItems);

          // Update Target
          const newTargets = [...targets];
          newTargets[targetIdx].count--;
          
          if (newTargets[targetIdx].count <= 0) {
              // Level Completed (Round completed)
              newTargets.splice(targetIdx, 1);
              setTargets(newTargets); // Empty targets

              audioService.playSuccess();
              setScore(s => s + Math.floor(timeLeft * 2));
              
              // Next Round
              setTimeout(() => {
                  startLevel(level + 1, newItems);
              }, 500);
          } else {
              setTargets(newTargets);
          }
      } else {
          // Wrong
          audioService.playError();
          setTimeLeft(t => Math.max(0, t - 3)); // Penalty
          // Shake effect could go here
      }
  };

  return (
    <div className="h-full flex flex-col relative overflow-hidden font-sans select-none" style={{ backgroundColor: THEMES[currentTheme].bg }}>
        
        {/* HUD */}
        <div className="p-4 bg-white/90 backdrop-blur shadow-sm z-50 flex justify-between items-center border-b-4 border-[#FFB7B2]">
             <div className="flex gap-4 items-center">
                 <span className="font-bold text-[#4A3B4E] whitespace-nowrap">关卡 {level}</span>
                 <div className="flex gap-4">
                     {targets.map((t, i) => (
                         <div key={i} className="flex items-center gap-2 bg-yellow-100 px-4 py-2 rounded-full border-2 border-yellow-400 animate-pop">
                             <span className="text-xs font-bold text-gray-500">寻找:</span>
                             <img src={t.sampleUrl} className="w-8 h-8 object-contain" />
                             <span className="font-black text-2xl text-[#4A3B4E]">x{t.count}</span>
                         </div>
                     ))}
                 </div>
             </div>
             <div className="flex flex-col items-end w-32">
                 <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden border border-gray-300 relative">
                     <div 
                        className={`h-full transition-all duration-200 ${timeLeft < 5 ? 'bg-red-500' : 'bg-[#FFB7B2]'}`} 
                        style={{width: `${(timeLeft/maxTime)*100}%`}}
                     />
                 </div>
                 <span className="text-xs font-bold text-gray-500 mt-1">{Math.ceil(timeLeft)}s</span>
             </div>
        </div>

        {/* Game Area */}
        <div className="flex-1 relative overflow-hidden">
            {items.map(item => (
                <div 
                    key={item.id}
                    className="absolute cursor-pointer hover:scale-110 active:scale-90 transition-transform hover:z-50"
                    style={{
                        left: `${item.x}%`,
                        top: `${item.y}%`,
                        width: `${item.scale * 4}rem`,
                        height: `${item.scale * 4}rem`,
                        transform: `rotate(${item.rot}deg)`,
                        zIndex: item.zIndex
                    }}
                    onClick={(e) => {
                        e.stopPropagation();
                        handleItemClick(item);
                    }}
                >
                    <img src={item.url} className="w-full h-full object-contain drop-shadow-md pointer-events-none" />
                </div>
            ))}
        </div>

        {/* Win/Lose Modal */}
        {(gameState === 'GAMEOVER' || gameState === 'WIN') && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur z-50 flex flex-col items-center justify-center animate-pop">
                <div className="text-6xl mb-4">{gameState === 'WIN' ? '🎉' : '😵'}</div>
                <h1 className="text-3xl font-bold text-[#4A3B4E] mb-2">{gameState === 'WIN' ? '全部清空!' : '时间到!'}</h1>
                <p className="text-xl mb-8">最终得分: {score}</p>
                <div className="flex gap-4">
                    <RetroButton onClick={() => setGameState('INIT')} variant="primary">再来一局</RetroButton>
                    <RetroButton onClick={() => onComplete(score)} variant="neutral">退出</RetroButton>
                </div>
            </div>
        )}
    </div>
  );
};
