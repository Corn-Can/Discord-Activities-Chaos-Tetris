# 📋 《混亂俄羅斯：120秒生存戰》完整開發計畫書

## 🎮 **項目概述**

| 項目 | 內容 |
|------|------|
| **遊戲名稱** | 混亂俄羅斯：120秒生存戰 |
| **平台** | Discord Activity (Web-based) |
| **技術棧** | React + TypeScript + Babylon.js + Socket.io |
| **遊戲類型** | 實時多人俄羅斯方塊混亂競技遊戲 |
| **核心玩法** | 1v1 或 1vN 非對稱競技（Boss vs 玩家們） |
| **遊戲時間** | 固定 120 秒 |
| **勝利判定** | 120秒後分數最高者獲勝 |
| **開發週期** | 7 天 |
| **開發者** | 1 人（全責） |

---

## 🎯 **核心玩法快速說明**

1. **遊戲開始**：玩家選擇 Boss 角色，其餘為普通玩家
2. **獨立遊戲**：每位玩家有自己的 2D 俄羅斯方塊棋盤
3. **分數累積**：消除方塊行獲得分數、解鎖技能卡
4. **技能釋放**：玩家可隨時對 Boss 或被 Boss 攻擊釋放技能
5. **混亂升級**：技能可堆疊，造成畫面亂象
6. **120秒結束**：分數最高的玩家獲勝

---

## 📊 **開發時程規劃（7天）**

```
Day 1: 項目初始化 + Babylon.js 渲染框架
Day 2: Tetris 核心邏輯（本地版）
Day 3: 技能系統 & Modifier 管線
Day 4: WebSocket 多人同步
Day 5: Discord Activity 整合 & UI
Day 6: 本地測試 & 調試
Day 7: 部署 & 最終優化
```

### 詳細時程

| 日期 | 任務 | 交付物 | 風險 |
|------|------|--------|------|
| **Day 1** | 專案初始化、Babylon.js 場景、React 架構 | 可運行的空白遊戲畫面 | 低 |
| **Day 2** | Tetris 邏輯、棋盤渲染、物理計算 | 完整本地單人遊戲 | 中 |
| **Day 3** | 6 種技能實現、Modifier 系統 | 技能演示版本 | 中 |
| **Day 4** | Socket.io 伺服器、同步邏輯、狀態管理 | 雙人本地網路測試 | 高 |
| **Day 5** | Discord SDK 整合、UI 完善、計分板 | 可在 Discord 中運行 | 中 |
| **Day 6** | 多人測試、bug 修復、平衡調整 | 穩定版本 | 中 |
| **Day 7** | 性能優化、部署到 Vercel/Railway | 上線版本 | 低 |

---

## 🏗️ **技術架構圖**

```
┌─────────────────────────────────────────────────────────────┐
│                    Discord Activity (iframe)                 │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              React Frontend (Vercel)                   │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │  │
│  │  │   Game UI    │  │ Babylon.js   │  │  Socket.io  │  │  │
│  │  │  (Score,     │  │  (Tetris     │  │  Client     │  │  │
│  │  │   Players)   │  │   Render)    │  │             │  │  │
│  │  └──────────────┘  └──────────────┘  └─────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↓ (WebSocket)
┌─────────────────────────────────────────────────────────────┐
│              Backend Server (Railway/Render)                 │
│  ┌───────────────────────────────────────────────────────┐  │
│  │         Node.js + Express + Socket.io Server          │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │  │
│  │  │   Game       │  │   Player     │  │  Skill      │  │  │
│  │  │   Manager    │  │   Manager    │  │  Dispatcher │  │  │
│  │  └──────────────┘  └──────────────┘  └─────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 **項目結構**

```
chaos-tetris/
│
├── frontend/                    # React + Babylon.js
│   ├── src/
│   │   ├── components/
│   │   │   ├── GameCanvas.tsx          # Babylon.js 渲染
│   │   │   ├── GameUI.tsx              # UI 層（分數、玩家列表）
│   │   │   ├── LobbyScreen.tsx         # 開始畫面
│   │   │   └── ResultScreen.tsx        # 結果畫面
│   │   ├── services/
│   │   │   ├── SocketService.ts        # WebSocket 連接
│   │   │   ├── GameEngine.ts           # Tetris 核心邏輯
│   │   │   ├── ModifierSystem.ts       # Modifier 管線
│   │   │   └── SkillManager.ts         # 技能系統
│   │   ├── types/
│   │   │   ├── game.ts                 # 遊戲類型定義
│   │   │   ├── skill.ts                # 技能類型定義
│   │   │   └── modifier.ts             # Modifier 類型定義
│   │   ├── App.tsx
│   │   └── index.tsx
│   ├── package.json
│   └── .env.local               # Discord Activity 配置
│
├── backend/                     # Node.js + Express
│   ├── src/
│   │   ├── server.ts            # Express + Socket.io 伺服器
│   │   ├── managers/
│   │   │   ├── GameManager.ts    # 遊戲實例管理
│   │   │   ├── PlayerManager.ts  # 玩家狀態管理
│   │   │   └── SkillDispatcher.ts # 技能分配邏輯
│   │   ├── types/
│   │   │   └── socket.ts         # Socket 事件類型
│   │   └── utils/
│   │       └── logger.ts         # 日誌工具
│   ├── package.json
│   └── .env                     # 伺服器配置
│
└── README.md
```

---

## 🎮 **核心系統設計**

### **1. Tetris 核心邏輯系統**

```typescript
// GameEngine 需實現的功能

class GameEngine {
  board: number[][];           // 棋盤狀態
  currentPiece: TetrisPiece;   // 當前方塊
  nextPiece: TetrisPiece;      // 下一個方塊
  score: number;
  gameTime: number;            // 0-120 秒

  // 基礎操作
  movePiece(direction: 'left' | 'right' | 'down') {}
  rotatePiece() {}
  dropPiece() {}

  // 棋盤邏輯
  clearLines(): number {}       // 消行計算
  spawnNewPiece() {}
  checkGameOver(): boolean {}

  // Modifier 集成
  applyModifiers() {}           // 套用所有 Modifier
}
```

**關鍵參數：**
- 棋盤大小：10×20（標準俄羅斯方塊）
- 下落速度：初始 0.5 秒/格，可被技能修改
- 旋轉邏輯：支援 SRS+（Tetris 旋轉系統）

---

### **2. Modifier 系統（技能基礎層）**

```typescript
// Modifier 定義（所有技能都基於此）

interface Modifier {
  id: string;
  name: string;
  duration: number;           // 秒數（-1 = 永久）
  targetPlayer: string;       // 目標玩家 ID
  appliedAt: number;          // 套用時間戳
  
  // 套用邏輯
  apply(gameEngine: GameEngine) {}
  
  // 移除邏輯
  remove(gameEngine: GameEngine) {}
  
  // 更新邏輯（每幀調用）
  update(deltaTime: number) {}
}

class ModifierPipeline {
  modifiers: Modifier[] = [];
  
  add(modifier: Modifier) {}
  remove(modifierId: string) {}
  applyToValue(key: string, baseValue: any): any {}
  update(deltaTime: number) {}
}
```

**技能堆疊規則：**
- 多個 Modifier 同時存在時，按照 **FIFO 順序** 套用
- 顛倒類技能：相同技能疊加時相消
- 速度類技能：倍數相乘
- 色彩類技能：疊加時變更快

---

### **3. 技能系統（6 大技能）**

| 技能 ID | 技能名 | 持續時間 | 效果 | Modifier 類型 |
|---------|--------|--------|------|--------------|
| `reverse_v` | 上下顛倒 | 8s | 顯示翻轉 + 操作反向 | DisplayModifier |
| `reverse_h` | 左右顛倒 | 8s | 左右翻轉 + 操作反向 | DisplayModifier |
| `dig_hole` | 挖洞 | 一次性 | 隨機挖 4 個洞 | BoardModifier |
| `color_flash` | 色盲 | 20s | 顏色 0.5 秒換一次 | ColorModifier |
| `jump_board` | 彈跳模式 | 10s | 棋盤每 0.8s 跳動 | AnimationModifier |
| `speed_boost` | 肥宅快樂水 | 10s | 下落速度 ×2 | SpeedModifier |

---

### **4. 分數 & 技能獲取系統**

**分數門檻：**
消行隨機獲得


**落後補償：**
- 若玩家 15 秒未達到下一分數門檻 → 自動給 1 張技能卡
- 防止某位玩家過於落後

**技能卡機制：**
- 技能卡隨機抽取（可設定概率）
- 玩家最多同時持有 3 張
- 持有滿 3 張時新技能卡不會取代舊的，忽略新的

---

### **5. WebSocket 同步系統**

**事件清單：**

```typescript
// 客户端 → 伺服器
socket.emit('game:join', { playerId, playerName })
socket.emit('game:move', { direction, timestamp })
socket.emit('game:rotate', { timestamp })
socket.emit('skill:cast', { skillId, targetPlayerId })
socket.emit('game:state', { score, board, currentPiece })

// 伺服器 → 客户端
socket.on('game:start', { gameId, boss, players })
socket.on('player:joined', { player })
socket.on('player:state', { playerId, score, board })
socket.on('skill:applied', { skillId, targetPlayerId, duration })
socket.on('game:end', { winner, scores })
socket.on('tick', { timestamp })             // 伺服器心跳
```

**同步頻率：**
- 遊戲狀態：每 50ms（20Hz）
- 玩家操作：實時
- 技能釋放：實時

---

## 💻 **開發詳細步驟**

### **Day 1：項目初始化**

```bash
# 前端初始化
npx create-react-app chaos-tetris-frontend --template typescript
cd chaos-tetris-frontend
npm install babylon @babylonjs/core socket.io-client
npm install -D tailwindcss

# 後端初始化
mkdir chaos-tetris-backend
cd chaos-tetris-backend
npm init -y
npm install express socket.io cors dotenv
npm install -D typescript ts-node @types/node
```

**Day 1 交付物：**
- ✅ Babylon.js 基本場景（黑色背景）
- ✅ React 頁面框架
- ✅ Socket.io 連接測試

---

### **Day 2：Tetris 核心邏輯**

**實現優先順序：**
1. 棋盤初始化 & 渲染（Babylon.js Canvas）
2. 7 種方塊定義 & 生成
3. 鍵盤控制（← → ↑ ↓ 空白鍵）
4. 碰撞檢測 & 消行邏輯
5. 分數計算

**Day 2 交付物：**
- ✅ 完整本地單人遊戲
- ✅ 120 秒倒數計時
- ✅ 分數系統

---

### **Day 3：技能 & Modifier 系統**

**實現優先順序：**
1. ModifierPipeline 基礎架構
2. 6 種 Modifier 實現
3. 技能卡 UI & 釋放邏輯
4. 技能堆疊規則測試
5. 落後補償邏輯

**Day 3 交付物：**
- ✅ 可在本地演示所有 6 種技能
- ✅ 技能堆疊測試通過

---

### **Day 4：多人同步**

**實現優先順序：**
1. Express 伺服器 + Socket.io 基礎設置
2. 遊戲房間管理 & 玩家配對
3. 遊戲狀態同步邏輯
4. 技能釋放與應用的同步
5. 計分板實時更新

**Day 4 交付物：**
- ✅ 兩個瀏覽器標籤可進行本地網路遊戲
- ✅ 分數與狀態同步成功

---

### **Day 5：Discord 整合 & UI**

**實現優先順序：**
1. Discord Embedded App SDK 整合
2. 計分板美化 & 玩家顯示
3. 遊戲結束畫面 & 排名
4. Lobby 篩選（房間列表、創建房間）
5. 聲音效果 & 視覺反饋

**Day 5 交付物：**
- ✅ 可在 Discord Activity 沙盒中運行

---

### **Day 6-7：測試、最佳化、部署**

**測試清單：**
- [ ] 單人遊戲完整流程
- [ ] 雙人/多人同步無延遲
- [ ] 所有技能正確應用
- [ ] 100+ 秒無 memory leak
- [ ] 手機與桌面相容性

**部署：**
- 前端：Vercel
- 後端：Railway 或 Render
- Discord 活動配置

---

## 🔧 **API 介面設計**

### **前端 API（GameEngine）**

```typescript
class GameEngine {
  // 初始化
  init(boardWidth: number, boardHeight: number)
  start()
  pause()
  resume()
  end()

  // 操作
  moveLeft()
  moveRight()
  moveDown()
  rotate()
  hardDrop()

  // 查詢
  getState(): GameState
  getScore(): number
  getBoard(): number[][]
  getCurrentPiece(): TetrisPiece

  // Modifier 集成
  applyModifier(modifier: Modifier)
  removeModifier(modifierId: string)
}
```

### **後端 Socket 事件**

```typescript
// 伺服器需要監聽的事件
io.on('connection', (socket) => {
  socket.on('join', (data) => {})
  socket.on('move', (data) => {})
  socket.on('skill:cast', (data) => {})
  socket.on('state', (data) => {})
})

// 伺服器廣播給客户端
socket.emit('sync', gameState)
socket.emit('skill:hit', { skillId, targetId })
socket.emit('gameEnd', { results })
```

---

## 📊 **平衡性設計**

### **技能概率分佈**

```
稀有度    技能             概率
────────────────────────
普通      速度提升        30%
普通      挖洞           25%
普通      上下顛倒       20%
稀有      左右顛倒       15%
稀有      彈跳模式       7%
傳說      色盲           3%
```

### **難度調整參數**

```typescript
const BALANCE = {
  // 分數門檻
  SCORE_THRESHOLDS: [50, 120, 220, 350],
  
  // 技能概率
  SKILL_PROBABILITIES: { ... },
  
  // 時間設定
  GAME_DURATION: 120,
  CATCH_UP_INTERVAL: 15,  // 落後補償間隔
  
  // 棋盤設定
  BOARD_WIDTH: 10,
  BOARD_HEIGHT: 20,
  INITIAL_DROP_SPEED: 0.5,
  
  // 修改此參數即可調整難度
}
```

---

## 🚀 **部署指南**

### **前端部署（Vercel）**

```bash
cd frontend
npm run build
vercel deploy
```

### **後端部署（Railway）**

```bash
cd backend
# 連接 Railway CLI
railway link
railway up
```

### **Discord Activity 配置**

1. 在 Discord Developer Portal 創建應用
2. 設定 Activity URL：`https://your-domain.vercel.app`
3. 配置 OAuth2 權限
4. 在伺服器內測試

---

## 📈 **性能指標**

| 指標 | 目標 | 優化方案 |
|------|------|--------|
| 首屏加載 | < 3s | 代碼分割、CDN |
| FPS | 60 FPS | Babylon.js 優化、物件池 |
| 延遲 | < 100ms | WebSocket 優化、狀態壓縮 |
| 記憶體 | < 100MB | 及時清理、物件回收 |

---

## ⚠️ **風險評估與應對**

| 風險 | 機率 | 應對方案 |
|------|------|--------|
| WebSocket 同步延遲 | 中 | 使用差分更新、客户端預測 |
| Babylon.js 性能不足 | 低 | 降低圖形細節、用 Canvas 2D |
| 一週內完不成 | 中 | 優先完成本地版、延後多人 |
| Discord API 限制 | 低 | 預先測試、準備備選方案 |

---

## ✅ **驗收標準**

**MVP（最小可行產品）：**
- ✅ 本地單人遊戲可完整進行 120 秒
- ✅ 所有 6 種技能可正確應用
- ✅ 分數與技能卡系統運作正常

**Beta（雙人版）：**
- ✅ 兩位玩家可透過 WebSocket 同步遊戲
- ✅ 無明顯延遲或不同步

**Release（多人版）：**
- ✅ 3+ 玩家可同時遊戲
- ✅ Discord Activity 中可成功運行
- ✅ 無 memory leak（120 秒內）

---

## 📞 **常見問題預設**

**Q：為什麼不用 Unity？**
A：一個人 7 天內完成 Unity → WebGL 轉換、同步邏輯、部署過於複雜。React + Babylon.js 更輕量、部署更快。

**Q：後端可以用無伺服器架構嗎（如 Firebase）？**
A：可以，但 Socket.io 需要長連接，無伺服器不適合。Railway 或 Render 更好。

**Q：如何測試多人？**
A：使用多個瀏覽器標籤或邀請朋友一起在本地網路測試。

**Q：遊戲支援行動端嗎？**
A：支援（React 響應式），但推薦桌面版體驗最佳。

---

## 📚 **資源清單**

| 資源 | 連結 |
|------|------|
| Babylon.js 文檔 | https://doc.babylonjs.com |
| React 文檔 | https://react.dev |
| Socket.io 文檔 | https://socket.io/docs |
| Discord SDK | https://discord.com/developers/docs/activities/overview |
| Vercel 部署 | https://vercel.com/docs |

---

## 🎯 **下一步行動**

1. **確認技術棧** ✅（已選擇 React + Babylon.js）
2. **建立 Git 倉庫** → 推薦用 GitHub
3. **Day 1 開始開發** → 按照時程進行
4. **每日檢查點** → 確保進度符合預期

---

**祝開發順利！如有任何技術問題，我隨時準備幫你解決。🚀**