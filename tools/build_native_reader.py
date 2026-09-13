"""Compile the background reader with javac and Google's D8, without Android SDK stubs."""
from pathlib import Path
import os, subprocess, zipfile, hashlib
ROOT=Path(__file__).resolve().parents[1]
JAVA=os.environ.get('BEANSTER_JAVA','C:/Program Files/JetBrains/PyCharm 2026.1.2/jbr/bin/java.exe')
R8=Path(os.environ.get('BEANSTER_R8',ROOT.parent/'.build-tools/r8-8.3.37.jar'))
def build():
    if not R8.is_file(): raise FileNotFoundError('Set BEANSTER_R8 to Google r8-8.3.37.jar')
    out=ROOT/'native-build';out.mkdir(exist_ok=True)
    deps=[]
    for aar in sorted((ROOT/'vendor/vision').glob('*.aar')):
        target=out/(aar.stem+'.jar')
        with zipfile.ZipFile(aar) as z:target.write_bytes(z.read('classes.jar'))
        deps.append(str(target))
    subprocess.run([JAVA,'-m','jdk.compiler/com.sun.tools.javac.Main','--release','8','-encoding','UTF-8','-d',str(out),'-classpath',os.pathsep.join(deps),*[str(p) for p in sorted((ROOT/'native').glob('*.java'))]],check=True)
    jar=out/'reader.jar'
    with zipfile.ZipFile(jar,'w') as z:
        for p in sorted((out/'com').rglob('*.class')): z.write(p,p.relative_to(out).as_posix())
    subprocess.run([JAVA,'-cp',str(R8),'com.android.tools.r8.D8','--min-api','29','--output',str(out),str(jar),*deps],check=True)
    print('Reader DEX',hashlib.sha256((out/'classes.dex').read_bytes()).hexdigest())
    return out/'classes.dex'
if __name__=='__main__':build()
