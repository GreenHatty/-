
import React, { useState, useEffect, useRef } from 'react';
import { RetroButton, RetroProgressBar } from '../ui/RetroUI';
import { audioService } from '../../services/audioService';
import { SurvivorUpgrade, WeaponType } from '../../types';
import { AssetUtils, useImagePreloader, WEAPON_EMOJIS, SURVIVOR_MOBS } from '../ui/GameAssets';

interface SurvivorGameProps {
  onComplete: (score: number) => void;
  onUnlockAchievement: (id: string, title: string, icon: string) => void;
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

// Helper to safely get image, returns null if not loaded yet
const getAsset = (cache: Record<string, HTMLImageElement>, url: string) => {
    const img = cache[url];
    // Check if image is valid (has dimensions)
    if (img && img.naturalWidth > 0) return img;
    return null;
};

interface Entity {
    id: number;
    x: number; y: number;
    type: 'MOB' | 'BOSS' | 'CHEST';
    assetUrl: string;
    hp: number; maxHp: number;
    scale: number; speed: number;
    isFlashing?: boolean;
    knockback?: { x: number, y: number };
}

interface Bullet {
    x: number; y: number; 
    vx: number; vy: number; 
    life: number; 
    damage: number; 
    color: string; 
    type: string; 
    assetUrl?: string;
    pierce?: number;
    angle?: number;
    // For specific weapon logic
    maxLife?: number;
    initialY?: number; // For Axe
}

interface ActiveWeapon {
    type: WeaponType;
    level: number;
}

const MAP_THEMES = [
    { name: 'Grassland', bg: '#2ecc71', grid: '#27ae60', colors: 'a3d6a3,5cb85c' },
    { name: 'Desert', bg: '#f1c40f', grid: '#f39c12', colors: 'f9e79f,f1c40f' },
    { name: 'Ice Field', bg: '#ecf0f1', grid: '#bdc3c7', colors: 'd6eaf8,aed6f1' },
    { name: 'Lava', bg: '#c0392b', grid: '#e74c3c', colors: 'e6b0aa,c0392b' },
    { name: 'Abyss', bg: '#2c3e50', grid: '#34495e', colors: '5d6d7e,2c3e50' },
    { name: 'Toxic Swamp', bg: '#8e44ad', grid: '#9b59b6', colors: 'd2b4de,8e44ad' },
    { name: 'Void', bg: '#000000', grid: '#1a1a1a', colors: '333333,000000' }
];

const WEAPON_DEFS: Record<WeaponType, { name: string, color: string, cooldown: number }> = {
    BUBBLE: { name: '泡泡枪', color: 'cyan', cooldown: 500 },
    GARLIC: { name: '大蒜光环', color: 'pink', cooldown: 0 }, // Passive
    HOOP: { name: '呼啦圈', color: 'orange', cooldown: 0 }, // Passive
    BOOK: { name: '魔法书', color: 'purple', cooldown: 1500 },
    AXE: { name: '飞斧', color: 'brown', cooldown: 1000 },
    LIGHTNING: { name: '闪电链', color: 'yellow', cooldown: 2000 },
    BOOMERANG: { name: '回旋镖', color: 'brown', cooldown: 1200 },
    SATELLITE: { name: '轨道卫星', color: 'red', cooldown: 0 }, // Passive
    FIREBALL: { name: '大火球', color: 'orange', cooldown: 800 },
    ICE_SHARD: { name: '冰锥', color: 'cyan', cooldown: 600 },
    MAGIC_WAND: { name: '魔杖', color: 'blue', cooldown: 400 },
    SHOTGUN: { name: '散弹枪', color: 'gray', cooldown: 1500 },
    MINE: { name: '地雷', color: 'black', cooldown: 2000 },
    LASER: { name: '激光', color: 'red', cooldown: 2500 },
    DAGGER: { name: '飞刀', color: 'silver', cooldown: 200 },
    HOLY_WATER: { name: '圣水', color: 'blue', cooldown: 3000 },
    CROSS: { name: '十字架', color: 'gold', cooldown: 1500 },
    SHIELD: { name: '圣盾', color: 'gold', cooldown: 0 }, // Passive
    BOW: { name: '长弓', color: 'green', cooldown: 1000 },
    POISON: { name: '毒瓶', color: 'purple', cooldown: 2000 },
    TESLA: { name: '电塔', color: 'yellow', cooldown: 4000 },
    TORNADO: { name: '龙卷风', color: 'gray', cooldown: 4000 },
    METEOR: { name: '陨石术', color: 'orange', cooldown: 5000 },
    SCYTHE: { name: '死神镰刀', color: 'black', cooldown: 2000 },
    TURRET: { name: '炮台', color: 'gray', cooldown: 8000 },
    BLACK_HOLE: { name: '黑洞', color: 'black', cooldown: 8000 }
};

export const SurvivorGame: React.FC<SurvivorGameProps> = ({ onComplete, onUnlockAchievement }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'LOADING' | 'PLAYING' | 'LEVEL_UP' | 'BOSS_REWARD' | 'GAMEOVER'>('LOADING');
  const [hp, setHp] = useState(100);
  const [maxHp, setMaxHp] = useState(100);
  const [xp, setXp] = useState(0);
  const [maxXp, setMaxXp] = useState(20);
  const [level, setLevel] = useState(1);
  const [bossActive, setBossActive] = useState(false);
  const [bossTimer, setBossTimer] = useState(0);
  const [upgradeOptions, setUpgradeOptions] = useState<SurvivorUpgrade[]>([]);
  const [weapons, setWeapons] = useState<ActiveWeapon[]>([{type: 'BUBBLE', level: 1}]);
  
  // Initial Random Map
  const [mapTheme] = useState(() => MAP_THEMES[Math.floor(Math.random() * MAP_THEMES.length)]);
  const bgPattern = useRef<CanvasPattern | null>(null);

  // Generate asset list once
  const playerUrl = useRef(AssetUtils.getPlayerAvatar('hero-' + Date.now()));
  const assetUrls = useRef<string[]>([
      playerUrl.current,
      ...Object.values(SURVIVOR_MOBS).map(id => AssetUtils.getPokemonSprite(id)),
      ...Object.values(WEAPON_EMOJIS).map(code => AssetUtils.getEmoji(code)),
      AssetUtils.getPattern('bg-tex', mapTheme.colors) 
  ]).current;

  const { images, loaded } = useImagePreloader(assetUrls);
  
  const playerRef = useRef({ x: CANVAS_WIDTH/2, y: CANVAS_HEIGHT/2, facingRight: true });
  const mapOffsetRef = useRef({ x: 0, y: 0 });
  const entitiesRef = useRef<Entity[]>([]);
  const bulletsRef = useRef<Bullet[]>([]);
  const gemsRef = useRef<{x:number, y:number, val:number, collected:boolean}[]>([]);
  const particlesRef = useRef<any[]>([]);
  const keysRef = useRef<{[key: string]: boolean}>({});
  const lastWeaponFireTime = useRef<Record<string, number>>({});
  const lastOrbitalHitTime = useRef<number>(0); 
  const frameRef = useRef(0);
  const entityIdCounter = useRef(0);

  useEffect(() => {
      // Once preloader says loaded (or timed out), start game
      if (loaded && gameState === 'LOADING') {
          setGameState('PLAYING');
      }
  }, [loaded, gameState]);

  const triggerLevelUp = (isBossReward = false) => {
      audioService.playLevelUp();
      setGameState(isBossReward ? 'BOSS_REWARD' : 'LEVEL_UP');
      const allTypes = Object.keys(WEAPON_DEFS) as WeaponType[];
      const opts: SurvivorUpgrade[] = [];
      const optionCount = isBossReward ? 4 : 3;
      
      for(let i=0; i<optionCount; i++) {
          const type = allTypes[Math.floor(Math.random() * allTypes.length)];
          const existing = weapons.find(w => w.type === type);
          const nextLevel = existing ? existing.level + 1 : 1;
          opts.push({
              id: Math.random().toString(),
              name: `${WEAPON_DEFS[type].name} ${existing ? 'IVXLCDM'[existing.level] || '' : '(新)'}`,
              description: existing ? `升级属性 / 效果` : '解锁新武器',
              type: 'WEAPON',
              weaponType: type,
              weaponLevel: nextLevel,
              icon: AssetUtils.getEmoji(WEAPON_EMOJIS[type])
          });
      }
      setUpgradeOptions(opts);
  };

  const applyUpgrade = (u: SurvivorUpgrade) => {
      const idx = weapons.findIndex(w => w.type === u.weaponType);
      if (idx >= 0) {
          const nw = [...weapons];
          nw[idx].level++;
          setWeapons(nw);
      } else {
          setWeapons([...weapons, { type: u.weaponType!, level: 1 }]);
      }
      
      setLevel(l => l + 1);
      setMaxXp(m => Math.floor(m * 1.2)); 
      setXp(0);
      setGameState('PLAYING');
  };

  useEffect(() => {
    if (gameState !== 'PLAYING') return;
    const handleKey = (e: KeyboardEvent, isDown: boolean) => keysRef.current[e.key] = isDown;
    window.addEventListener('keydown', (e) => handleKey(e, true));
    window.addEventListener('keyup', (e) => handleKey(e, false));

    const loop = () => {
        let dx = 0, dy = 0;
        if (keysRef.current['ArrowUp'] || keysRef.current['w']) dy = -1;
        if (keysRef.current['ArrowDown'] || keysRef.current['s']) dy = 1;
        if (keysRef.current['ArrowLeft'] || keysRef.current['a']) dx = -1;
        if (keysRef.current['ArrowRight'] || keysRef.current['d']) dx = 1;

        if (dx!==0 || dy!==0) {
            const len = Math.hypot(dx,dy);
            dx/=len; dy/=len;
            playerRef.current.facingRight = dx > 0;
        }
        const speed = 4;
        mapOffsetRef.current.x -= dx * speed;
        mapOffsetRef.current.y -= dy * speed;

        // BOSS Logic
        if (bossActive) {
            setBossTimer(t => t - 1/60);
            if (bossTimer <= 0) {
                // Timeout Punishment
                setBossActive(false);
                setHp(h => Math.floor(h * 0.8)); // Lose 20%
                audioService.playError();
                entitiesRef.current = entitiesRef.current.filter(e => e.type !== 'BOSS');
                particlesRef.current.push({x: CANVAS_WIDTH/2, y: CANVAS_HEIGHT/2, life: 60, text: 'BOSS逃跑了!'});
            }
        } else if (level % 10 === 0 && !bossActive && level > 1) {
            setBossActive(true);
            setBossTimer(60);
            const bossUrl = AssetUtils.getMonster(`boss-${Date.now()}`);
            entitiesRef.current = entitiesRef.current.filter(e => e.type !== 'MOB'); // Clear mobs
            entitiesRef.current.push({
                id: entityIdCounter.current++,
                x: CANVAS_WIDTH/2 + 600 - mapOffsetRef.current.x,
                y: CANVAS_HEIGHT/2 - mapOffsetRef.current.y,
                type: 'BOSS',
                assetUrl: bossUrl,
                hp: level * 1000, maxHp: level * 1000,
                scale: 3.5, speed: 1.5,
                knockback: {x:0, y:0}
            });
            audioService.playZap();
        }

        // SPAWN
        if (!bossActive && entitiesRef.current.length < 50 + level * 2) {
            if (Math.random() < 0.1) {
                const angle = Math.random() * Math.PI * 2;
                const r = 600;
                const mobIds = Object.values(SURVIVOR_MOBS);
                const mobId = mobIds[Math.floor(Math.random() * mobIds.length)];
                entitiesRef.current.push({
                    id: entityIdCounter.current++,
                    x: CANVAS_WIDTH/2 + Math.cos(angle)*r - mapOffsetRef.current.x,
                    y: CANVAS_HEIGHT/2 + Math.sin(angle)*r - mapOffsetRef.current.y,
                    type: 'MOB',
                    assetUrl: AssetUtils.getPokemonSprite(mobId),
                    hp: level * 15, maxHp: level * 15,
                    scale: 1, speed: 1 + Math.random(),
                    knockback: {x:0, y:0}
                });
            }
        }

        // MOVE
        entitiesRef.current.forEach(e => {
            const sx = e.x + mapOffsetRef.current.x;
            const sy = e.y + mapOffsetRef.current.y;
            if (e.knockback) {
                e.x += e.knockback.x; e.y += e.knockback.y;
                e.knockback.x *= 0.8; e.knockback.y *= 0.8;
            }
            if (e.type === 'MOB' || e.type === 'BOSS') {
                const ang = Math.atan2(CANVAS_HEIGHT/2 - sy, CANVAS_WIDTH/2 - sx);
                e.x += Math.cos(ang) * e.speed;
                e.y += Math.sin(ang) * e.speed;
                if (Math.hypot(CANVAS_WIDTH/2 - sx, CANVAS_HEIGHT/2 - sy) < 30) {
                    setHp(h => {
                        const nh = h - 0.2;
                        if (nh <= 0) setGameState('GAMEOVER');
                        return nh;
                    });
                }
            }
        });

        // WEAPONS
        const now = Date.now();
        
        if (now - lastOrbitalHitTime.current > 200) { 
            weapons.forEach(w => {
                let range = 0;
                if (w.type === 'GARLIC') range = 80 + w.level * 10;
                if (w.type === 'HOOP') range = 100;
                if (w.type === 'SATELLITE') range = 120;
                if (w.type === 'SHIELD') range = 70;
                
                if (range > 0) {
                    entitiesRef.current.forEach(e => {
                        const sx = e.x + mapOffsetRef.current.x; const sy = e.y + mapOffsetRef.current.y;
                        if (Math.hypot(sx-CANVAS_WIDTH/2, sy-CANVAS_HEIGHT/2) < range) {
                             e.hp -= 5 * w.level;
                             e.isFlashing = true;
                             e.knockback = { x: (sx - CANVAS_WIDTH/2)*0.1, y: (sy - CANVAS_HEIGHT/2)*0.1 };
                        }
                    });
                }
            });
            lastOrbitalHitTime.current = now;
        }

        weapons.forEach(w => {
            const def = WEAPON_DEFS[w.type];
            if (def.cooldown === 0) return; 
            
            const cd = def.cooldown / (1 + (w.level-1)*0.2);
            const last = lastWeaponFireTime.current[w.type] || 0;
            
            if (now - last > cd) {
                let t = null, minD = 600;
                entitiesRef.current.forEach(e => {
                    const d = Math.hypot((e.x+mapOffsetRef.current.x)-CANVAS_WIDTH/2, (e.y+mapOffsetRef.current.y)-CANVAS_HEIGHT/2);
                    if(d<minD) { minD=d; t=e; }
                });

                const pX = CANVAS_WIDTH/2; const pY = CANVAS_HEIGHT/2;

                if (w.type === 'LIGHTNING' || w.type === 'TESLA') {
                    if (t) {
                        (t as Entity).hp -= 50 * w.level;
                        (t as Entity).isFlashing = true; 
                        audioService.playZap();
                        particlesRef.current.push({x: (t as Entity).x+mapOffsetRef.current.x, y: (t as Entity).y+mapOffsetRef.current.y, life: 10, text: '⚡'});
                    }
                } else if (w.type === 'MINE' || w.type === 'HOLY_WATER' || w.type === 'POISON' || w.type === 'TURRET' || w.type === 'BLACK_HOLE' || w.type === 'METEOR') {
                    const targetX = (w.type === 'METEOR' && t) ? (t as Entity).x + mapOffsetRef.current.x : pX - mapOffsetRef.current.x;
                    const targetY = (w.type === 'METEOR' && t) ? (t as Entity).y + mapOffsetRef.current.y : pY - mapOffsetRef.current.y;
                    
                    bulletsRef.current.push({
                        x: targetX, y: targetY,
                        vx: 0, vy: 0,
                        life: 600, damage: 30 * w.level, color: def.color, type: w.type,
                        assetUrl: AssetUtils.getEmoji(WEAPON_EMOJIS[w.type])
                    });
                } else if (w.type === 'TORNADO' || w.type === 'SCYTHE') {
                    const ang = Math.random() * Math.PI * 2;
                    bulletsRef.current.push({
                        x: pX, y: pY,
                        vx: Math.cos(ang)*(w.type==='SCYTHE'?1:2), vy: Math.sin(ang)*(w.type==='SCYTHE'?1:2),
                        life: 300, damage: 15 * w.level, color: 'gray', type: w.type,
                        assetUrl: AssetUtils.getEmoji(WEAPON_EMOJIS[w.type]),
                        pierce: 999
                    });
                    audioService.playWhoosh();
                } else if (w.type === 'SHOTGUN' && t) {
                    const sx = (t as Entity).x + mapOffsetRef.current.x;
                    const sy = (t as Entity).y + mapOffsetRef.current.y;
                    const ang = Math.atan2(sy-pY, sx-pX);
                    const pellets = 3 + w.level;
                    for(let i=0; i<pellets; i++) {
                        const spread = (Math.PI/6) * ((i - pellets/2)/pellets);
                        bulletsRef.current.push({
                            x: pX, y: pY,
                            vx: Math.cos(ang + spread)*12, vy: Math.sin(ang + spread)*12,
                            life: 40, damage: 15 * w.level, color: 'gray', type: 'PROJ',
                            assetUrl: AssetUtils.getEmoji(WEAPON_EMOJIS.SHOTGUN)
                        });
                    }
                    audioService.playShoot();
                } else if (w.type === 'BOOK') {
                     const pellets = 4 + w.level;
                     for(let i=0; i<pellets; i++) {
                        const ang = (Math.PI*2/pellets) * i;
                        bulletsRef.current.push({
                            x: pX, y: pY,
                            vx: Math.cos(ang)*5, vy: Math.sin(ang)*5,
                            life: 100, damage: 20 * w.level, color: 'purple', type: 'PROJ',
                            assetUrl: AssetUtils.getEmoji(WEAPON_EMOJIS.BOOK),
                            pierce: 3
                        });
                     }
                     audioService.playShoot();
                } else if (t) {
                    const sx = (t as Entity).x + mapOffsetRef.current.x;
                    const sy = (t as Entity).y + mapOffsetRef.current.y;
                    const ang = Math.atan2(sy-pY, sx-pX);
                    let speed = 8;
                    let life = 60;
                    let pierce = 1;
                    
                    if (w.type === 'BOOMERANG') { life = 100; pierce = 99; }
                    if (w.type === 'LASER') { speed = 25; pierce = 8; life = 30; }
                    if (w.type === 'AXE') { speed = 5; pierce = 5; }
                    if (w.type === 'BOW') { speed = 15; pierce = 2; }
                    if (w.type === 'CROSS') { speed = 10; pierce = 99; }
                    
                    bulletsRef.current.push({
                        x: pX, y: pY,
                        vx: Math.cos(ang)*speed, vy: Math.sin(ang)*speed,
                        life: life, maxLife: life,
                        damage: 20 * w.level, color: def.color, 
                        type: w.type === 'BOOMERANG' ? 'BOOMERANG' : (w.type === 'AXE' ? 'AXE' : 'PROJ'),
                        assetUrl: AssetUtils.getEmoji(WEAPON_EMOJIS[w.type]),
                        pierce: pierce,
                        angle: ang,
                        initialY: w.type === 'AXE' ? pY : 0
                    });
                    audioService.playShoot();
                }
                lastWeaponFireTime.current[w.type] = now;
            }
        });

        // BULLETS UPDATE
        bulletsRef.current.forEach(b => {
            let bx = b.x; let by = b.y;
            if (['MINE','TURRET','POISON','HOLY_WATER','BLACK_HOLE','METEOR'].includes(b.type)) {
                bx = b.x + mapOffsetRef.current.x; by = b.y + mapOffsetRef.current.y;
            } else {
                b.x += b.vx; b.y += b.vy;
                if (b.type !== 'BOOMERANG') { 
                    b.x += dx * speed * -1; b.y += dy * speed * -1;
                }
            }

            if (b.type === 'BOOMERANG') {
                if (b.life < b.maxLife! * 0.5) { 
                    const ang = Math.atan2(CANVAS_HEIGHT/2 - b.y, CANVAS_WIDTH/2 - b.x);
                    b.vx += Math.cos(ang)*0.5; b.vy += Math.sin(ang)*0.5;
                }
                b.x += dx * speed * -1; b.y += dy * speed * -1;
            }
            
            if (b.type === 'BLACK_HOLE') {
                entitiesRef.current.forEach(e => {
                    const sx = e.x + mapOffsetRef.current.x; const sy = e.y + mapOffsetRef.current.y;
                    if (Math.hypot(sx - bx, sy - by) < 150) {
                         e.knockback = { x: (bx - sx)*0.05, y: (by - sy)*0.05 };
                    }
                });
            }

            b.life--;

            entitiesRef.current.forEach(e => {
                const sx = e.x + mapOffsetRef.current.x; const sy = e.y + mapOffsetRef.current.y;
                const range = ['BLACK_HOLE','METEOR','HOLY_WATER','POISON','SCYTHE','TORNADO'].includes(b.type) ? 80 : 30;

                if (Math.hypot(sx - bx, sy - by) < range) {
                    if (['MINE','METEOR'].includes(b.type)) {
                         e.hp -= b.damage * 2; b.life = 0; 
                         audioService.playExplosion();
                         particlesRef.current.push({x: sx, y: sy, life: 30, text: '💥'});
                    } else if (b.life > 0) {
                         if (['TORNADO','SCYTHE','BLACK_HOLE','POISON','HOLY_WATER','LASER'].includes(b.type)) {
                             if (Math.random() < 0.1) { 
                                 e.hp -= b.damage * 0.5;
                                 audioService.playEnemyHit();
                                 particlesRef.current.push({x: sx, y: sy, life: 20, text: Math.floor(b.damage*0.5)});
                             }
                         } else {
                             e.hp -= b.damage;
                             if (b.pierce && b.pierce > 0) { b.pierce--; if (b.pierce <= 0) b.life = 0; }
                             else if (b.type === 'PROJ') b.life = 0;
                             
                             e.isFlashing = true; setTimeout(()=>e.isFlashing=false, 100);
                             audioService.playEnemyHit();
                             e.knockback = { x: b.vx * 0.5 || 0, y: b.vy * 0.5 || 0 };
                             particlesRef.current.push({x: sx, y: sy, life: 20, text: Math.floor(b.damage)});
                         }
                    }
                }
            });
        });
        bulletsRef.current = bulletsRef.current.filter(b => b.life > 0);

        // CLEANUP
        entitiesRef.current = entitiesRef.current.filter(e => {
            if (e.hp <= 0) {
                if (e.type === 'BOSS') {
                    setBossActive(false); triggerLevelUp(true);
                    onUnlockAchievement('boss_kill', 'Boss Killer', '💀');
                } else {
                    gemsRef.current.push({x: e.x, y: e.y, val: 1, collected: false});
                }
                return false;
            }
            return true;
        });

        // GEMS
        gemsRef.current.forEach(g => {
            const sx = g.x + mapOffsetRef.current.x; const sy = g.y + mapOffsetRef.current.y;
            const d = Math.hypot(sx-CANVAS_WIDTH/2, sy-CANVAS_HEIGHT/2);
            if (d < 150) { g.x -= (sx - CANVAS_WIDTH/2)*0.15; g.y -= (sy - CANVAS_HEIGHT/2)*0.15; }
            if (d < 20) {
                g.collected = true;
                setXp(x => {
                   const next = x + 1;
                   if (next >= maxXp) { setTimeout(() => triggerLevelUp(false), 0); return 0; }
                   return next;
                });
            }
        });
        gemsRef.current = gemsRef.current.filter(g => !g.collected);

        // DRAW
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
            const theme = mapTheme;
            if (!bgPattern.current) {
                const img = getAsset(images, AssetUtils.getPattern('bg-tex', theme.colors));
                if (img) bgPattern.current = ctx.createPattern(img, 'repeat');
            }
            ctx.fillStyle = bgPattern.current || theme.bg;
            ctx.fillRect(0,0,CANVAS_WIDTH, CANVAS_HEIGHT);
            
            ctx.fillStyle = theme.bg; ctx.globalAlpha = 0.5; ctx.fillRect(0,0,CANVAS_WIDTH, CANVAS_HEIGHT); ctx.globalAlpha = 1;

            const ox = mapOffsetRef.current.x % 50; const oy = mapOffsetRef.current.y % 50;
            ctx.strokeStyle = theme.grid;
            ctx.beginPath();
            for(let x=ox; x<CANVAS_WIDTH; x+=50) { ctx.moveTo(x,0); ctx.lineTo(x,CANVAS_HEIGHT); }
            for(let y=oy; y<CANVAS_HEIGHT; y+=50) { ctx.moveTo(0,y); ctx.lineTo(CANVAS_WIDTH,y); }
            ctx.stroke();

            // ENTITIES
            entitiesRef.current.sort((a,b) => a.y - b.y).forEach(e => {
                const sx = e.x + mapOffsetRef.current.x; const sy = e.y + mapOffsetRef.current.y;
                const size = e.scale * 40;
                
                const margin = e.type === 'BOSS' ? 400 : 100;
                if (sx > -margin && sx < CANVAS_WIDTH+margin && sy > -margin && sy < CANVAS_HEIGHT+margin) {
                    const img = getAsset(images, e.assetUrl);
                    if (e.isFlashing) {
                        ctx.globalCompositeOperation = 'source-over';
                        ctx.filter = 'brightness(2) sepia(1) hue-rotate(-50deg) saturate(5)'; 
                    }
                    if (img) ctx.drawImage(img, sx - size/2, sy - size/2, size, size);
                    
                    ctx.filter = 'none';
                    if (e.hp < e.maxHp) {
                        ctx.fillStyle = 'red'; ctx.fillRect(sx - 15, sy - size/2 - 5, 30 * (e.hp/e.maxHp), 3);
                    }
                    
                    if (e.type === 'BOSS') {
                         const ang = Math.atan2(sy-CANVAS_HEIGHT/2, sx-CANVAS_WIDTH/2);
                         if (sx < 0 || sx > CANVAS_WIDTH || sy < 0 || sy > CANVAS_HEIGHT) {
                             ctx.save();
                             ctx.translate(CANVAS_WIDTH/2 + Math.cos(ang)*(CANVAS_WIDTH/2-40), CANVAS_HEIGHT/2 + Math.sin(ang)*(CANVAS_HEIGHT/2-40));
                             ctx.rotate(ang);
                             ctx.fillStyle = 'red';
                             ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-10, -10); ctx.lineTo(-10, 10); ctx.fill();
                             ctx.restore();
                         }
                    }
                }
            });

            // PLAYER
            const pImg = getAsset(images, playerUrl.current);
            if (pImg) {
                ctx.save();
                ctx.translate(CANVAS_WIDTH/2, CANVAS_HEIGHT/2);
                if (!playerRef.current.facingRight) ctx.scale(-1, 1);
                ctx.drawImage(pImg, -25, -25, 50, 50);
                
                weapons.forEach(w => {
                    if (['GARLIC','HOOP','SATELLITE','SHIELD'].includes(w.type)) {
                         const r = w.type === 'GARLIC' ? 60 : w.type === 'SATELLITE' ? 100 : 80;
                         const speed = w.type === 'GARLIC' ? 0.002 : 0.005;
                         const orbitX = Math.cos(now * speed) * r;
                         const orbitY = Math.sin(now * speed) * r;
                         const orbImg = getAsset(images, AssetUtils.getEmoji(WEAPON_EMOJIS[w.type]));
                         if (orbImg) {
                             if (w.type === 'GARLIC') { ctx.globalAlpha = 0.3; ctx.drawImage(orbImg, -r, -r, r*2, r*2); ctx.globalAlpha = 1; }
                             else ctx.drawImage(orbImg, orbitX-15, orbitY-15, 30, 30);
                         }
                    }
                });
                ctx.restore();
            }

            // BULLETS
            bulletsRef.current.forEach(b => {
                let bx = b.x; let by = b.y;
                if (['MINE','TURRET','POISON','HOLY_WATER','BLACK_HOLE','METEOR'].includes(b.type)) {
                    bx = b.x + mapOffsetRef.current.x; by = b.y + mapOffsetRef.current.y;
                }
                
                if (b.assetUrl) {
                     const img = getAsset(images, b.assetUrl);
                     if (img) {
                         const size = ['TORNADO','BLACK_HOLE','SCYTHE','METEOR','HOLY_WATER'].includes(b.type) ? 80 : 25;
                         ctx.save();
                         ctx.translate(bx, by);
                         if (b.angle) ctx.rotate(b.angle);
                         else if (['TORNADO','BLACK_HOLE','SCYTHE','AXE'].includes(b.type)) ctx.rotate(now * 0.01);
                         
                         if (b.type === 'HOLY_WATER' || b.type === 'POISON') ctx.globalAlpha = 0.5;
                         ctx.drawImage(img, -size/2, -size/2, size, size);
                         ctx.globalAlpha = 1;
                         ctx.restore();
                     }
                }
            });

            // PARTICLES
            ctx.fillStyle = 'white'; ctx.font = 'bold 12px Arial';
            particlesRef.current.forEach(p => {
                p.y -= 1; p.life--; ctx.fillText(p.text, p.x, p.y);
            });
            particlesRef.current = particlesRef.current.filter(p => p.life > 0);
        }

        frameRef.current = requestAnimationFrame(loop);
    };

    frameRef.current = requestAnimationFrame(loop);
    return () => {
        cancelAnimationFrame(frameRef.current);
        window.removeEventListener('keydown', handleKey as any);
        window.removeEventListener('keyup', handleKey as any);
    };

  }, [gameState, bossActive, level, weapons, loaded]);

  if (gameState === 'LOADING') return <div className="h-full flex items-center justify-center text-xl animate-pulse text-white">资源加载中... (请稍候)</div>;

  return (
      <div className="h-full bg-black relative flex items-center justify-center">
          <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="rounded-xl shadow-lg bg-[#2d3436]" />
          <div className="absolute top-4 left-4 right-4 flex gap-4 pointer-events-none">
              <RetroProgressBar value={hp} max={maxHp} color="bg-red-500" label="生命" />
              <RetroProgressBar value={xp} max={maxXp} color="bg-yellow-400" label={`等级 ${level}`} />
          </div>
          {bossActive && <div className="absolute top-20 left-1/2 -translate-x-1/2 text-red-500 font-black text-4xl animate-pulse shadow-black drop-shadow-md">BOSS战: {Math.ceil(bossTimer)}s</div>}
          <div className="absolute bottom-4 left-4 flex gap-2">
            {weapons.map((w, i) => (
                <div key={i} className="w-10 h-10 bg-black/50 border border-white rounded flex items-center justify-center relative">
                    <img src={AssetUtils.getEmoji(WEAPON_EMOJIS[w.type])} className="w-8 h-8" />
                    <span className="absolute -top-2 -right-2 bg-blue-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">{w.level}</span>
                </div>
            ))}
          </div>
          {(gameState === 'LEVEL_UP' || gameState === 'BOSS_REWARD') && (
              <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-50 animate-pop">
                  <h2 className="text-4xl text-yellow-400 font-black mb-8">{gameState === 'BOSS_REWARD' ? 'Boss 宝箱!' : '升级!'}</h2>
                  <div className="flex gap-4">
                      {upgradeOptions.map(opt => (
                          <div key={opt.id} onClick={() => applyUpgrade(opt)}
                               className="bg-white border-4 border-blue-500 rounded-xl p-4 w-40 cursor-pointer hover:scale-105 transition-transform flex flex-col items-center">
                              <img src={opt.icon} className="w-16 h-16 mb-2" />
                              <div className="font-bold text-center mb-1">{opt.name}</div>
                              <div className="text-xs text-center text-gray-500">{opt.description}</div>
                              <RetroButton variant="success" className="mt-4 w-full">选择</RetroButton>
                          </div>
                      ))}
                  </div>
              </div>
          )}
          {gameState === 'GAMEOVER' && (
              <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-50 animate-pop">
                  <h1 className="text-5xl text-red-500 font-black mb-4">失败</h1>
                  <p className="text-white mb-8">存活等级: {level}</p>
                  <RetroButton onClick={() => onComplete(level * 100)} variant="primary">退出</RetroButton>
              </div>
          )}
      </div>
  );
};
