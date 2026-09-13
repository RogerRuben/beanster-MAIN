# Beanster Sips V18.3

## 本地视觉路径

新增 `NativeVision.java`，在 Android 工作线程中使用随 APK 打包的 TensorFlow Lite 2.16.1 与 MobileNet V1 量化模型进行推理。WebView 只做图片显示、RGB 缩放传输与候选交互，不下载 JavaScript 模型、不通过 WebGL 推理、不依赖 Google Play 服务，也不上传照片。

- 普通照片先尝试 OCR；没有明确饮品名时，进入本地视觉建议。订单截图仍优先走文字路径。
- “照片、订单与杯贴”区域提供“看饮品外观”，可手动调用。
- 使用独立的 `visionbegin/chunk/finish/poll/cancel` 原生桥接和 RGB 缓冲，避免与 OCR 的灰度缓冲互相覆盖。
- 原生模型用于杯具/咖啡等 ImageNet 大类判断。具体“拿铁、美式”等候选仍是外观规则排序，明确显示为待确认建议，不是专门训练的咖啡配方分类模型。不给这些建议显示虚假的准确率。
- 不自动修改已有名称或类型；用户选择候选时，若已有名称则再次确认。取消或换图会丢弃过期结果。视觉任务后台单线程、拒绝排队，网页等待预算为 6 秒。

**能力边界**：仅凭杯体外观不能确认品牌、具体商品、配方或咖啡因。通用模型尤其不擅长封口/有盖外带杯。用户提供的完整 App 截图，在本次桌面模型诊断中未被可靠识别为咖啡，程序因此不给出强制判断；这不是准确率问题已经解决的证明。

## 自定义仪表盘

首页“自定义仪表盘”或设置“首页仪表盘”可选择：

1. 统计圆环。
2. 经典咖啡杯：进入灌注、冒泡一次，点击重播。
3. 简洁数字。
4. 刻度进度。

支持咖啡棕、焦糖金、森林绿三种配色，以及隐藏/显示仓鼠。偏好保存在原有设置中。杯子气泡接入全局 Motion 播放器，与仓鼠互斥；减少动态效果时静止。原有摄入量、上限和记录计算不变。

## 已执行的检查

- V18.1 的 12 组回归，V18.2 的 8 组回归。
- `tests/test_v183.cjs`：7 组仪表盘、偏好持久化、动画互斥、视觉拒绝阈值、OCR 优先、候选确认回归。视觉编排部分使用明确的测试替身，不冒充原生识别。
- `tests/NativeVisionContract.java`：后台调度、缓冲长度、忙状态、取消与错误隔离的 JVM 检查。
- `tests/test_vision_desktop.cjs`：实际传输 224×224 RGB 字节，使用相同模型在桌面 TensorFlow 中推理。桌面解释器启动在计时外，不能用该耗时代表手机冷启动。
- `verify_dex.py`：解码 APK，确认原生 OCR、返回及 NativeVision 的实际调用。
- `tests/test_upgrade_package.py`：代码、模型、标签、ARM64 推理库与 APK 字节一致。
- 构建前校验 `vision/checksums.json` 中的模型与依赖哈希；使用原签名证书验签。

本轮没有连接手机。APK 中的视觉运行、首次初始化速度和真实照片准确性仍待用户实测，不以桌面测试代替 APK 验收。

## 模型与依赖来源

- [TensorFlow MobileNet 官方模型说明](https://github.com/tensorflow/models/blob/master/research/slim/nets/mobilenet_v1.md)，ImageNet 分类，非咖啡专用模型。
- [TensorFlow 官方量化模型文件](https://storage.googleapis.com/download.tensorflow.org/models/mobilenet_v1_2018_08_02/mobilenet_v1_1.0_224_quant.tgz)。输入 `[1,224,224,3]` UINT8 RGB，输出 `[1,1001]` UINT8；输出按模型自身量化参数解码。
- [官方 ImageNet 标签](https://storage.googleapis.com/download.tensorflow.org/data/ImageNetLabels.txt)。
- Maven `org.tensorflow:tensorflow-lite:2.16.1` 与 `tensorflow-lite-api:2.16.1`，AAR 和许可证保存在 `vendor/vision/`；模型许可证在 `vision/LICENSE`。

版本 18.3 / versionCode 44，沿用 `com.beanstersips.v11` 和原始 keystore。

APK SHA-256: 8ec7e0c6bb05a21727f30cd96bdd90ce026468b3b4075f76e5fa12ea7cab534e
