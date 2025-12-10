
import React, { useState, useEffect, useRef } from 'react';
import { RetroButton } from '../ui/RetroUI';
import { audioService } from '../../services/audioService';
import { AssetUtils } from '../ui/GameAssets';

interface SnakeGameProps {
  onComplete: (score: number) => void;
  onUnlockAchievement: (id: string, title: string, icon: string) => void;
}

const GRID_SIZE = 20;

export const SnakeGame: React.FC<SnakeGameProps> = ({ onComplete, onUnlockAchievement }) => {
  const [snake, setSnake] = useState([{ x: 10, y: 10 }]);
  const [food, setFood] = useState({ x: 15, y: 10, type: 'NORMAL', url: '' }); 
  const [dir, setDir] = useState({ x: 1, y: 0 }); 
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const moveRef = useRef(dir);
  
  // Static Avatar URL
  const headUrl = useRef(AssetUtils.getPlayerAvatar('snake-cat')).current;

  const generateFood = (currentSnake: {x: number, y: number}[]) => {
    let newFood;
    while (true) {
        newFood = {
            x: Math.floor(Math.random() * GRID_SIZE),
            y: Math.floor(Math.random() * GRID_SIZE),
            type: Math.random() > 0.8 ? 'BONUS' : 'NORMAL',
            url: ''
        };
        if (!currentSnake.some(s => s.x === newFood.x && s.y === newFood.y)) break;
    }
    // Random Food Emoji (Fish, Mouse, Yarn)
    const foods = ['1f41f', '1f42d', '1f9f6'];
    newFood.url = AssetUtils.getEmoji(foods[Math.floor(Math.random() * foods.length)]);
    return newFood;
  };

  useEffect(() => {
      setFood(generateFood(snake));
      audioService.startBGM('CALM');
      const handleKeyDown = (e: KeyboardEvent) => {
        const { x, y } = moveRef.current;
        switch(e.key) {
            case 'ArrowUp': if (y === 0) moveRef.current = { x: 0, y: -1 }; break;
            case 'ArrowDown': if (y === 0) moveRef.current = { x: 0, y: 1 }; break;
            case 'ArrowLeft': if (x === 0) moveRef.current = { x: -1, y: 0 }; break;
            case 'ArrowRight': if (x === 0) moveRef.current = { x: 1, y: 0 }; break;
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => { window.removeEventListener('keydown', handleKeyDown); audioService.stopBGM(); };
  }, []);

  useEffect(() => {
    if (gameOver) return;
    const interval = setInterval(() => {
        setDir(moveRef.current);
        const currentDir = moveRef.current;
        
        setSnake(prev => {
            const head = prev[0];
            const newHead = { x: head.x + currentDir.x, y: head.y + currentDir.y };

            if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE || 
                prev.some(s => s.x === newHead.x && s.y === newHead.y)) {
                setGameOver(true);
                audioService.playError();
                return prev;
            }

            const newSnake = [newHead, ...prev];
            if (newHead.x === food.x && newHead.y === food.y) {
                audioService.playClick();
                const points = food.type === 'BONUS' ? 5 : 1;
                setScore(s => s + points);
                setFood(generateFood(newSnake));
            } else {
                newSnake.pop();
            }
            return newSnake;
        });
    }, 150);
    return () => clearInterval(interval);
  }, [food, gameOver]);

  return (
    <div className="flex flex-col items-center justify-center h-full bg-[#FFF5F7] text-[#4A3B4E]">
        <h2 className="text-3xl mb-4 font-bold text-[#FFB7B2]">得分: {score}</h2>
        <div className="relative bg-white border-4 border-[#FFB7B2] rounded-xl shadow-lg overflow-hidden" style={{ width: 'min(80vw, 400px)', height: 'min(80vw, 400px)' }}>
            {/* Grid */}
            <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'radial-gradient(#FFB7B2 2px, transparent 2px)', backgroundSize: '20px 20px'}}></div>

            {/* Snake */}
            {snake.map((seg, i) => (
                <div key={i} className="absolute transition-all duration-150"
                    style={{ left: `${seg.x * 5}%`, top: `${seg.y * 5}%`, width: '5%', height: '5%', zIndex: 10 }}>
                    {i === 0 ? <img src={headUrl} className="w-full h-full object-contain" /> : <div className="w-full h-full rounded-full bg-[#FFB7B2] scale-75"></div>}
                </div>
            ))}
            
            {/* Food */}
            <img src={food.url} className="absolute animate-bounce" style={{ left: `${food.x * 5}%`, top: `${food.y * 5}%`, width: '6%', height: '6%', zIndex: 5 }} />

            {gameOver && (
                <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center z-20 animate-pop">
                    <h3 className="text-[#FFB7B2] text-4xl mb-4 font-bold">哎呀!</h3>
                    <RetroButton onClick={() => onComplete(score)} variant="primary">结束</RetroButton>
                </div>
            )}
        </div>
        <p className="mt-4 text-gray-400 text-sm">使用方向键控制</p>
    </div>
  );
};
