import com.beanster.bridge.NativeVision;
class NativeVisionContract {
    public static class ActivityStub { public Object getAssets() throws Exception {Thread.sleep(250);throw new java.io.IOException("test failure");} }
    static void check(boolean b,String m){if(!b)throw new AssertionError(m);}
    public static void main(String[] args)throws Exception{
        check(NativeVision.start(new ActivityStub(),new byte[2],"invalid").equals("invalid"),"shape");
        long t=System.nanoTime();check(NativeVision.start(new ActivityStub(),new byte[224*224*3],"a").equals("pending"),"start");
        check((System.nanoTime()-t)/1000000<150,"blocks UI");
        check(NativeVision.start(new ActivityStub(),new byte[224*224*3],"b").equals("busy"),"queue");
        NativeVision.cancel("a");Thread.sleep(600);check(NativeVision.poll("a").contains("missing"),"cancelled result");
        check(NativeVision.poll(null).contains("missing"),"null id");
        System.out.println("PASS: native vision buffer, background dispatch, bounded concurrency, cancellation (not device inference)");System.exit(0);
    }
}
