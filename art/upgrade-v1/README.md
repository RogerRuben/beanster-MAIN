# Beanster Sips 升级美术资源 v1

依据用户提供的 UI 设计图与美术资源参考板，通过内置 ImageGen 提取式重绘，再切分、去除中间底色、输出透明素材。原参考板并非原生透明分层文件，因此本包是尽量忠于参考的重绘资产，不是无损提取原画。

## 查看与交付

双击 `preview.html` 即可离线查看；支持素材搜索、分类、GIF/WebP/PNG 切换和深浅背景检查。

- `png/<分类>/`：每项 128、256、384 px，分别为 `@1x`、`@2x`、`@3x`。均为真实 RGBA PNG，画布四周透明。标签和贴纸仅保留其自身气泡/轮廓内的底色，外部透明。
- `gif/`：所有角色、四种表情、六种状态贴纸、四种空状态、三种提示标签的透明循环 GIF。
- `webp/`：对应的无损动态 WebP，保留柔和 Alpha，适合深色界面。
- `sprites/`：水平 PNG spritesheet，每帧 256 × 256。
- `frames/<ID>/`：逐帧透明 PNG。
- `manifest.json` / `manifest.js`：稳定 ID、中文名、文件路径、来源裁切坐标、帧数和每帧时长。
- `atlases/`：经过 Alpha 提取的透明总图。
- `contact-sheet.jpg`：深浅底静态总览，仅用于预览，不是集成素材。
- `qa-report.json`：透明通道、画布边界、GIF 循环与差异帧检查。
- `source-atlases/`：ImageGen 原始中间产物，包含棋盘格或洋红底。**不可直接集成这些中间图片。**
- `prompts.json`、`source-atlases/decorations-prompt.txt`：实际生成提示词；使用内置 ImageGen，未调用 API CLI。

## 动画区别

四种表情 `portrait_happy`、`portrait_calm`、`portrait_sleepy`、`portrait_excited` 各有六张生成的连续表情帧，包含嘴型、点头或闪光变化。为保持位置稳定，切分时对所有帧应用相同尺寸与偏移。

十个角色已重新绘制为连续动作，类型为 `generated-character-frames`。喝咖啡和月报采用 5 帧，其余角色采用 6 帧；剔除了生成中道具缺失的帧。包含喝咖啡、拍汉堡、举杯、写字、打字与打哈欠、庆祝、外带迈步、指图表、待机表情和挥手。汉堡角色重绘为双脚分开的站姿。所有帧统一缩放，未应用整图漂浮。状态贴纸、空状态与提示标签仍提供 12 帧 UI 轻微浮动。

GIF 格式只有二值透明，边缘没有半透明渐变。深色界面优先使用无损 WebP 或 PNG 帧序列。多倍率导出用于布局适配，不增加原生成图的真实细节。

## WebView 集成示例

```html
<script src="art/upgrade-v1/manifest.js"></script>
<script src="art/upgrade-v1/integration.js"></script>
<img id="status-sticker" width="128" height="128" alt="已记录">
<script>
  BeansterArt.apply(document.querySelector('#status-sticker'), 'sticker_recorded', {
    animated: true,
    format: 'webp'
  });
</script>
```

`BeansterArt.url('stamp_1', {scale: 2})` 返回静态印章路径。助手遵循系统“减少动态效果”偏好，自动返回静态 PNG。PNG 可通过 `object-fit: contain` 缩放；不要在集成时再给透明贴纸添加图片底色。

V18 的 `build_v5.py` 已自动收集本包的 `@2x.png` 与动态 `webp/`，并将 `ui_upgrade.js`、`ui_upgrade.css` 纳入 APK。当前应用使用界面层自己的资源映射；若另行使用上面的通用 `BeansterArt` 示例，还需把 `manifest.js`、`integration.js` 纳入打包。无需打包全部倍率、source-atlases、预览和 QA 文件。

旧 `asset_map_v11.json` 的五种角色状态没有和新角色的完整语义一一对应，应在界面升级时显式映射，避免把第一杯图误当作超标状态。

## 重新生成导出文件

```powershell
python tools/build_upgrade_assets.py
```

依赖支持动态 WebP 的 Pillow 和 numpy；运行时读取本包保存的源图，不调用图像生成服务。静态总览使用 Windows 微软雅黑字体。部分旧版 Anaconda Pillow 缺少 WebP 动画编码，可使用 Codex 随附 Python 运行。
