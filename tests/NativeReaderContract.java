import com.beanster.bridge.NativeReader;
import java.io.File;

/** JVM contract test: checks off-thread execution and error isolation, not recognition accuracy. */
class NativeReaderContract {
    public static class ActivityStub {
        public File getFilesDir() throws Exception {
            Thread.sleep(400);
            throw new java.io.IOException("intentional test failure");
        }
    }
    static void check(boolean result,String message){if(!result)throw new AssertionError(message);}
    public static void main(String[] args) throws Exception {
        check(NativeReader.capabilities().equals("native-async-1"),"capabilities");
        check(NativeReader.start(new ActivityStub(),new byte[1],"bad,20,20,6").equals("invalid"),"length validation");
        check(NativeReader.poll(null).contains("missing"),"missing poll id");
        check(NativeReader.cancel(null).equals("cancelled"),"missing cancel id");
        long start=System.nanoTime();
        check(NativeReader.start(new ActivityStub(),new byte[1024],"first,32,32,6").equals("pending"),"start");
        check((System.nanoTime()-start)/1000000<200,"recognition blocks caller");
        check(NativeReader.start(new ActivityStub(),new byte[1024],"second,32,32,6").equals("busy"),"unbounded queue");
        String result="";for(int i=0;i<100;i++){result=NativeReader.poll("first");if(result.contains("error"))break;Thread.sleep(20);}
        check(result.contains("error"),"native exception not isolated");
        check(NativeReader.start(new ActivityStub(),new byte[1024],"third,32,32,6").equals("pending"),"retry after failure");
        NativeReader.cancel("third");Thread.sleep(500);
        check(NativeReader.poll("third").contains("missing"),"cancelled result leaked");
        System.out.println("PASS: native async return, buffer validation, bounded concurrency, exception isolation, cancellation");
        System.exit(0);
    }
}
