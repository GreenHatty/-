
import React, { useState, useEffect, useRef } from 'react';
import { RetroButton } from '../ui/RetroUI';
import { audioService } from '../../services/audioService';
import { AssetUtils, JumpThemes } from '../ui/GameAssets';
import { JumpTheme } from '../../types';

interface JumpGameProps {
  onComplete: (score: number) => void;
  onUnlockAchievement: (id: string, title: string, icon: string) => void;
}

export const JumpGame: React.FC<JumpGameProps> = ({ onComplete, onUnlockAchievement }) => {
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState<'MENU' | 'PLAYING' | 'GAMEOVER'>('MENU');
  const [theme, setTheme] = useState<JumpTheme>('DAY');
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerRef = useRef({ x: 150, y: 300, vx: 0, vy: 0 });
  const playerImg = useRef(new Image());
  const obstacleImgs = useRef<Record<string, HTMLImageElement>>({});

  useEffect(() => {
     playerImg.current.src = AssetUtils.getPixelAvatar(`player-${Date.now()}`);
     const crow = new Image(); crow.src = AssetUtils.getPokemonSprite(198); // Murkrow
     const hole = new Image(); hole.src = AssetUtils.getPokemonSprite(92); // Gastly
     obstacleImgs.current = { 'CROW': crow, 'HOLE': hole };
  }, []);

  // ... (Keep existing Logic, just update Draw) ...
  const platformsRef = useRef<any[]>([]);
  const obstaclesRef = useRef<any[]>([]);
  const frameRef = useRef(0);
  const keysRef = useRef({ left: false, right: false });

  // Input Handlers
  useEffect(() => {
      const handleDown = (e: KeyboardEvent) => {
          if (e.key === 'ArrowLeft') keysRef.current.left = true;
          if (e.key === 'ArrowRight') keysRef.current.right = true;
      };
      const handleUp = (e: KeyboardEvent) => {
          if (e.key === 'ArrowLeft') keysRef.current.left = false;
          if (e.key === 'ArrowRight') keysRef.current.right = false;
      };
      window.addEventListener('keydown', handleDown);
      window.addEventListener('keyup', handleUp);
      return () => {
          window.removeEventListener('keydown', handleDown);
          window.removeEventListener('keyup', handleUp);
      };
  }, []);

  const startGame = () => {
      setGameState('PLAYING');
      setScore(0);
      playerRef.current = { x: 150, y: 300, vx: 0, vy: 0 };
      const plats = [];
      for(let i=0; i<8; i++) plats.push({ x: Math.random() * 240, y: 500 - i * 90, w: 60, type: 'NORMAL' });
      platformsRef.current = plats;
      obstaclesRef.current = [];
      audioService.startBGM('UPBEAT');
  };

  useEffect(() => {
      if (gameState !== 'PLAYING') return;
      
      const currentTheme = JumpThemes[theme];

      const loop = () => {
          const ctx = canvasRef.current?.getContext('2d');
          if (!ctx) return;
          const p = playerRef.current;

          // Logic
          if (keysRef.current.left) p.vx = -6;
          else if (keysRef.current.right) p.vx = 6;
          else p.vx *= 0.9;
          p.vy += 0.5; p.x += p.vx; p.y += p.vy;
          if (p.x > 300) p.x = -30; if (p.x < -30) p.x = 300;

          if (p.y < 250) {
              const diff = 250 - p.y;
              p.y = 250;
              setScore(s => s + Math.floor(diff));
              platformsRef.current.forEach(pl => {
                  pl.y += diff;
                  if (pl.y > 600) { pl.y = -20; pl.x = Math.random()*240; }
              });
              obstaclesRef.current.forEach(o => o.y += diff);
              if (score > 500 && Math.random() < 0.01 && obstaclesRef.current.length < 3) {
                  obstaclesRef.current.push({ x: Math.random()*250, y: -50, type: Math.random()>0.5?'CROW':'HOLE', vx: Math.random()*2-1 });
              }
              obstaclesRef.current = obstaclesRef.current.filter(o => o.y < 650);
          }

          if (p.vy > 0) {
              platformsRef.current.forEach(pl => {
                  if (p.x+20 > pl.x && p.x+10 < pl.x+pl.w && p.y+30 > pl.y && p.y+30 < pl.y+20) {
                      p.vy = -13; audioService.playJump();
                  }
              });
          }

          obstaclesRef.current.forEach(o => {
              if (Math.abs(p.x - o.x) < 30 && Math.abs(p.y - o.y) < 30) { setGameState('GAMEOVER'); audioService.playError(); }
              if (o.type === 'CROW') { o.x += o.vx; if(o.x<0||o.x>300) o.vx*=-1; }
          });

          if (p.y > 600) { setGameState('GAMEOVER'); audioService.playError(); }

          // Draw
          ctx.fillStyle = currentTheme.bg; ctx.fillRect(0,0,300,600);
          ctx.fillStyle = currentTheme.plat;
          platformsRef.current.forEach(pl => {
              ctx.beginPath(); ctx.roundRect(pl.x, pl.y, pl.w, 15, 8); ctx.fill();
          });
          
          obstaclesRef.current.forEach(o => {
               const img = o.type === 'CROW' ? obstacleImgs.current.CROW : obstacleImgs.current.HOLE;
               if (img) ctx.drawImage(img, o.x, o.y, 40, 40);
          });

          ctx.drawImage(playerImg.current, p.x, p.y, 40, 40);

          frameRef.current = requestAnimationFrame(loop);
      };
      frameRef.current = requestAnimationFrame(loop);
      return () => cancelAnimationFrame(frameRef.current);
  }, [gameState, theme, score]);

  return (
    <div className="h-full flex flex-col items-center justify-center bg-[#f0f0f0]">
        {gameState === 'MENU' && (
            <div className="bg-white p-8 rounded-2xl shadow-xl flex flex-col gap-4 animate-pop">
                <h1 className="text-3xl font-bold text-[#4A3B4E]">云端跳跃</h1>
                <div className="grid grid-cols-2 gap-2">
                    {(['DAY', 'NIGHT', 'DUSK', 'MATRIX'] as JumpTheme[]).map(t => (
                        <button key={t} onClick={() => setTheme(t)} className={`p-2 rounded border-2 ${theme===t ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>{t}</button>
                    ))}
                </div>
                <RetroButton variant="primary" onClick={startGame}>开始跳跃</RetroButton>
            </div>
        )}
        {(gameState === 'PLAYING' || gameState === 'GAMEOVER') && (
            <div className="relative border-4 border-[#4A3B4E] rounded-xl overflow-hidden shadow-2xl bg-white">
                <canvas ref={canvasRef} width={300} height={600} />
                <div className="absolute top-2 left-2 font-bold text-2xl text-gray-500 opacity-50">{Math.floor(score/10)}m</div>
                {gameState === 'GAMEOVER' && (
                    <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center animate-pop z-50">
                        <h2 className="text-3xl font-black mb-2 text-[#FFB7B2]">坠落!</h2>
                        <p className="text-xl mb-6 text-[#4A3B4E]">高度: {Math.floor(score/10)}m</p>
                        <div className="flex gap-2"><RetroButton onClick={startGame} variant="primary">再来一次</RetroButton><RetroButton onClick={() => onComplete(Math.floor(score/10))} variant="neutral">退出</RetroButton></div>
                    </div>
                )}
            </div>
        )}
    </div>
  );
};
