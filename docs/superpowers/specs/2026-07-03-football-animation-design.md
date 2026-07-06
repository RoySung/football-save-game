# 足球遊戲角色動畫設計規格書 (Football Save Character Animation Design Spec)

本文件定義了射門員（Striker）與守門員（Goalkeeper）的動畫美術素材規格、生成 Prompt 以及在 Phaser 中的實作邏輯。

---

## 1. 美術素材規格與生成 Prompt

為了配合遊戲現有的畫風調整，我們採用**粗描邊扁平插畫風**。角色將以 `1 列 3 欄 (1x3 grid)` 的 Spritesheet 形式生成，尺寸為 `1024x1024` 像素（每個 Frame 寬 `341px`，高 `1024px`），並使用透明背景 PNG。

### 1.1 射門員 (Striker)
* **檔案名稱**：`/public/assets/striker_sheet.png`
* **動作影格 (Frames)**：
  * **Frame 0**: 站立 Idle（正面站立，預備射門的 Idle 姿態）。
  * **Frame 1**: Right Shot（向右側擊球，右腿擺起擊球，身體微向左傾）。
  * **Frame 2**: Left Shot（向左側擊球，左腿擺起擊球，身體微向右傾）。
* **生成 Prompt**：
  > `A character spritesheet of a cute boy soccer player, 1 row and 3 columns grid, flat vector illustration style, thick black outlines, simple shapes, flat color fill, no gradients, no shadows. Row of 3 poses: 1. Standing idle facing forward, wearing a blue soccer jersey with white shorts. 2. Kicking a soccer ball to the right. 3. Kicking a soccer ball to the left. Isolated on a clean solid white background, game asset, cute chibi art style, design by Chen Junxian --ar 1:1 --v 6.0`

### 1.2 守門員 (Goalkeeper)
* **檔案名稱**：`/public/assets/goalkeeper_sheet.png`
* **動作影格 (Frames)**：
  * **Frame 0**: 守備 Idle（背對鏡頭，雙臂張開準備撲球的 Idle 姿態）。
  * **Frame 1**: Right Diving（向右側飛撲，身體向右側傾斜）。
  * **Frame 2**: Left Diving（向左側飛撲，身體向左側傾斜）。
* **生成 Prompt**：
  > `A character spritesheet of a cute boy soccer goalkeeper seen from behind (back view), 1 row and 3 columns grid, flat vector illustration style, thick black outlines, simple shapes, flat color fill, no gradients, no shadows. Row of 3 poses: 1. Standing ready with open arms in the center, wearing a yellow goalkeeper jersey with black shorts. 2. Diving and leaning to the right. 3. Diving and leaning to the left. Isolated on a clean solid white background, game asset, cute chibi art style, design by Chen Junxian --ar 1:1 --v 6.0`

---

## 2. Phaser 動畫註冊與載入

### 2.1 載入設計
在 `/src/game/BootScene.ts` 中，使用 `this.load.spritesheet` 原生載入透明背景素材，不需額外進行 runtime 的 Canvas 像素去背：
```typescript
this.load.spritesheet('striker_sheet', '/assets/striker_sheet.png', { frameWidth: 341, frameHeight: 1024 });
this.load.spritesheet('goalkeeper_sheet', '/assets/goalkeeper_sheet.png', { frameWidth: 341, frameHeight: 1024 });
```

### 2.2 註冊動畫
在 `/src/game/MainGame.ts` 或動畫初始化方法中註冊以下狀態：
* **Kicker Animations**:
  * `kicker-idle`: 只播放 Frame 0。
  * `kicker-kick-right`: 播放 Frame 0 -> 1，持續約 200-300 毫秒，踢出後回到 Frame 0。
  * `kicker-kick-left`: 播放 Frame 0 -> 2，持續約 200-300 毫秒，踢出後回到 Frame 0。
* **Goalkeeper Animations**:
  * `gk-idle`: 循環播放 Frame 0。
  * `gk-dive-right`: 播放 Frame 1 (搭配向右位移的 Tween)，隨後回到 Frame 0。
  * `gk-dive-left`: 播放 Frame 2 (搭配向左位移的 Tween)，隨後回到 Frame 0。

---

## 3. 遊戲核心時序與邏輯

### 3.1 射門判定與動畫時序
每次定時器觸發射門時：
1. 計算足球飛向的最終目標位置 `targetX`。
2. 根據 `targetX` 與螢幕寬度中線（`width / 2`）的關係決定射門方向：
   * 若 `targetX >= width / 2`，播放 `kicker-kick-right` 動畫。
   * 若 `targetX < width / 2`，播放 `kicker-kick-left` 動畫。
3. 監聽 `animationupdate` 或利用短暫延遲（約 150-200ms 擺腿擊中球的瞬間），在該瞬間**正式產生足球物件**並開始其貝茲曲線的飛行 Tween。
4. 射門動作播完後，射門員恢復播放 `kicker-idle`。

### 3.2 守門員撲救與動畫時序
當足球飛入防守區域（Save Zone）且玩家成功點擊足球時：
1. 立即停止足球的飛行動畫，計算球被點擊時的 `football.x`。
2. 依據 `football.x` 與守門員當前中心點 `goalkeeper.x` 的關係進行方向判定：
   * **球偏右** (`football.x > goalkeeper.x + threshold`)：
     * 守門員切換至動畫 `gk-dive-right`。
     * 同步啟動一個 Tween，將守門員向右下方平滑位移並稍微旋轉，隨後位移回到原點。
   * **球偏左** (`football.x < goalkeeper.x - threshold`)：
     * 守門員切換至動畫 `gk-dive-left`。
     * 同步啟動一個 Tween，將守門員向左下方平滑位移並稍微旋轉，隨後回到原點。
   * **球在正中間**：
     * 守門員保持播放 `gk-idle`。
     * 啟動一個 Tween，讓守門員往上方小幅彈跳（Jump），隨後落回原點。
3. 撲救動畫與 Tween 完成後，將守門員狀態恢復為 `gk-idle`。

---

## 4. 驗證與測試計畫

### 4.1 靜態載入測試
* 確認兩張 Spritesheet PNG 能夠在啟動時無報錯載入。
* 檢查透明背景的去背完整性，確保邊緣乾淨無白邊。

### 4.2 動畫與時序驗證
* 射門時，確認球是從射門員「擺腿觸球的瞬間」飛出，而非動作開始前就飛出。
* 射門方向與球飛向的方向一致（踢右邊球飛向右邊，踢左邊球飛向左邊）。
* 撲救成功時，確認守門員向正確方向做飛撲位移並切換影格，撲救結束後能正確返回預備姿勢。
