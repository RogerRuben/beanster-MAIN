Beanster Sips V17.7

Purpose
- Fix the confirmed WebView -> Android OCR image transport truncation reported by the on-device V17.6 self-test.

Key change
- V17.6 transported OCR chunks through window.prompt's defaultValue argument.
- V17.7 transports OCR chunks through the prompt URI query parameter, matching Beanster's established image/backup bridge.
- Each native chunk write returns the exact cumulative ByteArrayOutputStream size.
- JavaScript checks the cumulative byte count after every chunk.
- The full transfer is reset and retried with smaller chunks if any ACK differs.
- Android still validates final grayscale byte count == width * height before calling JNI.

Transfer sizes
- First pass: 3000 raw bytes per chunk (about 4 KB URI payload).
- Retry: 900 raw bytes per chunk (about 1.3 KB URI payload).

OCR/runtime
- Tesseract Android AAR: 5.5.0, verified SHA-256 5928f0f271057dc303fce71f013900031635a3f7739782ce4df76726bfd032d4.
- Local chi_sim.traineddata.
- Native library order remains leptonica -> tesseract -> tesseract_jni.
- Datapath remains the actual tessdata directory fixed in V17.6.
- WebView Tesseract.js/CDN is not used.

Compatibility
- package: com.beanstersips.v11
- schema: 15
- versionCode: 40
- versionName: 17.7
- existing records/photos/.beanster remain compatible.
