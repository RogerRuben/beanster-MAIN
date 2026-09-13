package com.beanster.bridge;

import java.io.*;
import java.lang.reflect.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicBoolean;

/** Asynchronous, offline PP-OCRv5 bridge. No Android UI work on the reader thread. */
public final class NativeReader {
    private static final ExecutorService WORKER=Executors.newSingleThreadExecutor();
    private static final AtomicBoolean BUSY=new AtomicBoolean();
    private static final ConcurrentHashMap<String,String> RESULTS=new ConcurrentHashMap<>();
    private static PaddleReader engine;
    public static String capabilities(){return "native-async-1";}
    private static synchronized void initialize(final Object activity) throws Exception {
        if(engine!=null)return;
        engine=new PaddleReader(name->{
            Object assets=activity.getClass().getMethod("getAssets").invoke(activity);
            try(InputStream in=(InputStream)assets.getClass().getMethod("open",String.class).invoke(assets,name);
                ByteArrayOutputStream out=new ByteArrayOutputStream()){
                byte[] chunk=new byte[65536];int n;while((n=in.read(chunk))!=-1)out.write(chunk,0,n);return out.toByteArray();
            }
        });
    }
    public static String start(final Object activity,final byte[] pixels,String metadata){
        try {
            String[] parts=metadata.split(",");
            final String id=parts[0];
            final int w=Integer.parseInt(parts[1]),h=Integer.parseInt(parts[2]),psm=Integer.parseInt(parts[3]);
            if(!id.matches("[a-zA-Z0-9_-]{1,64}")||w<1||h<1||w>4096||h>4096||
                (long)w*h>4000000||pixels==null||pixels.length!=(long)w*h||!(psm==6||psm==7||psm==11))return "invalid";
            if(!BUSY.compareAndSet(false,true))return "busy";
            RESULTS.clear();RESULTS.put(id,"{\"status\":\"pending\"}");
            WORKER.execute(new Runnable(){public void run(){
                long started=System.nanoTime();String result;
                try{
                    initialize(activity);
                    java.util.List<PaddleReader.Line> lines=engine.read(pixels,w,h,()->{
                        if(!RESULTS.containsKey(id))throw new InterruptedException("cancelled");
                        if((System.nanoTime()-started)/1000000>22000)throw new InterruptedException("timeout");
                    });
                    StringBuilder text=new StringBuilder(),items=new StringBuilder("[");
                    for(PaddleReader.Line line:lines){
                        if(text.length()>0)text.append('\n');text.append(line.text);
                        if(items.length()>1)items.append(',');
                        items.append("{\"text\":").append(quote(line.text)).append(",\"confidence\":").append(line.score).append(",\"box\":").append(java.util.Arrays.toString(line.box)).append('}');
                    }
                    items.append(']');
                    result="{\"status\":\"done\",\"text\":"+quote(text.toString())+",\"lines\":"+items+",\"engine\":\"PP-OCRv5 mobile / ONNX CPU\",\"elapsedMs\":"+((System.nanoTime()-started)/1000000)+"}";
                }catch(Throwable error){
                    result="{\"status\":\"error\",\"error\":"+quote(error.getClass().getSimpleName())+"}";
                    if(engine!=null)try{engine.close();}catch(Throwable ignored){}engine=null;
                }finally{BUSY.set(false);}
                RESULTS.replace(id,result);
            }});
            return "pending";
        }catch(Throwable error){return "invalid";}
    }
    public static String poll(String id){
        if(id==null)return "{\"status\":\"missing\"}";
        String result=RESULTS.get(id);if(result==null)return "{\"status\":\"missing\"}";
        if(!result.equals("{\"status\":\"pending\"}"))RESULTS.remove(id,result);
        return result;
    }
    public static String cancel(String id){if(id!=null)RESULTS.remove(id);return "cancelled";}
    static String quote(String s){
        StringBuilder b=new StringBuilder("\"");
        for(char c:s.toCharArray()){if(c=='"'||c=='\\')b.append('\\').append(c);
            else if(c<' ')b.append(String.format("\\u%04x",(int)c));else b.append(c);}
        return b.append('"').toString();
    }
}
