import com.beanster.bridge.PaddleReader;
import java.nio.file.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.io.*;
/** Test-only batch runner using the exact production OCR implementation. */
public class BatchPaddle {
 public static void main(String[] args)throws Exception{
  Path root=Paths.get(args[0]);
  try(PaddleReader reader=new PaddleReader(name->Files.readAllBytes(root.resolve(name)));
      BufferedWriter out=Files.newBufferedWriter(Paths.get(args[2]),StandardCharsets.UTF_8)){
   for(String row:Files.readAllLines(Paths.get(args[1]),StandardCharsets.UTF_8)){
    String[] a=row.split("\t");long start=System.nanoTime();
    List<PaddleReader.Line> lines=reader.read(Files.readAllBytes(Paths.get(a[3])),Integer.parseInt(a[1]),Integer.parseInt(a[2]),()->{});
    for(PaddleReader.Line l:lines){out.write(a[0]+"\t"+l.score+"\t"+Base64.getEncoder().encodeToString(l.text.getBytes(StandardCharsets.UTF_8))+"\t"+Arrays.toString(l.box)+"\n");}
    out.flush();System.out.println(a[0]+" "+lines.size()+" lines "+(System.nanoTime()-start)/1000000+" ms");
   }
  }
 }
}
