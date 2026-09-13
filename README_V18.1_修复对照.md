# Beanster Sips V18.1 修复与验收对照

对应用户提供的《项目说明与当前问题》及 9 月 13 日动效反馈。本次完成代码修复、桌面回归和原密钥签名。**这是待真机验收的版本，不能把桌面识别成功写成 Android 端到端验收通过。**

## 文档问题逐项对照

| 文档项目 | 本次处理 | 已有验证与边界 |
| --- | --- | --- |
| P0 杯贴读取未闭环 | 新增 `NativeReader.java`，后台线程运行 Tesseract；网页提交后轮询结果，缓存引擎，异常不会从工作线程逸出 | JVM 验证非阻塞、异常隔离、忙状态及取消；手机识别仍待验收 |
| P0 全图定位 | 用纸张连通区域与文字密度检测标签，先读上部商品区；不依赖固定居中窗口 | 从用户完整 925×2048 截图开始，实际应用预处理、实际传输灰度像素、桌面 Tesseract 5.5.2、表单回填，首轮得到“埃塞瑰夏拿铁 / 拿铁”。该输入是完整 App 截图，不是原始相机照片 |
| P0 原生链路一致性 | 编译并打包 `classes2.dex`；实际 Chrome 桥接调用 `NativeReader.start/poll/cancel`，不再调用同步 `ocrRecognize` | `verify_dex.py` 解码 APK 中的调用指令验证；本地字库及四个 ARM64 库逐项检查。原 AAR 只有 ARM64，未声称支持 armeabi-v7a |
| P0 性能与阻塞 | 单工作线程、拒绝堆积请求、分块传输期间让出主线程、最多两次识别、8 秒网页总预算、取消及过期结果保护 | JVM 合约和网页回归通过；未测真机首杯、连续第二杯、中位数或 P95，不能声称达到 3/5 秒指标 |
| P0 咖啡因估算 | 移除“某品牌标准配方”的未经验证精确小数；浓缩份数对所有品牌生效，奶量不机械放大咖啡因；同品牌同规格可参考用户确认记录 | 份数/容量回归通过。现有通用数值仍为可修改估算，不是中国各品牌官方实测营养数据库 |
| P1 订单与杯贴路由 | 订单保留整个画面，修复删除中间 16% 内容的旧逻辑；实体标签采用独立区域策略 | 整幅订单中间色带保持测试通过；完整失败截图定位通过 |
| P1 商品与标准类型 | 商品名独立保存，统一类型规则；过滤蛋糕、饼干、咖啡豆、器具等后再做纠错，禁止从外观强行猜咖啡 | 16 条正样本与 16 条负样本文本通过；这些是文本回归，不冒充 32 张真实照片 |
| P1 原图回归 | 识别只处理副本；保存新图时若原生保存失败，把完整新图保留到 IndexedDB，清除旧照片路径；信息附件保留完整数据并可保存 | 原图/附件恢复、新图替换失败回退、编辑原图保持回归通过；相机权限和系统文件保存仍需手机验证 |
| P1 完整备份与 JSON | 保留 `.beanster` 全量媒体备份、JSON 记录交换；导入入口明确拒绝把照片当备份 | 文件类型保护已加入；图片与记录交换分别处理 |
| P1 合并边界 | 本地修改时间优先，旧备份无修改时间不覆盖现有记录；不同稳定 ID 的两杯不自动去重；缺失原图/附件可补回；个人纠错本地优先并持久化 | 冲突、不同 ID、高清媒体、附件与个人纠错回归通过 |
| P1 素材稳定性 | 十个角色与四种头像统一脸部锚点校正；保持 256px 透明画布 | 十个角色横向锚点跨帧误差均低于 1px；头像按边缘安全范围校正，保留表情自身的头部姿态变化。无需移动 UI 容器制造动作 |
| UI 简化 | 普通界面只显示读取进度、结论和下一步；开发用区域、引擎、文字和耗时保存在内存 `Reader.trace` | 不持久化或上传识别原文；本次私人截图及诊断输出位于被 Git 忽略的 `qa/private/` |
| 月历图案 | 0 杯无章，1–3 杯数字章，超过 3 杯或超过设置上限使用提示章 | 与新版日历保持一致 |

## 本轮新增的动效反馈

- 首页仓鼠缩小到 118×142px，窄屏为 100×122px；放在仪表盘右下侧。
- `motion.js` 全局只允许一个逐帧动画；进入页面播放一次，随后静止，点击才重播一次。
- 首页成就提示卡保持静态，移除保存后的动态贴纸，仪表盘取消过渡动画。
- 首页快捷入口“鼠鼠表情”展示全部十个角色与四种头像，可选择任意全身角色放到首页，也可恢复自动选择。
- 系统开启“减少动态效果”时保持静态。资源包中的循环 GIF/WebP 留作外部集成，App 使用透明 PNG 帧控制单次播放。

## 已执行的验证

- `node tests/test_ui_upgrade.cjs`：原有 17 项界面与数据回归。
- `node tests/test_v181.cjs`：12 组新回归，含单次动效、全局互斥、14 个表情入口、32 条文本、取消与手填保护、完整订单、新原图保存回退、备份合并及估算。
- `node tests/test_reader_desktop.cjs <完整输入路径>`：实际灰度传输和桌面 OCR 的完整截图诊断，首轮回填目标名称；使用相同 `chi_sim.traineddata`，桌面引擎 5.5.2 与 APK 5.5.0 不同，不能替代真机验证。
- `java --class-path native-build tests/NativeReaderContract.java`：原生后台调度合约；使用失败桩检查异常和取消，不用于证明 OCR 准确率。
- `python tests/test_v177_transport.py`：分块传输兼容。
- `python tests/test_upgrade_package.py Beanster-Sips-V18.1.apk`：代码、第二 DEX、全部运行时素材与 APK 内容一致。
- `python verify_dex.py Beanster-Sips-V18.1.apk`：JNI 声明与实际异步桥接调用。
- 美术资源检查：96 项透明素材、27 个资源动画，369 个预览引用无缺失。
- 原密钥签名、Google apksig 验签及旧版证书指纹比对通过。

## 待手机与真实样本验收

尚未完成：覆盖安装后真实数据保持、相机/系统相册权限、原图系统导出、飞行模式完整识别、首杯/连续识别耗时，以及 30–50 张不同品牌和负样本原图回归。当前只有用户这张完整 App 截图，未得到额外样本路径或可操作的 Android 调试设备。上述各项不能标为“全部修好并验收通过”。

建议手机先从完整备份保存现有记录，再覆盖安装此验收包。使用同一张照片测试自动读取一次、取消读取、连续选择两张照片、手工修改商品名后等待旧任务结束，以及原图查看和保存。

## 构建与签名

版本 18.1，versionCode 42，包名 `com.beanstersips.v11`。密钥留在用户提供的目录中，没有纳入仓库。

```powershell
python build_v5.py --keystore "原 keystore 路径" --apksig "apksig-8.13.0.jar 路径" --java "Java 可执行文件路径"
```

后台类由 `tools/build_native_reader.py` 使用 javac/D8 编译；`BEANSTER_JAVA`、`BEANSTER_R8` 可指定工具路径。D8 来自 Google Maven 的 `com.android.tools:r8:8.3.37`。默认开发机路径位于仓库外的 `.build-tools`。

正式签名验收包 SHA-256：`01a668321895422b27327ed28c31261d995295df03febe083876331a4519eb3c`。

签名证书 SHA-256：`84:D4:A0:DD:47:06:4B:81:94:44:13:1B:F3:44:D2:D5:C8:B6:E7:91:A2:26:52:DE:59:3C:E4:74:49:7A:70:18`。

## OCR follow-up review

Cancelled image preprocessing and grayscale conversion now preserve the originating request generation before entering the native transfer. Polling rechecks cancellation after its asynchronous wait. Native poll/cancel tolerate missing IDs and consume only completed results. The additional cancellation regression, native contract, transport, APK payload and DEX checks passed. Device recognition remains pending user testing.
