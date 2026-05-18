# Samureye Agent Roles v3

> 版本：v3.0  
> 用途：給不同 Codex 對話框作為角色工作規範。  
> 原則：最小可用，不依賴尚未建立的文件。

## 使用方式

目前每個 Agent 開始工作前，只需要閱讀：

1. `Samureye_Game_Style_Guide.md`：遊戲風格最高依據
2. 對應的 `ROLE_*.md`：該 Agent 的工作邊界與限制

注意：`README.md`只是本資料包的使用說明，**不是**遊戲風格指南。

不要要求 Agent 閱讀目前不存在的文件。  
不要要求 Agent 自動假設專案已有其他規則檔。

## 目前建議角色

1. `ROLE_PROJECT_LEAD_AGENT.md`  
   專案總管，負責拆任務、判斷該交給哪個 Agent、控管風險，不主動大量改程式。

2. `ROLE_GAMEPLAY_BATTLE_FLOW_AGENT.md`  
   負責戰鬥流程、砍怪流程、勝敗判定、角色升級與戰鬥狀態。

3. `ROLE_UI_ANIMATION_AGENT.md`  
   負責首頁、按鈕、霧化效果、勝敗畫面、動畫、畫面層級與遊戲文案呈現。

4. `ROLE_NETWORK_GAMECENTER_AGENT.md`  
   負責 Game Center、即時對戰、配對、同步、斷線與多人狀態一致性。

5. `ROLE_DATA_FIREBASE_QUESTION_AGENT.md`  
   負責題目資料、充能系統、Firebase、玩家資料、題庫分類與資料儲存。

6. `ROLE_TESTER_AGENT.md`  
   負責重現 bug、測試清單、風險分析。原則上不直接修改正式程式碼。

## 核心方向提醒

Samureye 不是國考題庫 App。  
Samureye 是「眼睛滋事型動作養成遊戲」。

題目不是主舞台。  
題目是充能燃料。

開發時優先考慮：

- 看起來像遊戲，不像補習班
- 砍怪、升級、換裝、對戰是核心
- 題目不能阻礙玩家玩遊戲
- 一般玩家能玩，視光人看得懂梗
- 文案不要太正式、太 AI、太教育
- 最小修改，避免修 A 壞 B

## 建議工作流程

不確定任務要交給誰時，先問 Project Lead Agent。  
需要實作時，再交給對應 Agent。  
高風險功能一次只交給一個 Agent 修改。

建議分支方式：

```text
main = 穩定版
develop = 整合測試版
fix/xxx = 修 bug 任務
feature/xxx = 新功能任務
docs/xxx = 文件任務
test/xxx = 測試任務
```

不要讓 Codex 直接修改 `main`。  
每個任務分支原則上只給一個主要 Agent 負責。
