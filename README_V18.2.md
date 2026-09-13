# Beanster Sips V18.2

## 本轮交付

- 首页自动角色按进入时段选择：0–6 点待机、6–9 点挥手、9–12 点手持咖啡、12–14 点汉堡、14–18 点外带、18 点以后待机；22–6 点默认困倦头像。停留期间不会定时突然换角色。手动固定角色与头像优先。
- 开心头像用于保存成功，兴奋头像用于新成就解锁，平静/困倦用于日常时段。表情馆可直接选择四种头像作为陪伴头像，也可恢复随时段选择。
- 记录表单使用记录中角色，月报使用月报统计角色，成就页使用达成目标角色。同屏全局单动画，进入播放一次、点击重播，支持系统减少动态效果。
- Android 原生 `onBackPressed` 通过 WebView 调用 `window.AppNav.back()`：优先退出最上层预览/弹窗，表单有修改时提供继续编辑或放弃，日期详情返回原月报，其他栏目返回首页，只有首页根层允许退到桌面。没有添加会与滚动冲突的全屏滑动监听。本轮未实现系统预测性返回的过渡预览动画。
- 十杯小记、三十杯回忆、第一张照片、照片日记使用四张独立透明徽章；第一杯保留原图。ID、解锁规则与既有记录保持兼容；未解锁时使用对应图案的灰色显示。
- 本地 OCR 引擎、字库和 `ocr_reader.js` 保持 V18.1 的已交付实现；用户已反馈 V18.1 在手机内可以读出文字。

## 验证

- `tests/test_v182.cjs`：8 组导航与场景表情回归，包括嵌套弹窗、照片返回表单、未保存保护、实际保存触发开心/兴奋、时段选择稳定性和五个不同徽章映射。
- `tests/test_v181.cjs`：12 组既有动效、OCR 调度、文本、备份与原图回归。
- `tests/test_upgrade_package.py`：安装包内容与本次源码、100 项透明素材和原生 DEX 一致。
- `verify_dex.py`：从 APK 中解码实际原生返回与 OCR 桥接调用。
- 使用原 keystore 签名并通过 Google apksig 验签，证书保持 `84:D4:A0:DD:47:06:4B:81:94:44:13:1B:F3:44:D2:D5:C8:B6:E7:91:A2:26:52:DE:59:3C:E4:74:49:7A:70:18`。

本次没有连接 Android 手机；系统边缘返回手势、覆盖安装及 V18.2 的实机回归仍需用户安装确认，以上自动化不冒充手机验收。

## 美术来源与导出

使用内置 imagegen 生成；最终原图保存在 `art/upgrade-v1/source-atlases/v182/`，运行时 2× 图在 `art/upgrade-v1/png/achievements/`，并提供 1×/3× 导出。`tools/install_v182_badges.py` 可从已保存原图重新导出并检查 alpha。

最终提示词组合：

- cups10 / cups30：Create ONE standalone transparent PNG achievement badge for Beanster Sips. Reference image is STYLE ONLY: warm gold/brown chunky pixel-art outline, ornate gold rim and red ribbon. New central subject: small coffee journal with coffee cup and large readable number 10 / calendar with coffee stains and large readable number 30. Do NOT reuse hamster or number 1 from reference. Square canvas, badge centered fully visible with 8% transparent margins, truly transparent alpha background, no shadows outside badge, no Chinese text. Clear recognizable silhouette at 80px app size.
- photo1 / photo10：TRANSPARENT BACKGROUND PNG, real alpha channel required. Edit the supplied transparent badge: KEEP the existing exterior transparent pixels and silhouette. Replace ONLY the hamster and number 1 inside the badge with a vintage camera ejecting ONE coffee photograph / an open photo album containing FOUR coffee photographs. Keep the pixel-art golden border and red ribbon. NO text or numbers. All exterior pixels MUST remain transparent alpha=0. Do not draw a checkerboard, colored background, or cast shadow. This is an app icon that overlays arbitrary backgrounds.

不满足真实透明要求的中间稿未进入安装包。

APK SHA-256: 5155472aaf76cffa28e47469dfa74d21db5de8bb0d02b404533d89d297f8e0d8
