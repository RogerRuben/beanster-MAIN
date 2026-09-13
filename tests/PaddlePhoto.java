import com.beanster.bridge.PaddleReader;
import java.nio.file.*;
import java.awt.image.BufferedImage;
import javax.imageio.ImageIO;
public class PaddlePhoto {
 public static void main(String[] args)throws Exception{
  Path root=Paths.get(args[0]);
  try(PaddleReader reader=new PaddleReader(name->Files.readAllBytes(root.resolve(name)))){
   for(int i=1;i<args.length;i++){
    BufferedImage im=ImageIO.read(Paths.get(args[i]).toFile());int w=im.getWidth(),h=im.getHeight();byte[] g=new byte[w*h];
    for(int y=0;y<h;y++)for(int x=0;x<w;x++){int rgb=im.getRGB(x,y);g[y*w+x]=(byte)Math.round(.2126*((rgb>>16)&255)+.7152*((rgb>>8)&255)+.0722*(rgb&255));}
    long start=System.nanoTime();System.out.println("IMAGE "+Paths.get(args[i]).getFileName());
    for(PaddleReader.Line l:reader.read(g,w,h,()->{}))System.out.println(String.format(java.util.Locale.ROOT,"%.3f\t%s\t%s",l.score,l.text,java.util.Arrays.toString(l.box)));
    System.out.println("MS "+(System.nanoTime()-start)/1000000);
   }
  }
 }
}
