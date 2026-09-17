# Beanster Sips 独立素材包 v2

本包交付独立 PNG、坐标协议与可运行的验收页。**还未替换 V19.3 APK 内的首页**。运行 `preview.html` 可直接检查，不需要联网或构建。预览数据是独立演示记录。

## 五组核心交付

| 组 | 文件 | 约定 |
|---|---|---|
| 无杯收杯 | `characters/hamster_cleanup_01.png` 至 `12.png` | 512×512；脚底 pivot=(256,472)；每帧手部 cupAnchor；角色图内无杯 |
| 桌前待机 | `hamster_idle_base.png`、`hamster_idle_01.png` 至 `15.png` | 512×512；双手桌沿接触 pivot=(256,448)；沿用用户原画拆帧，末尾含回到待机的复用帧 |
| 首页分层 | `scene_background`、`window_day/night`、`lamp`、`plant`、`chair`、`table_back/front`、阴影 | 坐标与 zIndex 见 manifest；日夜窗口只换玻璃内像素；桌前后层可以精确重组 |
| 收藏室分层 | `storage_empty`、`storage_front_mask`、`box_lid/body/front`、盒子状态、入口状态与 glow | 空架每行 4 个槽位，纵向重复；任何咖啡杯都由记录动态插入 |
| 单杯 | `cups/cup_*.png` 共 12 个 | 256×256；bottomCenter=(128,224)；可见高度统一184像素；无品牌文字、角色、桌子 |

其他已交付：5 个底栏图标各 default / selected / pressed / disabled 四态；3 种无文字按钮各三态；仪表盘轮廓三色状态、填充遮罩、刻度；蒸汽、爱心、闪光各5帧透明叠加层。UI 状态与仪表盘为代码绘制的像素 UI，角色及场景是绘制/拆分的位图资源。

## 接入规则

以 `asset_manifest.json` 为唯一坐标来源。每个资源包含 `file / canvas / pivotX / pivotY / zIndex / sha256`。像素坐标原点为画布左上角。禁止逐帧按外接框重新居中或自动改变缩放。

```js
// 给定角色世界坐标、缩放，得到当前手部锚点。
const handX = characterX + (frame.cupAnchorX - frame.pivotX) * scale;
const handY = characterY + (frame.cupAnchorY - frame.pivotY) * scale;
// 把杯底中心绑定到手部；杯子用自己的尺寸与 pivot。
draw(cupImage, handX - cup.pivotX * cupScale,
               handY - cup.pivotY * cupScale);
```

`cupAttached` 为 false 的预备/伸手/结束帧，**不能**把杯子悬挂在手部坐标。抓取前杯子在 `table.slots`；抓取后按 `cupAttached` 绑定；release 阶段移到盒内 `receiveAnchor`。标定图 `qa/cup-anchor-calibration.png` 只在绑定阶段叠加示例杯，红十字表示该帧手部锚点。

动画顺序必须读取 `animations.*.frames`，不能按文件名排序。第5帧是第3帧到第4帧之间的伸手中间姿势。cleanup 共12帧，8fps，1.5秒；quickTransfer 共5帧，10fps，0.5秒；idle 共16帧，8fps，2秒。默认进入一次或点击一次，不能常驻循环。蒸汽的 loop 标志也受全局唯一动画播放器控制。

桌面布局读取 `table.slots['1'..'4']`；超过4条只展示4杯，另显示“更多”。一条饮用记录占一个槽，不按饮品名去重。收藏架记录超过一行时动态复制空架与前景遮挡层，不能把真实杯子合成进架子图片。

盒内绘制顺序：`box_lid → box_body → liveCup → box_front`。closed 使用独立闭合盖。opening / close 是同一中间角度的正放和反放；receiving 与 open 的空盒画面相同，变化来自真实杯子进入。禁止把 `box_open` 整图画到杯子前方，否则会盖住整只杯。

桌面绘制顺序：背景 / 窗 / 灯 / 植物 / 椅子 / table_back / 仓鼠 / 杯影 / 杯子 / table_front。帧内 `bodyCenter` 是登记坐标，不是重新检测后的脸部中心；收杯走位在外层改变世界坐标，不能改帧内 pivot。

## 数据与动画分离

保存记录时立即写入现有 records，收藏室立即可读；不等动画。次日收杯只使用上次可见桌面的旧记录 ID 快照，排除今天记录。补记旧日期直接进收藏室。第一次启动收杯时先持久化已消费标记；跳过、退后台、崩溃、几天未启动都不能造成重复收杯或删除记录。前后台、页面切换、减少动态效果设置都应停止播放器并落到静止状态。

验收页演示了独立记录、0/1/4/7 杯桌面、日夜切换、手部锚点、单杯收纳、跳过和单独的快速动作。它不是 App 的数据迁移或完整多杯仪式实现，接入正式 App 时应沿用现有 CoffeeRoom 的记录来源和快照逻辑。

## 已验证与后续

- `tests/test_production_assets.py`：PNG alpha、哈希、画布、pivot、杯底、脚底对齐、帧引用、桌面及盒子分层无损重构。
- `tests/test_production_preview.cjs`：全部素材加载，0/1/4/7条记录、即时收藏、仅昨天收杯、跳过不丢数据、减少动态效果、390像素宽度及无运行错误。
- `qa/`：浅底动作检查、手部标定、日夜/不同杯数场景截图。截图只是验收附件，不是运行素材。
- 手部锚点已人工标定，仍需正式 App 最终缩放下的触屏与视觉验收；未进行新 APK 真机验证。
- 后续 P1：独立睡眠姿势及 Zzz/毯子、拍拍手/擦汗结束动作、更细的手指前景遮挡、额外冷凝水/汗滴/问号序列。P2 汉堡、季节装饰和收藏室奖牌未扩展。

## 来源与复现

使用内置 image_gen 逐资产补绘，未生成新大合集。最终提示词见 `generation_log.json`、`scene_generation_log.json`、`state_generation_log.json`；第5帧最终修订见 `revision_log.json`。`source/` 保存采用的原始图；初次偏离角色的试稿未采用。已有用户表情直接拆分；杯子9款、桌子、空架沿用项目图，另外补齐3个杯型。

仓库根目录运行 `python tools/build_production_assets.py` 重建标准 PNG 和 manifest；生成日志记录创作来源，不是构建时的外部文件依赖。构建器使用本包的 source 和项目中原有素材。`asset_manifest.js` 是 JSON 的同内容镜像，方便 file:// 本地预览。
