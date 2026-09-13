import com.beanster.bridge.NativeReader;
import java.nio.file.*;
import java.io.*;
public class NativeOcrHarness {
 public static class Assets {
  private final Path root;Assets(Path r){root=r;}
  public InputStream open(String name)throws Exception{return Files.newInputStream(root.resolve(name));}
 }
 public static class Activity {
  private final Assets assets;Activity(Path r){assets=new Assets(r);}
  public Assets getAssets(){return assets;}
 }
 public static void main(String[] args)throws Exception{
  String meta=args[2],id=meta.split(",")[0];
  String state=NativeReader.start(new Activity(Paths.get(args[0])),Files.readAllBytes(Paths.get(args[1])),meta);
  if(!state.equals("pending"))throw new IllegalStateException(state);
  long until=System.currentTimeMillis()+30000;
  while(System.currentTimeMillis()<until){String r=NativeReader.poll(id);if(!r.contains("\"pending\"")){System.out.println(r);System.exit(r.contains("\"done\"")?0:1);}Thread.sleep(25);}
  NativeReader.cancel(id);throw new IllegalStateException("timeout");
 }
}
