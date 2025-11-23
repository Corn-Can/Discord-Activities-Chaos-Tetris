import { DiscordSDK } from "@discord/embedded-app-sdk";

const CLIENT_ID = '1439543217350639716'; // Hardcoded from error message to ensure match
// 注意：稍後我們要將 ID 放入 .env 檔案

class DiscordService {
    public discordSdk: DiscordSDK | null = null;
    public auth: any = null;
    public isRunningInDiscord: boolean = false;

    constructor() {
        // 簡單檢查是否在 Discord iframe 中運行
        const isEmbedded = window.location.href.includes('discord.com');
        // 或者是檢查是否有特定的 query params，通常 SDK 初始化後才知道
        // 但為了簡單起見，我們先假設如果有 SDK 就嘗試初始化
    }

    async init() {
        try {
            // 1. 初始化 SDK
            this.discordSdk = new DiscordSDK(CLIENT_ID);
            await this.discordSdk.ready();
            console.log("Discord SDK is ready");
            this.isRunningInDiscord = true;

            // 2. 授權 (Authorize) - 取得 code
            const { code } = await this.discordSdk.commands.authorize({
                client_id: CLIENT_ID,
                response_type: "code",
                state: "",
                prompt: "none",
                scope: [
                    "identify",
                    "guilds",
                    "rpc.activities.write" // 允許更新活動狀態
                ],
            });

            // 3. 交換 Token (Authenticate)
            // 注意：在正式環境中，你需要把 'code' 傳給你的後端伺服器
            // 由後端去向 Discord 交換 access_token，再傳回給前端。
            // 因為我們是 7 天 MVP，為了省去後端 OAuth 實作的複雜度，
            // 我們這裡先做一個「偽登入」或者僅使用 SDK 的基本功能。

            // 如果要獲取完整使用者資訊 (Avatar, Username)，必須完成 Token 交換。
            // 這裡我們先暫停，讓遊戲能跑起來。如果是 MVP，我們可能先用
            // discordSdk.instanceId 當作唯一 ID，名稱先用 Guest。

            return true;

        } catch (error) {
            console.warn("Discord SDK init failed or not running in Discord:", error);
            this.isRunningInDiscord = false;
            return false;
        }
    }

    getRoomId(): string | null {
        // 使用 instanceId 作為房間 ID，確保同一活動實例的玩家在同一房
        if (this.discordSdk && this.discordSdk.instanceId) {
            return `DC#${this.discordSdk.instanceId}`;
        }
        return null;
    }

    async getUserProfile() {
        if (this.isRunningInDiscord && this.discordSdk) {
            try {
                // 嘗試從參與者列表中獲取自己的資訊
                // 注意：如果沒有後端 Token 交換，我們可能無法準確知道 "我是誰" (沒有 User ID)
                // 但我們可以嘗試獲取列表，看看是否有線索，或者暫時回傳一個帶有 instanceId 的物件

                // 暫時解法：因為沒有後端交換 Token，我們無法獲得穩定的 User ID。
                // 我們使用 instanceId 作為 ID，名稱暫時使用 "Discord Player" 
                // 或是如果未來有後端，這裡可以改為 fetch('/api/discord/user')

                // 嘗試獲取參與者列表 (需要 guild 成員權限)
                // const participants = await this.discordSdk.commands.getInstanceConnectedParticipants();
                // console.log("Participants:", participants);

                return {
                    id: this.discordSdk.instanceId,
                    username: 'Discord Player', // 暫時無法獲取真實暱稱，需後端支援
                    discriminator: '0000',
                    avatar: null
                };
            } catch (e) {
                console.error("Failed to get user profile:", e);
            }

            return {
                id: this.discordSdk.instanceId,
                username: `Discord Player`,
                discriminator: '0000'
            };
        }
        return null;
    }
}

export const discordService = new DiscordService();