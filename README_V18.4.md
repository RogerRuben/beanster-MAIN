# Beanster Sips V18.4

本地 OCR 从 Tesseract 主链路切换为 PP-OCRv5 mobile 文字检测与识别。照片先定位文字行、合并同方向断开的文字块、按旋转矩形裁正；低置信度行尝试对比度增强与 180° 重读。ONNX Runtime 1.21.1 使用 CPU，模型和 ARM64 原生库随 APK 打包，识别不需要联网。Tesseract 遗留库暂时保留在包中，但当前异步 NativeReader 不再调用它。

统一结果控制器负责显示和填写：

- 单个完整已知饮品名、未纠错且模型分数达到 0.92 时可填写；已有不同名称时先确认。
- 疑似错字、部分品类、多个名称或较低分数只显示饮品候选，点击确认后填写。
- 无关 OCR 行不显示，不再提供「任意文字行」兜底；手动输入框不会带入原始 OCR 文本。
- OCR 没有有效饮品名时才使用本地视觉；通用模型只提示可能是咖啡或杯装饮品，不将颜色规则当成配方识别。拿铁等按钮明确标为手动选择。
- 停止、换图、离开页面使旧结果失效；识别期间的字段编辑不会被覆盖。

模型分数是筛选依据，不是经过校准的准确率。当前裁正是文字行的旋转矩形近似，不包含完整曲面展开。视觉模型仍为 V18.3 的通用 MobileNet；本版没有训练新的咖啡品类分类器。不透明杯内的配方无法可靠推断。

## 验证

原有 27 组界面、数据、导航、动画和流程回归通过。新增 9 组包括证据过滤、纠错确认、准确文字优先、单次视觉兜底、取消与编辑保护，以及真实像素传输到 NativeReader / PP-OCRv5 后回到界面的桌面原生测试。

使用用户之前提供的杯贴照片裁去截图界面作测试，再生成 ±10°、±20° 的旋转副本。最终原图、-20°、-10°、+10° 读到「埃塞瑰夏拿铁」；+20° 读到「塞瑰夏拿铁」，规则可生成待确认的完整名称。这里只验证同一张照片及合成旋转，不代表各手机、品牌和反光场景的整体准确率。测试照片及原始 OCR 输出仅保存在被 Git 忽略的 `qa/private/ocr184`。

APK 资源逐字节一致性、PP-OCR 模型、ONNX ARM64 库、DEX 桥接及签名校验通过。当前没有连接 Android 设备，未声称已在实体手机运行；需要安装此包验证手机上的离线识别速度和效果。

## 安装包

`Beanster-Sips-V18.4.apk`，versionCode 46，包名保持 `com.beanstersips.v11`。

APK SHA-256：`8c9d501067dec0b8988c733e0574f20dd19fc42a14bfeebdcdac627806f87879`

原证书 SHA-256：`84:D4:A0:DD:47:06:4B:81:94:44:13:1B:F3:44:D2:D5:C8:B6:E7:91:A2:26:52:DE:59:3C:E4:74:49:7A:70:18`

## 依赖来源

[PaddleOCR 官方 Android 部署文档](https://github.com/PaddlePaddle/PaddleOCR/blob/main/docs/version3.x/inference_deployment/cross_platform/android_deployment.en.md)列出的 PP-OCRv5 mobile ONNX 模型，来自官方 BOS 下载地址；ONNX Runtime 来自 Maven Central。校验值存于 `ocr/paddle/checksums.json`；许可证随模型与依赖提交。`tools/fetch_ocr184.py` 可重新下载并校验依赖，不上传用户照片。
