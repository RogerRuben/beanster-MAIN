# Beanster Sips V19.1

按用户参考图重新制作咖啡角背景：大窗、吊灯、植物、木柜、咖啡豆罐、书籍、磨豆机等统一像素场景。仓鼠与杯子继续使用已有独立透明素材。背景由内置 image_gen 工具生成，保存在 `art/coffee-room/corner-v191.png`；原素材保留。

首页移除顶部 Beanster 品牌区域，恢复直接可见的仪表盘、核心指标与记录按钮。咖啡角改为通栏 400px 场景（窄屏 380px），位于仪表盘之后；四种仪表盘仍可自定义。收藏室页头也使用新场景。

首页与收藏室左右任意方向滑动均循环切换。纵向滚动、小幅滑动、多点触摸、输入框与打开的弹层不触发切页。Android 原有返回桥接在两个根页面循环切换，在详情/表单/照片层继续先返回上一层；退出应用使用系统主页/最近任务操作。收杯期间的返回先结束仪式，不会退出到桌面。

验证：V19.1 的 9 组布局与模拟触摸/返回测试、V19.0 的 12 组收藏室集成测试、V18.1 的 12 组回归、V18.2 的 8 组导航回归、V18.3 的 7 组仪表盘/识别流程回归，以及保存动画互斥测试通过。APK 资源与签名验证通过。本次未进行 Android 真机安装或系统边缘手势实测。

- 版本代码：50，原包名与签名不变。
- APK：`Beanster-Sips-V19.1.apk`，71,700,972 字节。
- SHA-256：`7152940a4620807f2f167b05ef6ab6cdf28f111ebd67d8cc04982953fe42f037`
- 预览：`qa/v191/`。

## 新背景最终生成提示词

参考输入是用户提供的美术资源规划图，使用其左下角咖啡角作为风格/构图参考，不作为编辑目标。内置 image_gen 工具，非 CLI。

Generate ONE high quality production background image for this exact mobile coffee app. Reference image is visual style/composition guidance, specifically the coffee corner room B at lower left. Do NOT reproduce the reference sheet. New image portrait 4:5, cozy richly furnished PIXEL ART cafe room, match the reference's 16bit pixel clusters, brown stepped outlines and warm cream/honey oak colors. Left large blue sky window with green treetops, sill with 3 tiny plants; back wall framed botanical drawing and plain coffee-cup pictogram poster; pendant brass lamp on a hanging cord with warm light; right side a tall beautifully detailed wooden bookcase with books, coffee jars, kraft coffee bags, tiny pottery, cascading ivy. A small wooden chair behind foreground center-left, leafy floor planters near sides, lower wooden parquet floor. Scene densely detailed but coherent and calm, tangible handmade pixels not photorealistic. Lower center leave enough visually clear space to overlay EXISTING hamster and a wide TABLE at runtime (no character or table in generated background). No hamburger, no hamster, no human, no coffee cups sitting in the foreground. No text anywhere, no UI, no logos, no lettering. Room fills full image edge to edge, no margins or frames. Camera slightly above eye level so floor and shelf surfaces read like reference, layered depth, warm inviting daytime cafe. Sharply legible pixel clusters at small mobile size, no blurry smooth vector or realism.
