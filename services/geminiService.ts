
import { GoogleGenAI } from "@google/genai";

const getAI = () => {
    if (!process.env.API_KEY) {
        return null;
    }
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const generateBossLore = async (level: number): Promise<{ name: string; description: string }> => {
    const ai = getAI();
    if (!ai) return { name: `防火墙 Lv.${level}`, description: "一道简单的逻辑门。" };

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `生成一个赛博朋克/磁带未来主义风格的游戏Boss名字和一句话描述。这个Boss是第${level}层的程序或病毒。名字要酷或者带有故障感，描述要有趣或讽刺。只输出JSON格式: {"name": "string", "description": "string"}。使用中文。`,
            config: {
                responseMimeType: "application/json"
            }
        });
        
        const text = response.text;
        if (!text) throw new Error("No text");
        return JSON.parse(text);
    } catch (e) {
        return { name: `异常数据流 Lv.${level}`, description: "未定义的字节堆。" };
    }
};

export const generateLegendaryWeapon = async (): Promise<{ name: string; description: string }> => {
    const ai = getAI();
    if (!ai) return { name: "量子软盘", description: "存储着毁灭性的数据。" };

    try {
         const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `为一款赛博朋克挂机游戏生成一个传说级武器的名字和描述。风格应该是80/90年代复古科技（如磁带、软盘、CRT、合成器）。只输出JSON: {"name": "string", "description": "string"}。使用中文。`,
             config: {
                responseMimeType: "application/json"
            }
        });
        const text = response.text;
         if (!text) throw new Error("No text");
        return JSON.parse(text);
    } catch (e) {
         return { name: "终极能量手套", description: "它太酷了。" };
    }
}
