Beanster Sips V17.1

- Improves first-use cup-label reading by waiting for the text reader to finish preparing instead of failing after ~3 seconds.
- Cup labels use multiple complementary reading layouts before falling back to manual selection.
- A manually selected label is genuinely expanded for retry, rather than reusing the same crop.
- Product-name parsing handles incomplete OCR punctuation such as “埃塞瑰夏拿铁(杯”.
- Candidate scoring favors actual drink lines over coffee-bean/accessory/customization lines.
- Existing V15/V16/V17 records, photos, info attachments, correction memory and .beanster backups remain compatible.
- Package remains com.beanstersips.v11. Data schema remains 15.
- Signing requires the original Beanster keystore; the build refuses to generate a replacement key.

Note: the bundled Chinese language data is local. This release still uses the existing WebView Tesseract runtime with a remote-script fallback; it must not be described as a fully native OCR build.
