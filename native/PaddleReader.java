package com.beanster.bridge;

import ai.onnxruntime.*;
import java.io.*;
import java.nio.*;
import java.util.*;

/** Same CPU implementation on Android and in the desktop regression harness. */
public final class PaddleReader implements AutoCloseable {
    public interface Assets { byte[] read(String name) throws Exception; }
    public interface Cancellation { void check() throws Exception; }
    private final OrtEnvironment env=OrtEnvironment.getEnvironment();
    private final OrtSession det,rec;
    private final List<String> keys=new ArrayList<>();
    public PaddleReader(Assets assets) throws Exception {
        try(OrtSession.SessionOptions opts=new OrtSession.SessionOptions()){
            opts.setIntraOpNumThreads(2);opts.setInterOpNumThreads(1);opts.setSessionLogLevel(OrtLoggingLevel.ORT_LOGGING_LEVEL_ERROR);
            det=env.createSession(assets.read("ocr/paddle/det.onnx"),opts);
            try {rec=env.createSession(assets.read("ocr/paddle/rec.onnx"),opts);}catch(Exception e){det.close();throw e;}
        }
        keys.add("");
        try(BufferedReader in=new BufferedReader(new InputStreamReader(new ByteArrayInputStream(assets.read("ocr/paddle/keys.txt")),"UTF-8"))){String s;while((s=in.readLine())!=null)keys.add(s);}
        keys.add(" ");
    }
    public static final class Line {
        public String text;public double score;public double[] box;
        Line(String t,double s,double[] b){text=t;score=s;box=b;}
    }
    public List<Line> read(byte[] gray,int w,int h,Cancellation cancel) throws Exception {
        cancel.check();
        double scale=Math.min(1,960.0/Math.max(w,h));
        int dw=Math.max(32,(int)Math.round(w*scale/32)*32),dh=Math.max(32,(int)Math.round(h*scale/32)*32);
        float[] input=new float[3*dw*dh];double[] mean={.485,.456,.406},std={.229,.224,.225};
        for(int y=0;y<dh;y++)for(int x=0;x<dw;x++){
            double v=sample(gray,w,h,(x+.5)*w/dw-.5,(y+.5)*h/dh-.5)/255;
            for(int c=0;c<3;c++)input[c*dw*dh+y*dw+x]=(float)((v-mean[c])/std[c]);
        }
        List<double[]> boxes;
        try(OnnxTensor tensor=OnnxTensor.createTensor(env,FloatBuffer.wrap(input),new long[]{1,3,dh,dw});
            OrtSession.Result r=det.run(Collections.singletonMap(det.getInputNames().iterator().next(),tensor))){
            float[][] map=((float[][][][])r.get(0).getValue())[0][0];
            boxes=boxes(map,w,h);
        }
        cancel.check();
        // Prioritize large text if the image contains a dense menu; bound work and memory.
        boxes.sort((a,b)->Double.compare(length(b,0,3),length(a,0,3)));
        if(boxes.size()>48)boxes=new ArrayList<>(boxes.subList(0,48));
        boxes.sort(Comparator.comparingDouble(b->Math.min(b[1],b[3])));
        List<Line> lines=new ArrayList<>();
        for(double[] box:boxes){
            cancel.check();Line line=recognize(gray,w,h,box,false,false);
            if(length(box,0,3)>length(box,0,1)*1.8){
                cancel.check();Line stacked=recognizeStacked(gray,w,h,box);if(stacked!=null&&stacked.score>line.score)line=stacked;
                double[] sideways={box[6],box[7],box[0],box[1],box[2],box[3],box[4],box[5]};
                Line rotated=recognize(gray,w,h,sideways,false,false);if(rotated.score>line.score){rotated.box=box;line=rotated;}
            }
            if(line.score<.78){
                cancel.check();Line enhanced=recognize(gray,w,h,box,true,false);
                if(enhanced.score>line.score+.03)line=enhanced;
            }
            // Orientation retry is local to uncertain lines, never reruns the entire image.
            if(line.score<.65){cancel.check();Line flipped=recognize(gray,w,h,box,false,true);if(flipped.score>line.score+.08)line=flipped;}
            if(!line.text.trim().isEmpty()&&line.score>=.35)lines.add(line);
        }
        return lines;
    }
    private Line recognizeStacked(byte[] gray,int w,int h,double[] b) throws Exception {
        double ratio=length(b,0,3)/Math.max(1,length(b,0,1));int first=Math.max(2,(int)Math.round(ratio));if(first>10)return null;
        Line best=null;
        // DB expansion widens a vertical column, so its aspect ratio underestimates glyph count.
        for(int n=first;n<=Math.min(12,first+2);n++){
            int width=48*n;byte[] strip=new byte[width*48];
            for(int y=0;y<48;y++)for(int x=0;x<width;x++)strip[y*width+x]=(byte)Math.round(crop(gray,w,h,b,(x%48+.5)/48,(x/48+(y+.5)/48)/n));
            Line r=recognize(strip,width,48,new double[]{0,0,width-1,0,width-1,47,0,47},false,false);r.box=b;
            if(r.text.codePointCount(0,r.text.length())==n&&(best==null||r.score>best.score))best=r;
        }
        return best;
    }
    private Line recognize(byte[] gray,int w,int h,double[] b,boolean contrast,boolean flip) throws Exception {
        double bw=length(b,0,1),bh=length(b,0,3);
        int rw=Math.max(16,Math.min(1600,(int)Math.ceil(48*bw/Math.max(1,bh))));
        int tw=Math.max(320,((rw+7)/8)*8);float[] values=new float[3*48*tw];
        double low=0,high=255;
        if(contrast){int[] hist=new int[256];for(int y=0;y<48;y++)for(int x=0;x<rw;x++)hist[(int)crop(gray,w,h,b,(x+.5)/rw,(y+.5)/48)]++;
            int n=0,total=rw*48;for(int i=0;i<256;i++){n+=hist[i];if(n<total*.03)low=i;if(n<total*.97)high=i;}if(high-low<35){low=0;high=255;}}
        for(int y=0;y<48;y++)for(int x=0;x<rw;x++){
            double u=(x+.5)/rw,v=(y+.5)/48;if(flip){u=1-u;v=1-v;}
            double value=crop(gray,w,h,b,u,v);value=Math.max(0,Math.min(255,(value-low)*255/Math.max(1,high-low)));
            for(int c=0;c<3;c++)values[c*48*tw+y*tw+x]=(float)(value/127.5-1);
        }
        try(OnnxTensor t=OnnxTensor.createTensor(env,FloatBuffer.wrap(values),new long[]{1,3,48,tw});
            OrtSession.Result r=rec.run(Collections.singletonMap(rec.getInputNames().iterator().next(),t))){
            float[][] probs=((float[][][])r.get(0).getValue())[0];StringBuilder s=new StringBuilder();double sum=0;int count=0,last=-1;
            if(probs[0].length!=keys.size())throw new IOException("OCR dictionary mismatch: "+probs[0].length+"/"+keys.size());
            for(float[] p:probs){int best=0;for(int i=1;i<p.length;i++)if(p[i]>p[best])best=i;
                if(best!=0&&best!=last){s.append(keys.get(best));sum+=p[best];count++;}last=best;}
            return new Line(s.toString(),count==0?0:sum/count,b);
        }
    }
    private static double crop(byte[] g,int w,int h,double[] b,double u,double v){
        return sample(g,w,h,(1-v)*((1-u)*b[0]+u*b[2])+v*((1-u)*b[6]+u*b[4]),(1-v)*((1-u)*b[1]+u*b[3])+v*((1-u)*b[7]+u*b[5]));
    }
    private static double sample(byte[] g,int w,int h,double x,double y){
        x=Math.max(0,Math.min(w-1,x));y=Math.max(0,Math.min(h-1,y));int ix=(int)x,iy=(int)y,nx=Math.min(w-1,ix+1),ny=Math.min(h-1,iy+1);double dx=x-ix,dy=y-iy;
        return (1-dy)*((1-dx)*(g[iy*w+ix]&255)+dx*(g[iy*w+nx]&255))+dy*((1-dx)*(g[ny*w+ix]&255)+dx*(g[ny*w+nx]&255));
    }
    private static double length(double[] b,int i,int j){return Math.hypot(b[2*i]-b[2*j],b[2*i+1]-b[2*j+1]);}
    private static List<double[]> boxes(float[][] map,int w,int h){
        int mh=map.length,mw=map[0].length;boolean[] seen=new boolean[mw*mh];int[] queue=new int[mw*mh];List<double[]> result=new ArrayList<>();
        for(int start=0;start<seen.length;start++){
            if(seen[start]||map[start/mw][start%mw]<.3)continue;
            int head=0,tail=1;queue[0]=start;seen[start]=true;double score=0;List<double[]> boundary=new ArrayList<>();
            while(head<tail){int i=queue[head++],x=i%mw,y=i/mw;score+=map[y][x];boolean edge=false;
                int[] neighbors={x>0?i-1:-1,x<mw-1?i+1:-1,y>0?i-mw:-1,y<mh-1?i+mw:-1};
                for(int n:neighbors){if(n<0||map[n/mw][n%mw]<.3){edge=true;continue;}if(!seen[n]){seen[n]=true;queue[tail++]=n;}}
                if(edge)boundary.add(new double[]{x,y});
            }
            if(tail<12||score/tail<.6||boundary.size()<4)continue;
            double[] rect=minRect(boundary);double bw=length(rect,0,1),bh=length(rect,0,3);
            if(bh<2||bw<3)continue;
            // DB unclip distance approximated on the oriented rectangle.
            double expand=bw*bh*1.5/(2*(bw+bh));double cx=0,cy=0;for(int j=0;j<4;j++){cx+=rect[j*2]/4;cy+=rect[j*2+1]/4;}
            double ux=(rect[2]-rect[0])/bw,uy=(rect[3]-rect[1])/bw,vx=(rect[6]-rect[0])/bh,vy=(rect[7]-rect[1])/bh;
            for(int j=0;j<4;j++){double a=(j==0||j==3?-1:1)*(bw/2+expand),b=(j<2?-1:1)*(bh/2+expand);rect[j*2]=(cx+a*ux+b*vx)*w/mw;rect[j*2+1]=(cy+a*uy+b*vy)*h/mh;}
            result.add(rect);if(result.size()>=150)break;
        }
        // Rejoin fragments of the same tilted text line before recognition.
        boolean changed=true;
        while(changed){changed=false;
            outer:for(int i=0;i<result.size();i++)for(int j=i+1;j<result.size();j++){
                double[] a=result.get(i),b=result.get(j);double aw=length(a,0,1),ah=length(a,0,3),bw=length(b,0,1),bh=length(b,0,3);
                if(aw<ah||bw<bh||Math.max(ah,bh)>Math.min(ah,bh)*1.65)continue;
                double ux=(a[2]-a[0])/aw,uy=(a[3]-a[1])/aw,cos=ux*(b[2]-b[0])/bw+uy*(b[3]-b[1])/bw;
                if(cos<.975)continue;
                double dx=(b[0]+b[4]-a[0]-a[4])/2,dy=(b[1]+b[5]-a[1]-a[5])/2;
                double perpendicular=Math.abs(-uy*dx+ux*dy),gap=Math.abs(ux*dx+uy*dy)-(aw+bw)/2;
                if(perpendicular>Math.min(ah,bh)*.35||gap>Math.max(ah,bh)*1.2||gap< -Math.min(aw,bw)*.4)continue;
                List<double[]> points=new ArrayList<>();for(int k=0;k<4;k++){points.add(new double[]{a[k*2],a[k*2+1]});points.add(new double[]{b[k*2],b[k*2+1]});}
                result.set(i,minRect(points));result.remove(j);changed=true;break outer;
            }
        }
        return result;
    }
    private static double cross(double[] o,double[] a,double[] b){return (a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);}
    private static double[] minRect(List<double[]> points){
        points.sort((a,b)->a[0]==b[0]?Double.compare(a[1],b[1]):Double.compare(a[0],b[0]));
        List<double[]> hull=new ArrayList<>();for(double[] p:points){while(hull.size()>=2&&cross(hull.get(hull.size()-2),hull.get(hull.size()-1),p)<=0)hull.remove(hull.size()-1);hull.add(p);}
        int lower=hull.size();for(int i=points.size()-2;i>=0;i--){double[] p=points.get(i);while(hull.size()>lower&&cross(hull.get(hull.size()-2),hull.get(hull.size()-1),p)<=0)hull.remove(hull.size()-1);hull.add(p);}hull.remove(hull.size()-1);
        double best=Double.MAX_VALUE;double[] out=new double[8];
        for(int i=0;i<hull.size();i++){double[] p=hull.get(i),q=hull.get((i+1)%hull.size());double angle=Math.atan2(q[1]-p[1],q[0]-p[0]);
            while(angle>Math.PI/4)angle-=Math.PI/2;while(angle< -Math.PI/4)angle+=Math.PI/2;
            double u=Math.cos(angle),v=Math.sin(angle),minA=1e9,maxA=-1e9,minB=1e9,maxB=-1e9;
            for(double[] t:hull){double a=t[0]*u+t[1]*v,b=-t[0]*v+t[1]*u;minA=Math.min(minA,a);maxA=Math.max(maxA,a);minB=Math.min(minB,b);maxB=Math.max(maxB,b);}
            double area=(maxA-minA)*(maxB-minB);if(area<best){best=area;double[] a={minA,maxA,maxA,minA},b={minB,minB,maxB,maxB};for(int j=0;j<4;j++){out[j*2]=a[j]*u-b[j]*v;out[j*2+1]=a[j]*v+b[j]*u;}}
        }
        return out;
    }
    public void close() throws OrtException {det.close();rec.close();}
}
