package com.beanster.bridge;

import java.io.*;
import java.lang.reflect.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicBoolean;

/** Asynchronous, offline Tesseract bridge. No Android UI work on the reader thread. */
public final class NativeReader {
    private static final ExecutorService WORKER=Executors.newSingleThreadExecutor();
    private static final AtomicBoolean BUSY=new AtomicBoolean();
    private static final ConcurrentHashMap<String,String> RESULTS=new ConcurrentHashMap<>();
    private static Object engine;
    private static Class<?> api;
    private static long handle;
    private static String version="";
    public static String capabilities(){return "native-async-1";}
    private static Object call(Object o,String name,Class<?>[] types,Object... args) throws Exception {
        return o.getClass().getMethod(name,types).invoke(o,args);
    }
    private static synchronized void initialize(Object activity) throws Exception {
        if(handle!=0)return;
        File files=(File)call(activity,"getFilesDir",new Class<?>[0]);
        File dir=new File(files,"reader181/tessdata");
        if(!dir.isDirectory()&&!dir.mkdirs())throw new IOException("data-directory");
        File data=new File(dir,"chi_sim.traineddata");
        if(!data.isFile()){
            Object assets=call(activity,"getAssets",new Class<?>[0]);
            File temp=new File(dir,"chi_sim.tmp");
            try(InputStream in=(InputStream)call(assets,"open",new Class<?>[]{String.class},"ocr/chi_sim.traineddata");
                OutputStream out=new FileOutputStream(temp)){
                byte[] block=new byte[65536];int n;while((n=in.read(block))!=-1)out.write(block,0,n);
            }
            if(!temp.renameTo(data))throw new IOException("data-copy");
        }
        System.loadLibrary("c++_shared");System.loadLibrary("leptonica");System.loadLibrary("tesseract");System.loadLibrary("tesseract_jni");
        api=Class.forName("dev.ffmpegkit.tesseract.TesseractJNI");
        engine=api.getConstructor().newInstance();
        handle=(Long)api.getMethod("nativeInit",String.class,String.class,int.class).invoke(engine,dir.getAbsolutePath(),"chi_sim",1);
        if(handle==0)throw new IOException("reader-init");
        version=String.valueOf(api.getMethod("nativeGetVersion").invoke(engine));
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
                    api.getMethod("nativeSetPageSegMode",long.class,int.class).invoke(engine,handle,psm);
                    api.getMethod("nativeSetImage",long.class,byte[].class,int.class,int.class,int.class,int.class)
                        .invoke(engine,handle,pixels,w,h,1,w);
                    String text=String.valueOf(api.getMethod("nativeGetUTF8Text",long.class).invoke(engine,handle));
                    result="{\"status\":\"done\",\"text\":"+quote(text)+",\"engine\":"+quote("Tesseract "+version)+
                        ",\"elapsedMs\":"+((System.nanoTime()-started)/1000000)+"}";
                }catch(Throwable error){
                    result="{\"status\":\"error\",\"error\":"+quote(error.getClass().getSimpleName())+"}";
                    if(handle!=0)try{api.getMethod("nativeEnd",long.class).invoke(engine,handle);}catch(Throwable ignored){}
                    handle=0;
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
