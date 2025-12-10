
import React, { useState, useEffect } from 'react';
import { GameTab, PlayerStats, ItemRarity, LogEntry, Weapon, MinigameType } from './types';
import { IdleGame } from './components/IdleGame';
import { FindItGame } from './components/minigames/FindItGame';
import { SnakeGame } from './components/minigames/SnakeGame';
import { SurvivorGame } from './components/minigames/SurvivorGame';
import { JumpGame } from './components/minigames/JumpGame';
import { RetroButton, RetroCard, RetroProgressBar, AchievementPopup } from './components/ui/RetroUI';
import { generateLegendaryWeapon } from './services/geminiService';
import { audioService } from './services/audioService';

const App: React.FC = () => {
  const [panicMode, setPanicMode] = useState(false);
  const [activeTab, setActiveTab] = useState<GameTab>(GameTab.ADVENTURE);
  const [activeMinigame, setActiveMinigame] = useState<MinigameType>(MinigameType.NONE);
  const [muted, setMuted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  const [player, setPlayer] = useState<PlayerStats>({
    level: 1,
    currentExp: 0,
    maxExp: 100,
    gold: 0,
    diamonds: 0,
    baseDamage: 5,
    equippedWeapon: null,
    unlockedAchievements: [],
    match3Level: 1,
    match3HighScore: 0
  });

  const [activeAchievement, setActiveAchievement] = useState<{title: string, icon: string} | null>(null);

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [shopItems, setShopItems] = useState<Weapon[]>([]);
  const [inventory, setInventory] = useState<Weapon[]>([]);

  useEffect(() => {
      const handleVisibilityChange = () => {
          if (document.hidden) {
              setIsPaused(true);
              audioService.stopBGM();
          } else {
              setIsPaused(false);
              if (activeMinigame !== MinigameType.NONE) audioService.startBGM('UPBEAT');
          }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [activeMinigame]);

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [{ id: Math.random().toString(), message, timestamp: Date.now(), type }, ...prev].slice(0, 50));
  };

  const unlockAchievement = (id: string, title: string, icon: string) => {
      if (!player.unlockedAchievements.includes(id)) {
          setPlayer(p => ({
              ...p,
              unlockedAchievements: [...p.unlockedAchievements, id]
          }));
          setActiveAchievement({ title, icon });
          audioService.playSuccess();
          setTimeout(() => setActiveAchievement(null), 3000);
      }
  };

  const handleMinigameComplete = (score: number) => {
    const diamondReward = Math.ceil(score / 50);
    const goldReward = score;
    setPlayer(p => ({
        ...p,
        gold: p.gold + goldReward,
        diamonds: p.diamonds + diamondReward
    }));
    addLog(`游戏结束: ${score}分. 获得 ${goldReward}金币 & ${diamondReward}星星!`, 'loot');
    setActiveMinigame(MinigameType.NONE);
    audioService.stopBGM();
    audioService.playSuccess();
  };

  const refreshShop = async () => {
    audioService.playClick();
    const baseItems: Weapon[] = [
      { id: '1', name: '塑料玩具锤', damage: 5, rarity: ItemRarity.COMMON, cost: 50 },
      { id: '2', name: '强力电风扇', damage: 12, rarity: ItemRarity.RARE, cost: 200 },
      { id: '3', name: '激光逗猫棒', damage: 25, rarity: ItemRarity.EPIC, cost: 800 },
    ];
    
    if (Math.random() > 0.5) {
       const legendary = await generateLegendaryWeapon();
       baseItems.push({
         id: `leg-${Date.now()}`,
         name: legendary.name,
         description: legendary.description,
         damage: 100 + Math.floor(Math.random() * 50),
         rarity: ItemRarity.LEGENDARY,
         cost: 5000
       });
    }

    setShopItems(baseItems);
  };

  useEffect(() => { refreshShop(); }, []);

  const buyItem = (item: Weapon) => {
    if (player.gold >= item.cost) {
      audioService.playClick();
      setPlayer(p => ({ ...p, gold: p.gold - item.cost }));
      setInventory(prev => [...prev, item]);
      addLog(`购买了 ${item.name}`, 'loot');
      unlockAchievement('first_buy', '购物狂', '🛍️');
    } else {
      audioService.playError();
      addLog('金币不足!', 'warning');
    }
  };

  const equipItem = (item: Weapon) => {
    audioService.playClick();
    setPlayer(p => ({ ...p, equippedWeapon: item }));
    addLog(`装备了 ${item.name}`, 'info');
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
        if (e.ctrlKey && e.key === 'b') {
            setPanicMode(prev => !prev);
        }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  if (panicMode) return <div onClick={() => setPanicMode(false)} className="w-full h-screen bg-white text-black p-4 font-sans text-xs">Microsoft Excel - [Report.xlsx] ... (点击任意处返回)</div>;

  if (isPaused) return <div className="h-screen w-full flex items-center justify-center bg-gray-100 text-gray-400 font-bold text-2xl">摸鱼暂停中... (点击回到页面)</div>;

  if (activeMinigame !== MinigameType.NONE) {
    return (
        <div className="h-screen w-full flex flex-col bg-[#FFF5F7]">
             {activeAchievement && <AchievementPopup title={activeAchievement.title} icon={activeAchievement.icon} />}
             <div className="bg-white/80 backdrop-blur-sm p-2 flex justify-between items-center shadow-sm z-20">
                <span className="font-bold text-[#4A3B4E]">正在游玩...</span>
                <RetroButton onClick={() => { audioService.playClick(); audioService.stopBGM(); setActiveMinigame(MinigameType.NONE); }} variant="danger">退出游戏</RetroButton>
             </div>
             <div className="flex-1 overflow-hidden relative">
                {activeMinigame === MinigameType.FIND_IT && (
                    <FindItGame onComplete={handleMinigameComplete} onUnlockAchievement={unlockAchievement} onExit={() => setActiveMinigame(MinigameType.NONE)} />
                )}
                {activeMinigame === MinigameType.SNAKE && (
                    <SnakeGame onComplete={handleMinigameComplete} onUnlockAchievement={unlockAchievement} />
                )}
                {activeMinigame === MinigameType.SURVIVOR && (
                    <SurvivorGame onComplete={handleMinigameComplete} onUnlockAchievement={unlockAchievement} />
                )}
                {activeMinigame === MinigameType.JUMP && (
                    <JumpGame onComplete={handleMinigameComplete} onUnlockAchievement={unlockAchievement} />
                )}
             </div>
        </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col md:flex-row text-[#4A3B4E] relative overflow-hidden">
      {activeAchievement && <AchievementPopup title={activeAchievement.title} icon={activeAchievement.icon} />}
      
      <div className="md:w-72 bg-white/90 backdrop-blur-md flex flex-col z-20 shadow-lg border-r border-[#FFE5E5]">
        <div className="p-6 border-b border-[#FFE5E5]">
          <h1 className="text-3xl font-bold text-[#FFB7B2] mb-2 cozy-text-shadow">摸鱼乐园</h1>
          <div className="flex justify-between items-center">
             <div className="bg-[#E2F0CB] px-2 py-1 rounded text-xs font-bold text-[#4A3B4E]">上班中...</div>
             <div 
                className="cursor-pointer text-xs bg-[#B5EAD7] px-2 py-1 rounded font-bold hover:scale-105 transition-transform"
                onClick={() => setMuted(audioService.toggleMute())}
             >
                {muted ? '🔇 静音' : '🔊 声音开'}
             </div>
          </div>
        </div>
        
        <div className="p-4 space-y-6 flex-1 overflow-y-auto">
          <RetroCard title="我的状态">
             <div className="flex justify-between items-center mb-2">
                 <span className="text-xl font-bold">LV.{player.level}</span>
                 <span className="text-xs text-gray-400">新手摸鱼人</span>
             </div>
             <div className="mb-2">
                 <RetroProgressBar value={player.currentExp} max={player.maxExp} label="EXP" />
             </div>
             <div className="grid grid-cols-2 gap-2 text-sm">
                 <div className="flex items-center gap-1 bg-yellow-50 p-1 rounded"><span className="text-xl">💰</span> {player.gold}</div>
                 <div className="flex items-center gap-1 bg-blue-50 p-1 rounded"><span className="text-xl">⭐</span> {player.diamonds}</div>
             </div>
          </RetroCard>

          <nav className="flex flex-col gap-3">
            {Object.values(GameTab).map(tab => (
              <RetroButton 
                key={tab} 
                onClick={() => setActiveTab(tab)}
                variant={activeTab === tab ? 'primary' : 'neutral'}
                className="w-full text-left flex justify-between items-center group shadow-sm"
              >
                <span>{tab}</span>
                <span className="text-[#FFB7B2]">{'>'}</span>
              </RetroButton>
            ))}
          </nav>
          
          <div className="mt-auto pt-4">
              <RetroButton variant="danger" className="w-full text-xs" onClick={() => setPanicMode(true)}>
                  🚨 老板来了 (Ctrl+B)
              </RetroButton>
          </div>
        </div>
      </div>

      <main className="flex-1 relative overflow-hidden flex flex-col p-4 md:p-8">
        <div className="flex-1 h-full bg-white/50 backdrop-blur-sm rounded-3xl shadow-soft overflow-hidden relative border-4 border-white">
            
            {activeTab === GameTab.ADVENTURE && (
                <IdleGame player={player} onUpdatePlayer={setPlayer} addLog={addLog} />
            )}

            {activeTab === GameTab.MINIGAMES && (
                <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 overflow-y-auto h-full content-start">
                    <RetroCard title="治愈寻宝" className="h-64 flex flex-col justify-between items-center hover:scale-105 transition-transform cursor-pointer" >
                        <div className="text-6xl my-4 animate-float">🧸</div>
                        <p className="text-center text-xs text-gray-500 mb-4">眼力挑战! 找到所有隐藏物品.</p>
                        <RetroButton onClick={() => setActiveMinigame(MinigameType.FIND_IT)} variant="primary" className="w-full">开始</RetroButton>
                    </RetroCard>

                    <RetroCard title="贪吃猫" className="h-64 flex flex-col justify-between items-center hover:scale-105 transition-transform cursor-pointer">
                         <div className="text-6xl my-4 animate-float" style={{animationDelay: '0.2s'}}>🐱</div>
                         <p className="text-center text-xs text-gray-500 mb-4">吃鱼变长, 别撞墙哦.</p>
                         <RetroButton onClick={() => setActiveMinigame(MinigameType.SNAKE)} variant="primary" className="w-full">开始</RetroButton>
                    </RetroCard>

                    <RetroCard title="元气保卫战" className="h-64 flex flex-col justify-between items-center hover:scale-105 transition-transform cursor-pointer">
                         <div className="text-6xl my-4 animate-float" style={{animationDelay: '0.4s'}}>🛡️</div>
                         <p className="text-center text-xs text-gray-500 mb-4">肉鸽射击, 升级变强!</p>
                         <RetroButton onClick={() => setActiveMinigame(MinigameType.SURVIVOR)} variant="primary" className="w-full">开始</RetroButton>
                    </RetroCard>

                    <RetroCard title="云端跳跃" className="h-64 flex flex-col justify-between items-center hover:scale-105 transition-transform cursor-pointer">
                         <div className="text-6xl my-4 animate-float" style={{animationDelay: '0.6s'}}>☁️</div>
                         <p className="text-center text-xs text-gray-500 mb-4">向上跳跃, 飞向太空.</p>
                         <RetroButton onClick={() => setActiveMinigame(MinigameType.JUMP)} variant="primary" className="w-full">开始</RetroButton>
                    </RetroCard>
                </div>
            )}

            {activeTab === GameTab.INVENTORY && (
                <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4 overflow-y-auto h-full content-start">
                    {inventory.map((item, idx) => (
                        <div key={`${item.id}-${idx}`} className="bg-white border-2 border-[#E2F0CB] p-3 rounded-xl hover:shadow-md transition-shadow">
                             <div className="font-bold mb-1 text-[#4A3B4E]">{item.name}</div>
                             <div className="text-[10px] text-gray-400 uppercase font-bold mb-2">{item.rarity}</div>
                             <div className="text-xs mb-3 text-gray-500">攻击力: +{item.damage}</div>
                             {player.equippedWeapon?.id === item.id ? (
                                 <div className="text-center bg-gray-100 text-gray-400 text-xs py-1 rounded">已装备</div>
                             ) : (
                                 <RetroButton onClick={() => equipItem(item)} className="text-xs w-full py-1">装备</RetroButton>
                             )}
                        </div>
                    ))}
                </div>
            )}

            {activeTab === GameTab.SHOP && (
                <div className="p-6 h-full flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-[#FFB7B2]">杂货铺</h2>
                        <RetroButton onClick={refreshShop}>进货</RetroButton>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {shopItems.map(item => (
                            <RetroCard key={item.id} className="relative group">
                                <div className="font-bold text-lg mb-1">{item.name}</div>
                                <div className="text-xs text-gray-400 mb-2">{item.rarity}</div>
                                {item.description && <p className="text-xs text-gray-500 mb-4 italic">"{item.description}"</p>}
                                <div className="text-xl font-bold text-[#FFB7B2] mb-4">ATK: {item.damage}</div>
                                <RetroButton onClick={() => buyItem(item)} variant="success" className="w-full flex justify-between text-sm">
                                    <span>购买</span>
                                    <span>💰 {item.cost}</span>
                                </RetroButton>
                            </RetroCard>
                        ))}
                    </div>
                </div>
            )}
        </div>
      </main>
    </div>
  );
};

export default App;
