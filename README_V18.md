# Beanster Sips V18.0 界面升级

基于 V17.7 源码及已确认的升级美术资源，按参考图实现手机界面。Android 包名继续为 `com.beanstersips.v11`，versionCode 为 41，数据 schema 保持 15。

- 首页：咖啡因圆环、日上限剩余、动态仓鼠、四项统计、状态卡和主记录按钮。
- 记录页：饮品 / 品牌 / 杯型图形选择，品牌搜索与自定义，保留照片、杯贴、订单读取及原有详细字段。
- 月报：总览、品类、品牌、时间四个维度；每日摄入图、分布图、印章日历。
- 日历详情：七日切换、时间线、记录操作、按日期补记、当日备注与统计。
- 成就：24 项规则从现有记录计算解锁状态与日期，可查看解锁条件。删除或恢复记录后重新计算。
- 照片与设置：沿用原有照片、导入导出、恢复点、OCR 数据与照片附件逻辑。

同时修复原源码遗漏 `mediaDbPromise` 初始化的问题，恢复 IndexedDB 照片 / 信息附件的正常写入；补测编辑记录时附件不会丢失。

新资源位于 `art/upgrade-v1/`，运行时只使用 `@2x.png` 和动态 WebP。标签外部为真实透明背景。品牌采用文字标识，未新增第三方品牌 Logo 图片。四种头像有连续表情帧；角色与状态贴纸的动画为资源包中的轻微浮动。

## 代码入口

`index_v5.html` 依次加载 `app_v5.js`（既有数据 / OCR 核心）和 `ui_upgrade.js`（界面及交互层），样式由 `ui_upgrade.css` 补充。移除了 HTML 中重复、过期的内嵌 JS，浏览器预览与 APK 使用同一份源代码。

记录仍保存在 `coffeelog.v3.records`，照片仍在 `coffeelog-media-v3` IndexedDB。新自定义品牌和当日备注位于已有 settings 对象的 `customBrands`、`dayNotes` 字段，随原有 JSON / 完整备份一起保存。

## 构建

```powershell
python build_v5.py --unsigned
python build_v5.py --keystore "原来的 beanster-v11.keystore 路径"
```

正式签名需要原始密钥及可用的 `jarsigner`。脚本不会创建替代密钥。`Beanster-Sips-V18.0-unsigned.apk` 是未签名验证产物，不能直接安装或覆盖旧版；使用原密钥签名后才生成 `Beanster-Sips-V18.0.apk`。

已核验下载目录的 `Beanster-Sips-V17.1(1).apk`：SHA-256 为 `626128d64b00e6bb5e99952357147f078f2d0c84f361523e2a59ed3761fc6189`。旧版证书 SHA-256 为 `84:D4:A0:DD:47:06:4B:81:94:44:13:1B:F3:44:D2:D5:C8:B6:E7:91:A2:26:52:DE:59:3C:E4:74:49:7A:70:18`。构建脚本使用 `keytool` 核对原 keystore 的证书，不匹配则拒绝签名。APK 哈希和公钥证书均不能恢复私钥。

十个全身角色现已替换为重绘的连续动作帧（5–6 帧，GIF / WebP / PNG Sprite），汉堡角色脚部也已重画。预览见 `art/upgrade-v1/preview.html`，逐帧检查图见 `character-actions-contact.jpg`。

## 验证

```powershell
node tests/test_ui_upgrade.cjs
python tests/test_v177_transport.py
python verify_dex.py Beanster-Sips-V18.0-unsigned.apk
python tests/test_upgrade_package.py
```

浏览器测试使用独立临时上下文及测试数据，不读取或修改用户手机里的真实记录。截图与结果在 `qa/v18/`。可通过 `python -m http.server 8787 --bind 127.0.0.1` 启动本地预览，打开 `/index_v5.html`。

尚需 Android 真机验证相机 / 系统相册 / 原生 OCR / 原图导出等桥接功能；浏览器测试不能替代真机验证。

### 本次正式构建

已使用用户提供的 V12 源码目录内原始 keystore 完成签名。最终 APK 为 `Beanster-Sips-V18.0.apk`，SHA-256：`1eeba088e6e8c914c3b533841800b0fb3ab8e4c45e211335b44992f1efb20a61`。Google 官方 apksig 8.13.0 验证通过（Android 29+ 使用 v3 签名验证），签名证书与上述旧版完全一致，包名保持 `com.beanstersips.v11`，versionCode 为 41。原私钥未复制到仓库。

本次使用 `build_v5.py --keystore <原密钥路径> --apksig <apksig-8.13.0.jar路径> --java <java.exe路径>`，通过 Java 源码启动器运行 `tools/SignBeanster.java`。签名前检查证书，签名后使用 `ApkVerifier` 验证全部 APK 内容。签名库来自 Google Maven：`https://dl.google.com/dl/android/maven2/com/android/tools/build/apksig/8.13.0/apksig-8.13.0.jar`。本机 Java 来自已安装的 PyCharm JBR。

正式包已生成；仍需在 Android 真机上验证覆盖安装、相机、系统相册和原生 OCR。浏览器测试不会接触用户手机数据。
