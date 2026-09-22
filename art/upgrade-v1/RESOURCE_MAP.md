# 仓鼠资源接入映射

分层：scene-safe（首页桌后坐姿）/ ui-safe（仪表盘、提示、空状态）/ event-only（收杯、短反馈）。

## 已接入首页主场景（scene-safe）

- `art/production-v2/characters/hamster_idle_*` — 坐姿待机
- `hamster_look_button` / `hamster_press` / `hamster_watch` — 收杯看、按、看箱
- `hamster_seated_glad_*` / `hamster_seated_wipe_*` — 坐姿 ending
- `hamster_sleep_*` — 夜间坐姿睡眠
- 不把 `character_wave` / `character_burger` / 站姿全身动作替换主仓鼠

## 已接入仪表盘旁小仓鼠（ui-safe）

- 自动模式：空桌 / 未记录 `character_wave`；今日有记录且低于 80% `character_coffee`；80–99% `character_idle`；≥100% `character_late_night`；夜间且未到 80% `character_idle`
- 自定义模式：`settings.dashboardMascotMode=custom` 时仪表盘一直用 `settings.dashboardMascotId`，不再被摄入状态换掉
- `character_goal` 只留在成就页，不表示咖啡因上限
- 可在「自定义仪表盘」关闭显示

## 已接入互动 / 表情 / 反馈

- 鼠鼠表情页：upgrade-v1 `character_*` 播放一次（不放进咖啡角）
- 记录成功贴纸：`sticker_done` / `sticker_cheer` / `sticker_goal` + `label_success`
- 记录表单：`character_recording`
- 月报页头：`character_monthly`
- 收藏室空状态：`character_coffee`
- 陪伴头像（表情页可选）：`portrait_*`

## App 图标

这是两件事。

- 启动器图标：`icon.png` 打进 APK 的 `res/drawable/icon.png` 和 `assets/icon.png`。安装后的桌面图标走这条。
- 页内品牌标：`index` 顶栏 `.top` 里的 `icon.png`。咖啡角、今日仪表盘、收藏室和月报隐藏整个 `.top`，这些页面看不到顶栏品牌标。记录和设置仍显示顶栏。

## 仍未作为主流程、建议后续位置

- `character_takeaway` / `character_first_cup` — 第一次记录短演出
- `character_burger` — 表情页扩展情绪，勿进首页桌后
- `mascots/state_*` 帧序列 — 可作仪表盘眨眼循环（目前用 upgrade-v1 静帧+点击播放）
- `empty_rest` / `empty_no_coffee` / `empty_first_record` — 日历空日、无照片页
- `sticker_good` / `sticker_sleep` / `sticker_recorded` — 睡眠建议、已记录 toast
- 成就徽章 `achievement_*` — 已在成就页
