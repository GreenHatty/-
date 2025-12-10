
export enum ItemRarity {
  COMMON = '普通',
  RARE = '稀有',
  EPIC = '史诗',
  LEGENDARY = '传说'
}

export enum GameTab {
  ADVENTURE = '摸鱼三消', // Renamed from Adventure
  MINIGAMES = '游乐园',
  INVENTORY = '百宝箱',
  SHOP = '杂货铺'
}

export interface Weapon {
  id: string;
  name: string;
  damage: number;
  rarity: ItemRarity;
  description?: string;
  cost: number;
}

export interface PlayerStats {
  level: number;
  currentExp: number;
  maxExp: number;
  gold: number; // Coins
  diamonds: number; // Stars
  baseDamage: number;
  equippedWeapon: Weapon | null;
  unlockedAchievements: string[];
  // Match 3 Stats
  match3Level: number;
  match3HighScore: number;
}

export interface Enemy {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  level: number;
  isBoss: boolean;
  flavorText?: string;
}

export interface LogEntry {
  id: string;
  message: string;
  timestamp: number;
  type: 'info' | 'loot' | 'combat' | 'warning';
}

export enum MinigameType {
  NONE = 'NONE',
  FIND_IT = 'FIND_IT',
  SNAKE = 'SNAKE',
  SURVIVOR = 'SURVIVOR',
  JUMP = 'JUMP'
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
}

// Survivor Types
export type WeaponType = 
    | 'BUBBLE' | 'GARLIC' | 'HOOP' | 'BOOK' | 'AXE' | 'LIGHTNING' | 'BOOMERANG' | 'SATELLITE'
    | 'FIREBALL' | 'ICE_SHARD' | 'MAGIC_WAND' | 'SHOTGUN' | 'MINE' | 'LASER' | 'DAGGER'
    | 'HOLY_WATER' | 'CROSS' | 'SHIELD' | 'BOW' | 'POISON' | 'TESLA' | 'TORNADO' | 'METEOR'
    | 'SCYTHE' | 'TURRET' | 'BLACK_HOLE';

export interface SurvivorUpgrade {
    id: string;
    name: string;
    description: string;
    type: 'WEAPON' | 'STAT' | 'ITEM';
    weaponType?: WeaponType;
    weaponLevel?: number; // 1, 2, 3
    statType?: 'SPEED' | 'AREA' | 'DAMAGE' | 'HP' | 'COOLDOWN';
    value?: number;
    icon: string;
    isBossReward?: boolean;
}

export type FindItTheme = 'SWEETS' | 'NATURE' | 'TOYS';
export type JumpTheme = 'DAY' | 'NIGHT' | 'DUSK' | 'MATRIX';

// Match 3 Types
export interface M3Tile {
    id: string;
    type: string; // Emoji code
    layer: number;
    x: number; // Percent 0-100
    y: number; // Percent 0-100
    isBlocked: boolean;
    zIndex: number;
}

export interface M3GameState {
    level: number; // 1 = Easy, 2 = Hard
    tiles: M3Tile[];
    slot: M3Tile[];
    status: 'PLAYING' | 'WIN' | 'FAIL';
    history: M3Tile[][]; // For undo
    tools: {
        undo: number;
        remove3: number;
        shuffle: number;
    };
}
