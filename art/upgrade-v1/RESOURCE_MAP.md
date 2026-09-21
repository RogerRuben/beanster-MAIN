# 仓鼠资源接入映射

分层：scene-safe（首页桌后坐姿）/ ui-safe（仪表盘、提示、空状态）/ event-only（收杯、短反馈）。

## 已接入首页主场景（scene-safe）

- `art/production-v2/characters/hamster_idle_*` — 坐姿待机
- `hamster_look_button` / `hamster_press` / `hamster_watch` — 收杯看、按、看箱
- `hamster_seated_glad_*` / `hamster_seated_wipe_*` — 坐姿 ending
- `hamster_sleep_*` — 夜间坐姿睡眠
- 不把 `character_wave` / `character_burger` / 站姿全身动作替换主仓鼠

## 已接入仪表盘旁小仓鼠（ui-safe）

- 空桌 / 未记录：`character_wave`
- 今日有记录且未接近上限：`character_coffee`
- 接近日上限（≥80%）：`character_goal`
- 已超上限：`character_late_night`
- 夜间：`character_idle`
- 可在「自定义仪表盘」关闭显示

## 已接入互动 / 表情 / 反馈

- 鼠鼠表情页：upgrade-v1 `character_*` 播放一次（不放进咖啡角）
- 记录成功贴纸：`sticker_done` / `sticker_cheer` / `sticker_goal` + `label_success`
- 记录表单：`character_recording`
- 月报页头：`character_monthly`
- 收藏室空状态：`character_coffee`
- 陪伴头像（表情页可选）：`portrait_*`

## App 图标

- `icon.png` — 启动器、关于页、顶栏品牌标、favicon
- 打进 APK：`res/drawable/icon.png` 与 `assets/icon.png`

## 仍未作为主流程、建议后续位置

- `character_takeaway` / `character_first_cup` — 第一次记录短演出
- `character_burger` — 表情页扩展情绪，勿进首页桌后
- `mascots/state_*` 帧序列 — 可作仪表盘眨眼循环（目前用 upgrade-v1 静帧+点击播放）
- `empty_rest` / `empty_no_coffee` / `empty_first_record` — 日历空日、无照片页
- `sticker_good` / `sticker_sleep` / `sticker_recorded` — 睡眠建议、已记录 toast
- 成就徽章 `achievement_*` — 已在成就页
