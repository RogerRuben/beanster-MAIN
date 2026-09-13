package com.beanster.bridge;

import java.io.*;
import java.nio.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicBoolean;
import org.tensorflow.lite.Interpreter;

/** Bundled CPU-only MobileNet. No WebView ML, Play services or network runtime. */
public final class NativeVision {
    private static final ExecutorService WORKER=Executors.newSingleThreadExecutor();
    private static final AtomicBoolean BUSY=new AtomicBoolean();
    private static final ConcurrentHashMap<String,String> RESULTS=new ConcurrentHashMap<>();
    private static Interpreter interpreter;
    private static ByteBuffer modelBuffer;
    private static final List<String> labels=new ArrayList<>();
    public static String capabilities(){return "native-vision-1";}
    private static InputStream asset(Object activity,String name) throws Exception {
        Object assets=activity.getClass().getMethod("getAssets").invoke(activity);
        return (InputStream)assets.getClass().getMethod("open",String.class).invoke(assets,name);
    }
    private static void initialize(Object activity) throws Exception {
        if(interpreter!=null)return;
        ByteArrayOutputStream bytes=new ByteArrayOutputStream();
        try(InputStream in=asset(activity,"vision/mobilenet_v1_224_quant.tflite")){
            byte[] chunk=new byte[65536];int n;while((n=in.read(chunk))!=-1)bytes.write(chunk,0,n);
        }
        modelBuffer=ByteBuffer.allocateDirect(bytes.size()).order(ByteOrder.nativeOrder());
        modelBuffer.put(bytes.toByteArray());modelBuffer.rewind();
        labels.clear();
        try(BufferedReader reader=new BufferedReader(new InputStreamReader(asset(activity,"vision/labels.txt"),"UTF-8"))){String line;while((line=reader.readLine())!=null)labels.add(line);}
        if(labels.size()!=1001)throw new IOException("vision-label-count");
        Interpreter candidate=new Interpreter(modelBuffer,new Interpreter.Options().setNumThreads(2).setUseNNAPI(false).setUseXNNPACK(false));
        if(!Arrays.equals(candidate.getInputTensor(0).shape(),new int[]{1,224,224,3})||
           !Arrays.equals(candidate.getOutputTensor(0).shape(),new int[]{1,1001})||
           !candidate.getInputTensor(0).dataType().toString().equals("UINT8")||
           !candidate.getOutputTensor(0).dataType().toString().equals("UINT8")){
            candidate.close();throw new IOException("vision-model-contract");
        }
        interpreter=candidate;
    }
    public static String start(final Object activity,final byte[] rgb,final String id){
        if(id==null||!id.matches("[a-zA-Z0-9_-]{1,64}")||rgb==null||rgb.length!=224*224*3)return "invalid";
        if(!BUSY.compareAndSet(false,true))return "busy";
        RESULTS.clear();RESULTS.put(id,"{\"status\":\"pending\"}");
        WORKER.execute(new Runnable(){public void run(){
            long started=System.nanoTime();String result;
            try{
                initialize(activity);
                ByteBuffer input=ByteBuffer.allocateDirect(rgb.length).order(ByteOrder.nativeOrder());input.put(rgb);input.rewind();
                byte[][] output=new byte[1][1001];interpreter.run(input,output);
                float scale=interpreter.getOutputTensor(0).quantizationParams().getScale();
                int zero=interpreter.getOutputTensor(0).quantizationParams().getZeroPoint();
                List<Integer> ranking=new ArrayList<>();for(int i=0;i<1001;i++)ranking.add(i);
                Collections.sort(ranking,(a,b)->Integer.compare(output[0][b]&255,output[0][a]&255));
                StringBuilder top=new StringBuilder("[");
                for(int k=0;k<5;k++){int i=ranking.get(k);if(k>0)top.append(',');top.append("{\"index\":").append(i).append(",\"label\":").append(NativeReader.quote(labels.get(i))).append(",\"score\":").append(((output[0][i]&255)-zero)*scale).append('}');}
                top.append(']');
                result="{\"status\":\"done\",\"engine\":\"MobileNet V1 / TFLite CPU\",\"top\":"+top+",\"elapsedMs\":"+((System.nanoTime()-started)/1000000)+"}";
            }catch(Throwable error){
                result="{\"status\":\"error\",\"error\":"+NativeReader.quote(error.getClass().getSimpleName())+"}";
                if(interpreter!=null)try{interpreter.close();}catch(Throwable ignored){}interpreter=null;
            }
            RESULTS.replace(id,result);BUSY.set(false);
        }});
        return "pending";
    }
    public static String poll(String id){if(id==null)return "{\"status\":\"missing\"}";String result=RESULTS.get(id);if(result==null)return "{\"status\":\"missing\"}";if(!result.equals("{\"status\":\"pending\"}"))RESULTS.remove(id,result);return result;}
    public static String cancel(String id){if(id!=null)RESULTS.remove(id);return "cancelled";}
}
