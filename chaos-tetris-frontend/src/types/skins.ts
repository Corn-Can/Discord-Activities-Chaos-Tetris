export interface SkinConfig {
    id: string;
    name: string;
    texturePath: string | null; // null 代表使用純色無材質
    description?: string;
    price?: number;              // 價格（0 = 免費，undefined = 不可購買）
    isPremium?: boolean;         // 是否為付費內容
    rarity?: 'common' | 'rare' | 'epic' | 'legendary'; // 稀有度
}

export const AVAILABLE_SKINS: SkinConfig[] = [
    {
        id: 'default',
        name: '經典純色',
        texturePath: '/skins/default.png',
        description: '預設',
        price: 0,
        isPremium: false,
        rarity: 'common'
    },
    {
        id: 'block_texture',
        name: '噪點',
        texturePath: '/skins/block_texture.png', // 記得把你的圖片改名並放在 public/skins/ 下
        description: '粗糙的像素噪點',
        price: 99,
        isPremium: true,
        rarity: 'rare'
    },
    {
        id: 'gridiant',
        name: '漸層',
        texturePath: '/skins/gridiant.png',
        description: '工業金屬的漸層風格',
        price: 149,
        isPremium: true,
        rarity: 'epic'
    },
    {
        id: '1',
        name: '新一代',
        texturePath: '/skins/1.png',
        description: '叮！你有一則訊息喔',
        price: 199,
        isPremium: true,
        rarity: 'legendary'
    }
];