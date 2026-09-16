# Beanster Sips V19.3

- 首页仓鼠较上一轮预览缩小约 24%，固定双手与桌沿的接触位置；320、390、480 像素视口均检查通过。
- 直接使用用户提供的两张透明素材，保留原文件像素：8 帧坐姿表情、18 帧挥手/指路/举杯动作。通过 alpha 轮廓生成裁切元数据，避免相邻帧串入和手部截断。
- 首次进入播放一次挥手，之后点击依次播放表情、指路、举杯、挥手。结束恢复静止；与其他动画共用播放控制，支持减少动态效果设置。
- 咖啡角与仪表盘双屏结构、收藏室和原生识别模块保持兼容。

## 验证

通过 tests/test_v192.cjs、tests/test_v193.cjs、tests/test_upgrade_package.py 和 verify_dex.py；浏览器预览见 qa/v193。未进行手机真机安装验证。

APK：Beanster-Sips-V19.3.apk，versionCode 52。
SHA-256：eace41233a0e7cb1ea56f776cd86fd3a55114d463250291d02ff3c0ec66dfcbe
签名证书 SHA-256：84d4a0dd47064b819444131bf344d2d5c8b6e791a22652de593ce474497a7018

## 素材来源

用户提供的 codex-clipboard-feed909f-0250-471c-a9f8-d16202be2e14.png 与 codex-clipboard-047d66ff-7b65-4285-8921-41b832340a59.png，分别保存为 art/coffee-room/seated-expressions-user.png 与 seated-actions-user.png。tools/analyze_seated_atlas.py 只分析透明度并输出 seated_clips.js，不修改源图片。
