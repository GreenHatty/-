
import React from 'react';

// --- ASSET URL GENERATORS ---

export const AssetUtils = {
    getPlayerAvatar: (seed: string) => `https://api.dicebear.com/9.x/adventurer/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9`,
    getPixelAvatar: (seed: string) => `https://api.dicebear.com/9.x/pixel-art/svg?seed=${seed}`,
    getRobot: (seed: string) => `https://api.dicebear.com/9.x/bottts/svg?seed=${seed}`,
    // Fallback to static if animated fails, but here we keep animated as primary. 
    // Preloader handles errors now.
    getPokemonSprite: (id: number) => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/${id}.gif`,
    getMonster: (seed: string, size: number = 200) => `https://app.pixelencounter.com/api/basic/monsters/random/png?size=${size}&seed=${seed}`,
    getEmoji: (codePoint: string) => `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/${codePoint}.png`,
    getPattern: (seed: string, colors: string) => `https://source.boringavatars.com/marble/800/${seed}?colors=${colors}`
};

// --- PRELOADER FOR CANVAS ---
export const useImagePreloader = (urls: string[]) => {
    const [images, setImages] = React.useState<Record<string, HTMLImageElement>>({});
    const [loaded, setLoaded] = React.useState(false);

    React.useEffect(() => {
        let count = 0;
        const total = urls.length;
        const loadedImgs: Record<string, HTMLImageElement> = {};
        let isMounted = true;

        if (total === 0) {
            setLoaded(true);
            return;
        }

        const handleLoadOrError = () => {
            if (!isMounted) return;
            count++;
            if (count === total) {
                setLoaded(true);
            }
        };

        urls.forEach(url => {
            const img = new Image();
            img.crossOrigin = "Anonymous"; // Important for canvas manipulation
            img.src = url;
            img.onload = handleLoadOrError;
            img.onerror = () => {
                console.warn(`Failed to load asset: ${url}`);
                handleLoadOrError(); // Count it anyway so we don't get stuck
            };
            loadedImgs[url] = img;
        });

        setImages(loadedImgs);
        
        // Safety timeout: Force start after 5 seconds even if assets are stuck
        const timeout = setTimeout(() => {
            if (isMounted && !loaded) {
                console.log("Asset loading timed out, forcing start.");
                setLoaded(true);
            }
        }, 5000);

        return () => {
            isMounted = false;
            clearTimeout(timeout);
        };
    }, [JSON.stringify(urls)]);

    return { images, loaded };
};

export const AvatarImg: React.FC<{ seed: string, className?: string }> = ({ seed, className }) => (
    <img src={AssetUtils.getPlayerAvatar(seed)} alt="avatar" className={`pointer-events-none ${className}`} />
);

export const PixelImg: React.FC<{ seed: string, className?: string }> = ({ seed, className }) => (
    <img src={AssetUtils.getPixelAvatar(seed)} alt="pixel-avatar" className={`pointer-events-none ${className}`} />
);

export const EmojiImg: React.FC<{ code: string, className?: string, style?: React.CSSProperties }> = ({ code, className, style }) => (
    <img src={AssetUtils.getEmoji(code)} alt="emoji" className={`pointer-events-none select-none ${className}`} style={style} />
);

// --- ASSETS ---

export const WEAPON_EMOJIS: Record<string, string> = {
    BUBBLE: '1f9fc', GARLIC: '1f9c4', HOOP: '2b55', BOOK: '1f4d6', AXE: '1fa93',
    LIGHTNING: '26a1', BOOMERANG: '1fa83', SATELLITE: '1f6f0', FIREBALL: '1f525',
    ICE_SHARD: '1f9ca', MAGIC_WAND: '1fa84', SHOTGUN: '1f52b', MINE: '1f4a3',
    LASER: '1f526', DAGGER: '1f5e1', HOLY_WATER: '1f9ea', CROSS: '271d',
    SHIELD: '1f6e1', BOW: '1f3f9', POISON: '2620', TESLA: '1f50b',
    TORNADO: '1f32a', METEOR: '2604', SCYTHE: '26cf', TURRET: '1f6a7',
    BLACK_HOLE: '26ab'
};

export const SURVIVOR_MOBS = {
    BAT: 41, GHOST: 92, RAT: 19, SLIME: 88, SKELETON: 104
};

export const JumpThemes: Record<string, { bg: string, plat: string }> = {
    DAY: { bg: '#87CEEB', plat: '#8B4513' },
    NIGHT: { bg: '#0B1026', plat: '#708090' },
    DUSK: { bg: '#FF7F50', plat: '#2F4F4F' },
    MATRIX: { bg: '#000000', plat: '#00FF00' }
};

export const OCEAN_EMOJIS = [
    '1f41f', // Fish
    '1f420', // Tropical Fish
    '1f421', // Pufferfish
    '1f419', // Octopus
    '1f41a', // Spiral Shell
    '1f433', // Spouting Whale
    '1f42c', // Dolphin
    '1f980', // Crab
    '1f99e', // Lobster
    '1f990', // Shrimp
    '1f991', // Squid
    '1f33f', // Herb (Seaweed)
    '1f40b', // Whale
    '1f988', // Shark
    '1fae7'  // Bubbles
];
