"""Launcher resources have to be real mipmaps an Android tool can read."""
from pathlib import Path
import os, subprocess, sys, zipfile

ROOT = Path(__file__).resolve().parents[1]
APK = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'Beanster-Sips-V19.5.11-unsigned.apk'
SDK = Path(os.environ.get('BEANSTER_SDK', ROOT.parent / '.build-tools' / 'android-sdk'))

def find(name):
    if not SDK.exists():
        return None
    for p in SDK.rglob(name):
        if p.is_file():
            return p
    return None

with zipfile.ZipFile(APK) as z:
    names = set(z.namelist())
    for density in ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi']:
        assert any(n.startswith(f'res/mipmap-{density}') and n.endswith('ic_launcher.png') for n in names), density
        assert any('ic_launcher_foreground.png' in n and density in n for n in names), density
    assert any('mipmap-anydpi-v26' in n and n.endswith('ic_launcher.xml') for n in names)
    assert any('mipmap-anydpi-v26' in n and 'ic_launcher_round.xml' in n for n in names)
    arsc = z.getinfo('resources.arsc')
    assert arsc.compress_type == zipfile.ZIP_STORED
    data_off = arsc.header_offset + 30 + len(arsc.filename.encode()) + len(arsc.extra)
    assert data_off % 4 == 0, data_off

aapt2 = find('aapt2.exe')
assert aapt2, 'aapt2 is required'
badging = subprocess.run([str(aapt2), 'dump', 'badging', str(APK)], check=True, capture_output=True, text=True, encoding='utf-8', errors='replace').stdout
assert "package: name='com.beanstersips.v11'" in badging
assert "versionName='19.5.11'" in badging
assert 'ic_launcher' in badging
xml = subprocess.run([str(aapt2), 'dump', 'xmltree', str(APK), '--file', 'AndroidManifest.xml'], check=True, capture_output=True, text=True, encoding='utf-8', errors='replace').stdout
assert 'icon(0x01010002)' in xml and 'roundIcon(0x0101052c)' in xml
apkanalyzer = find('apkanalyzer.bat')
if apkanalyzer:
    printed = subprocess.run([str(apkanalyzer), 'manifest', 'print', str(APK)], check=True, capture_output=True, text=True, encoding='utf-8', errors='replace').stdout
    assert 'ic_launcher' in printed and 'ic_launcher_round' in printed
print('PASS launcher mipmaps')
print(badging.splitlines()[0])
