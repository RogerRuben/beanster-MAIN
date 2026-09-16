# V19.2 · 双屏首页（做法 B）

第一屏是仓鼠咖啡角，作为默认启动页。只保留场景、今日杯子、收藏室入口、记录按钮和拍照/表情入口，不再显示大仪表盘和数据卡。第二屏是今日仪表盘，保留四种组件与自定义配置，集中显示已摄入、剩余、日上限、杯数、热量、花费和连续天数。超出上限时剩余为 0，仪表盘仍提示超出数量。

两屏左右循环切换，也可点击页签切换。收藏室是独立入口，不再参与双屏循环；详情返回收藏室，再返回咖啡角。输入框、竖向滚动和打开的表单/详情不会触发双屏切换。记录仍使用同一份数据，原有补记、编辑、删除、撤销和每日收杯机制保留。

## 新坐姿

`art/coffee-room/hamster-seated-v192.png` 是新绘制的透明坐姿主图，使用原角色和桌子作为身份/透视参考，经内置 image_gen 工具生成。双臂与双手按桌沿关系重新绘制，不复用旧站姿进行遮挡。主图为静态坐姿；原 14 个角色/头像的逐帧表情继续保留。汉堡搭配可以在表情册点击播放，但不会替换首页专属坐姿。旧首页角色偏好不会覆盖这一主姿态。

## 验证与安装

- `tests/test_v192.cjs`：两屏分离、循环触摸、独立收藏室、保存后数据同步、新坐姿资源、汉堡播放、四种仪表盘、未保存表单、320/390/480 布局及重启默认页测试通过。
- `tests/test_v190.cjs`：12 组收藏室/收杯/记录回归通过。
- `tests/test_v185.cjs`：10 张图片的 OCR 输出回放及完整名称编辑回归通过；本次未变更原生 OCR。
- 保存动画互斥测试、APK 资源逐字节检查、原生桥接检查及签名验证通过。
- 未进行 Android 真机安装和手势实测。

版本代码 51，原包名与签名不变，可覆盖安装。APK：`Beanster-Sips-V19.2.apk`，72,475,208 字节。

SHA-256：`8cb23af9a61a66766be4b36b7248a1aa6cb26e08821468563c1e5c8696337073`

两屏预览：`qa/v192/home-four.png`、`qa/v192/dashboard.png`。

## 最终生成提示词

Use case identity-preserve / game sprite illustration. Create a NEW SEATED MAIN POSE of the exact orange hamster in reference1, for sitting BEHIND the oak table in reference2. Transparent alpha background. Preserve identity exactly: round orange hamster with small round ears, dark brown round sunglasses, cream cheeks and tummy, little nose and smile, open red Hawaiian shirt with cream/yellow flowers. Strict crisp pixel art with visible square clusters and dark stepped outlines, matching supplied character. Change posture from standing with takeaway cup to relaxed seated behind a cafe table, seen slightly from above and front, both elbows angled outward, two little paws resting naturally on an imaginary tabletop at lower chest height. Shoulders relaxed, gentle happy smile. Show complete head, torso, arms and paws ONLY, lower body ends just below wrists; lower body will be occluded by a separate table. Paws extend slightly forward toward viewer on same horizontal plane so they can overlap table's back rim. Reference2 is PERSPECTIVE GUIDANCE ONLY: do NOT render any table, furniture, cup, food, burger, chair, shadow plane or background. Isolated seated upper body sprite, centered with a little transparent margin. Do not redesign character or change clothes. This must be a freshly drawn natural seated posture, not a cropped standing image. 1024 square transparent PNG.
