# Beanster Sips V19.5.3

versionName `19.5.3`，versionCode `57`，包名 `com.beanstersips.v11`。签名证书仍是原来的 `sipsqueak`。

安装包：`Beanster-Sips-V19.5.3.apk`  
SHA-256：`55a5503d64814f7b66de5e99e28235225e99a6938d1bdca96881c776d0042ced`  
`*.apk` 不进 git。

## 桌面图标

启动器不再只靠 `@drawable/icon`。构建用 AAPT2 编译：

- `mipmap-mdpi` 到 `mipmap-xxxhdpi` 的 `ic_launcher.png`、`ic_launcher_round.png`、`ic_launcher_foreground.png`
- `mipmap-anydpi-v26` 的 adaptive icon
- manifest 的 `android:icon` 和 `android:roundIcon` 都指向这些资源

`aapt2 dump badging` 对每个密度给出的图标都是 `res/mipmap-anydpi-v26/ic_launcher.xml`。`resources.arsc` 仍是未压缩且 4 字节对齐。

这台电脑上 `adb devices` 没有列出手机，所以没有执行卸载、安装和桌面截图。在真机桌面看到仓鼠图标之前，不能把这一项写成已经修好。

## 动作节奏

坐姿小动作、点按、咖啡蒸汽和收杯结尾都改成逐帧 `durationsMs`。白天和夜里的随机间隔没变。擦汗序列大约 1.7 秒，拍掌大约 1.5 秒。

## 擦汗

`hamster_seated_wipe_01/02` 和 `hamster_idle_base` 各自只有一只仓鼠，没有第二块半透明身体。重影更像是 0.6 秒里从抬手跳到镜片上。新的收杯擦汗是：静止、抬手、停在太阳镜旁、手放下、笑一下、回到静止。镜片上那张旧帧不再放进收杯。棋盘格在 `qa/v1953/wipe-checker.png`。

## 仪表盘仓鼠

自定义仪表盘可以选「自动跟随状态」或「自定义」。自定义后，角色保持所选的 ui 仓鼠，咖啡因提醒仍由数字、文案和颜色负责。

## 咖啡角走动

`HamsterWorld` 管仓鼠在哪里，`SceneLife` 只管坐着时的表情。大约 20–30 秒后才会第一次起身，之后隔 45–90 秒再走。路线只经过椅侧和桌前空地。走路用 4 帧右向循环，左向是这 4 帧的镜像，脚点锁在 `(256,448)`。桌前的仓鼠画在桌沿前面。收杯会先走回座位，再开始仪式。

`qa/v1953/roam-floor.png` 是桌前的一帧走路。
