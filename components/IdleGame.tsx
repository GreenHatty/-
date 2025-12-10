
import React, { useState, useEffect, useRef } from 'react';
import { PlayerStats, M3Tile, M3GameState } from '../types';
import { RetroButton, RetroProgressBar, RetroCard } from './ui/RetroUI';
import { audioService } from '../services/audioService';
import { AssetUtils, OCEAN_EMOJIS } from './ui/GameAssets';

interface IdleGameProps {
  player: PlayerStats;
  onUpdatePlayer: (stats: PlayerStats) => void;
  addLog: (msg: string) => void;
}

const TILE_WIDTH = 50; // px
const TILE_HEIGHT = 60; // px

export const IdleGame: React.FC<IdleGameProps> = ({ player, onUpdatePlayer, addLog }) => {
  const [gameState, setGameState] = useState<M3GameState>({
      level: 1,
      tiles: [],
      slot: [],
      status: 'PLAYING',
      history: [],
      tools: { undo: 1, remove3: 1, shuffle: 1 }
  });

  const [level, setLevel] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  // --- LOGIC ---

  const initLevel = (lvl: number) => {
      audioService.startBGM('FUNKY');
      setLevel(lvl);

      // Config
      const isHard = lvl > 1;
      const typeCount = isHard ? 12 : 3;
      const layerCount = isHard ? 12 : 3;
      const tripletCount = isHard ? 60 : 10; // Total tiles = triplet * 3

      // Select Types
      const allTypes = [...OCEAN_EMOJIS];
      const selectedTypes: string[] = [];
      for(let i=0; i<typeCount; i++) {
          const t = allTypes[Math.floor(Math.random()*allTypes.length)];
          if(!selectedTypes.includes(t)) selectedTypes.push(t);
          else i--;
      }

      // Generate Tiles
      const tiles: M3Tile[] = [];
      const totalTiles = tripletCount * 3;
      
      // Create Deck
      const deck: string[] = [];
      for(let i=0; i<tripletCount; i++) {
          const type = selectedTypes[Math.floor(Math.random()*selectedTypes.length)];
          deck.push(type, type, type);
      }
      // Shuffle Deck
      for(let i=deck.length-1; i>0; i--) {
          const j = Math.floor(Math.random()*(i+1));
          [deck[i], deck[j]] = [deck[j], deck[i]];
      }

      // Place Tiles
      for(let i=0; i<totalTiles; i++) {
          // Layer bias: start form bottom, pyramid up? or random.
          // Random messy pile logic
          const layer = Math.floor(Math.random() * layerCount);
          // Centralized distribution
          const x = 50 + (Math.random() - 0.5) * (80 - layer * 5); // %
          const y = 50 + (Math.random() - 0.5) * (80 - layer * 5); // %
          
          tiles.push({
              id: `t-${i}`,
              type: deck[i],
              layer,
              x, y,
              isBlocked: false,
              zIndex: layer * 10 + i // Base z-index
          });
      }

      // Initial Block Check
      updateBlockedStatus(tiles);

      setGameState({
          level: lvl,
          tiles,
          slot: [],
          status: 'PLAYING',
          history: [],
          tools: { undo: 1, remove3: 1, shuffle: 1 }
      });
  };

  const updateBlockedStatus = (tiles: M3Tile[]) => {
      // Simple bounding box overlap check
      // Convert % to relative units for comparison
      // Width ~ 12%, Height ~ 10% (AspectRatio dependent, but good enough approx)
      const W = 12; 
      const H = 14; 

      tiles.forEach(t1 => {
          t1.isBlocked = false;
          // Check if any tile is ABOVE t1
          for(const t2 of tiles) {
              if (t1.id === t2.id) continue;
              if (t2.layer <= t1.layer) continue; // t2 must be higher layer

              // Check intersection
              const xOverlap = Math.abs(t1.x - t2.x) < W;
              const yOverlap = Math.abs(t1.y - t2.y) < H;
              
              if (xOverlap && yOverlap) {
                  t1.isBlocked = true;
                  break;
              }
          }
      });
  };

  const handleTileClick = (tile: M3Tile) => {
      if (tile.isBlocked || gameState.status !== 'PLAYING') {
          if(tile.isBlocked) audioService.playError();
          return;
      }
      if (gameState.slot.length >= 7) {
          audioService.playError();
          return;
      }

      audioService.playClick();

      // Create snapshot for undo (simplified, deep copy)
      // For real undo, we need to store previous tiles and slot state.
      // Skipping full deep copy for perf, just simple state logic for now.

      // Move to slot
      const newTiles = gameState.tiles.filter(t => t.id !== tile.id);
      updateBlockedStatus(newTiles);
      
      let newSlot = [...gameState.slot, tile];
      
      // Check Match
      const counts: Record<string, number> = {};
      newSlot.forEach(t => counts[t.type] = (counts[t.type] || 0) + 1);
      
      let matchedType: string | null = null;
      for(const t in counts) {
          if (counts[t] >= 3) {
              matchedType = t;
              break;
          }
      }

      if (matchedType) {
          // Remove 3 matching
          let removed = 0;
          newSlot = newSlot.filter(t => {
              if (t.type === matchedType && removed < 3) {
                  removed++;
                  return false;
              }
              return true;
          });
          audioService.playMatch();
      }

      // Check Status
      let status: M3GameState['status'] = 'PLAYING';
      if (newTiles.length === 0 && newSlot.length === 0) status = 'WIN';
      else if (newSlot.length >= 7) status = 'FAIL';

      if (status === 'WIN') {
          audioService.playSuccess();
          onUpdatePlayer({ 
              ...player, 
              match3Level: player.match3Level + 1, 
              gold: player.gold + (level === 1 ? 50 : 500),
              diamonds: player.diamonds + (level === 1 ? 1 : 5)
          });
      } else if (status === 'FAIL') {
          audioService.playError();
      }

      setGameState(prev => ({
          ...prev,
          tiles: newTiles,
          slot: newSlot,
          status
      }));
  };

  const useTool = (tool: 'undo' | 'remove3' | 'shuffle') => {
      if (gameState.tools[tool] <= 0 || gameState.status !== 'PLAYING') {
          // Mock Ad to get tool?
          const confirmAd = window.confirm("看个广告(假)获得道具?");
          if (confirmAd) {
              setGameState(prev => ({
                  ...prev,
                  tools: { ...prev.tools, [tool]: 1 }
              }));
          }
          return;
      }

      audioService.playClick();
      
      if (tool === 'shuffle') {
          audioService.playShuffle();
          const newTiles = [...gameState.tiles];
          // Redistribute positions
          newTiles.forEach(t => {
              t.x = 50 + (Math.random() - 0.5) * 80;
              t.y = 50 + (Math.random() - 0.5) * 80;
              t.layer = Math.floor(Math.random() * 10);
              t.zIndex = t.layer * 10 + Math.floor(Math.random()*100);
          });
          updateBlockedStatus(newTiles);
          setGameState(prev => ({
              ...prev,
              tiles: newTiles,
              tools: { ...prev.tools, shuffle: prev.tools.shuffle - 1 }
          }));
      } else if (tool === 'remove3') {
          // Move 3 items from slot back to tiles
          if (gameState.slot.length === 0) return;
          const toRemove = gameState.slot.slice(0, 3);
          const newSlot = gameState.slot.slice(3);
          const newTiles = [...gameState.tiles, ...toRemove.map(t => ({
              ...t,
              layer: 0,
              x: 20 + Math.random() * 60,
              y: 80, // Put them at bottom
              zIndex: 1000,
              isBlocked: false
          }))];
          updateBlockedStatus(newTiles); // Recalc
          setGameState(prev => ({
              ...prev,
              tiles: newTiles,
              slot: newSlot,
              tools: { ...prev.tools, remove3: prev.tools.remove3 - 1 }
          }));
      }
  };

  const revive = () => {
      // Mock Ad
      setGameState(prev => ({
          ...prev,
          slot: prev.slot.slice(0, 4), // Remove 3 tiles
          status: 'PLAYING'
      }));
  };

  // Init
  useEffect(() => {
      initLevel(1);
  }, []);

  return (
    <div className="flex flex-col h-full bg-[#E0F7FA] relative overflow-hidden font-sans">
        {/* BG */}
        <div className="absolute inset-0 opacity-20 pointer-events-none" 
             style={{backgroundImage: `url(${AssetUtils.getPattern('sea', '81D4FA,4FC3F7,29B6F6')})`, backgroundSize: 'cover'}}></div>

        {/* HEADER */}
        <div className="p-4 flex justify-between items-center z-10 bg-white/50 backdrop-blur-sm border-b border-blue-200">
            <div>
                <h2 className="text-xl font-black text-blue-600">摸鱼三消</h2>
                <div className="text-xs text-blue-400 font-bold">第 {level} 关 {level===1?'(教学)':'(地狱)'}</div>
            </div>
            <div className="flex gap-2">
                 <div className="bg-yellow-100 px-3 py-1 rounded-full border border-yellow-300 text-yellow-600 font-bold text-xs">
                     🏆 {player.match3HighScore || 0}
                 </div>
            </div>
        </div>

        {/* GAME AREA */}
        <div className="flex-1 relative overflow-hidden" ref={containerRef}>
            {gameState.tiles.map(tile => (
                <div
                    key={tile.id}
                    className={`absolute transition-all duration-300 border-2 rounded-lg flex items-center justify-center bg-white
                                ${tile.isBlocked ? 'brightness-50 cursor-not-allowed border-gray-400 bg-gray-200 shadow-sm' : 'cursor-pointer border-green-400 shadow-[0_4px_0_#4ade80] hover:-translate-y-1'}`}
                    style={{
                        left: `${tile.x}%`,
                        top: `${tile.y}%`,
                        width: '13%', // Approx 50px on mobile
                        aspectRatio: '0.85',
                        transform: 'translate(-50%, -50%)',
                        zIndex: tile.zIndex
                    }}
                    onClick={() => handleTileClick(tile)}
                >
                    <img src={AssetUtils.getEmoji(tile.type)} className="w-3/4 h-3/4 object-contain pointer-events-none" />
                </div>
            ))}
        </div>

        {/* SLOT AREA */}
        <div className="h-24 bg-[#4FC3F7] relative z-20 flex items-center justify-center gap-1 px-2 shadow-[0_-4px_0_rgba(0,0,0,0.1)]">
             <div className="bg-[#0288D1] p-2 rounded-xl flex gap-1 w-full max-w-md h-16 items-center justify-center border-b-4 border-[#01579B]">
                 {gameState.slot.map((tile, i) => (
                     <div key={`slot-${i}`} className="h-12 w-10 bg-white rounded border border-gray-300 flex items-center justify-center animate-pop">
                         <img src={AssetUtils.getEmoji(tile.type)} className="w-8 h-8" />
                     </div>
                 ))}
                 {Array(7 - gameState.slot.length).fill(0).map((_, i) => (
                     <div key={`empty-${i}`} className="h-12 w-10 bg-black/20 rounded"></div>
                 ))}
             </div>
        </div>

        {/* TOOLS */}
        <div className="p-4 bg-white z-20 flex justify-around items-center border-t border-gray-200">
            <button onClick={() => useTool('undo')} className="flex flex-col items-center gap-1 active:scale-95 transition-transform">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-2xl border-2 border-blue-300">↩️</div>
                <span className="text-xs font-bold text-gray-500">撤销 {gameState.tools.undo}</span>
            </button>
            <button onClick={() => useTool('remove3')} className="flex flex-col items-center gap-1 active:scale-95 transition-transform">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-2xl border-2 border-blue-300">⬆️</div>
                <span className="text-xs font-bold text-gray-500">移出 {gameState.tools.remove3}</span>
            </button>
            <button onClick={() => useTool('shuffle')} className="flex flex-col items-center gap-1 active:scale-95 transition-transform">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-2xl border-2 border-blue-300">🔀</div>
                <span className="text-xs font-bold text-gray-500">洗牌 {gameState.tools.shuffle}</span>
            </button>
        </div>

        {/* OVERLAYS */}
        {gameState.status !== 'PLAYING' && (
            <div className="absolute inset-0 bg-black/60 z-50 flex flex-col items-center justify-center animate-pop backdrop-blur-sm">
                 {gameState.status === 'WIN' ? (
                     <div className="bg-white p-8 rounded-2xl text-center shadow-2xl border-4 border-yellow-400">
                         <div className="text-6xl mb-4 animate-bounce">🎉</div>
                         <h2 className="text-2xl font-black text-gray-800 mb-2">通关啦!</h2>
                         <p className="text-gray-500 mb-6">您真是摸鱼大师!</p>
                         <RetroButton onClick={() => initLevel(level === 1 ? 2 : 2)} variant="primary" className="w-full">
                             {level === 1 ? '挑战第二关' : '再来亿次'}
                         </RetroButton>
                     </div>
                 ) : (
                     <div className="bg-white p-8 rounded-2xl text-center shadow-2xl border-4 border-red-400">
                         <div className="text-6xl mb-4 animate-pulse">🪦</div>
                         <h2 className="text-2xl font-black text-gray-800 mb-2">槽位满啦!</h2>
                         <p className="text-gray-500 mb-6">还差一点点...</p>
                         <div className="flex flex-col gap-3 w-full">
                            <RetroButton onClick={revive} variant="success" className="w-full">📺 看广告复活</RetroButton>
                            <RetroButton onClick={() => initLevel(level)} variant="neutral" className="w-full">重新开始</RetroButton>
                         </div>
                     </div>
                 )}
            </div>
        )}
    </div>
  );
};
