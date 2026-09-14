# Beanster 风格统一规范（V18.x 补丁）

## 视觉方向
- **应用内**：软贴纸 + 奶油 UI（圆角卡片、咖啡棕渐变主按钮、暖描边）
- **启动图标**：可保留像素风；不要把像素风硬塞进表单/识别卡
- **禁止**：OCR/表单区域出现工具风直角灰块、纯实心深棕按钮脱离主按钮语言

## Token（见 `ui_upgrade.css` `:root`）
| Token | 用途 |
|---|---|
| `--bg` / `--card` / `--cream` / `--cream-soft` | 页面与卡片底 |
| `--ink` / `--muted` / `--coffee` / `--coffee2` | 文字与品牌色 |
| `--line` / `--line-soft` / `--shadow` / `--shadow-btn` | 分割与投影 |
| `--radius-sm/md/lg/pill` | 12 / 16 / 20 / 胶囊 |
| `--primary-grad` | 主按钮渐变 |
| `--type-xs/sm/md/lg` | 11 / 12 / 14 / 16 |
| `--tap-min` | 主操作最小高度 48 |

## OCR 确认卡
- 候选块：奶油渐变卡 + 16px 圆角
- 输入：16px 字号、48px 触控高、暖边框
- 「确认并填写」：`.primary` 渐变
- 「修改名称」：`.u-text-btn` 轻操作
