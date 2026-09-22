# Beanster Sips V19.5.1 · 咖啡角视觉回归

在 V19.5（恢复仪表盘仓鼠、启动器图标、坐姿收杯）之上，清掉首页叠了两套入口和待机漂浮。版本名 `19.5.1`，versionCode `55`。

## 咖啡角

- 收藏室只留全景木牌上的「收藏室 →」。`.cc-room-sign` 是盖在木牌上的透明点击热区，不再画第二块棕色按钮。场景左上角不再写「仓鼠咖啡角」，页签仍用这个名字。
- 坐姿仓鼠根节点 Y 固定在 `scene.idle.position`。待机循环只换眨眼帧，不再上下漂。
- 待机不画收藏盒。收杯从开盖才出现盒子，合上并停住之后消失。
- `scene_room_day` / `scene_room_night` 已含右侧藤蔓和墙面海报。用这两张全景时不再叠 `ivy_hanging` 和地板黑板架。没有全景、退回旧分层背景时，这两层仍会画。

## 仪表盘仓鼠

- 有记录且低于 80%：`character_coffee`
- 80–99%：`character_idle`（放下杯子，轻提醒）
- ≥100%：`character_late_night`
- 夜间且未到 80%：`character_idle`
- 空桌：`character_wave`
- `character_goal` 留在成就页，不表示快到咖啡因上限。

## 两个图标

- 启动器图标：`build_v5.py` 把 `icon.png` 写入 `res/drawable/icon.png` 和 `assets/icon.png`。这是安装后的桌面图标。
- 页内品牌标：顶栏 `.top` 里的同一张图。咖啡角和今日仪表盘隐藏整个顶栏，所以首页内部不显示这块品牌标。这不是启动器图标没打进去。

## 验证

- `tests/test_v1951.cjs`：只有一个收藏室入口、待机 Y 固定、待机不画盒子、全景不叠藤蔓和黑板、仪表盘 80% / 100% 表情。
- 既有 `tests/test_v194.cjs` 仍覆盖分层场景、独立杯子和收杯数据。

APK：`Beanster-Sips-V19.5.1.apk`，Android v3 签名与原证书一致。
SHA-256：`44fc2c3ebafd36f5e76d184006a53b6aa648ff7bae9c11292412f385a1bde12c`

未进行 Android 真机安装验证。版本代码 55，包名与签名不变。
