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
        name: 'Default',
        texturePath: '/skins/default.png',
        description: 'Default',
        price: 0,
        isPremium: false,
        rarity: 'common'
    },
    {
        id: 'block_texture',
        name: 'Block Texture',
        texturePath: '/skins/block_texture.png', // 記得把你的圖片改名並放在 public/skins/ 下
        description: 'Block Texture',
        price: 99,
        isPremium: true,
        rarity: 'rare'
    },
    {
        id: 'gridiant',
        name: 'Gridiant',
        texturePath: '/skins/gridiant.jpg',
        description: 'Industrial metal gradient style',
        price: 149,
        isPremium: true,
        rarity: 'epic'
    },
    {
        id: '1',
        name: 'Just 1',
        texturePath: '/skins/1.png',
        description: 'Ding! You have a message',
        price: 199,
        isPremium: true,
        rarity: 'legendary'
    }
];