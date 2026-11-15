/* Curve fitting uses Potrace WASM 1.0.4 (GPL-2.0, vendored locally). */
(function(root){
const num=v=>Math.round(v*100)/100;
function hueBucket(c){const max=Math.max(c.r,c.g,c.b),min=Math.min(c.r,c.g,c.b),d=max-min;if(max<65||d/max<.38)return -1;let h=max===c.r?((c.g-c.b)/d+6)%6:max===c.g?(c.b-c.r)/d+2:(c.r-c.g)/d+4;return Math.round(h*2)%12;}
function paletteFor(data,count,preserve=true){
 const bins=new Map();for(let i=0;i<data.length;i+=4){if(data[i+3]<200)continue;const key=(data[i]>>5)*64+(data[i+1]>>5)*8+(data[i+2]>>5);let b=bins.get(key);if(!b){b={n:0,r:0,g:0,b:0};bins.set(key,b);}b.n++;b.r+=data[i];b.g+=data[i+1];b.b+=data[i+2];}
 const total=[...bins.values()].reduce((n,b)=>n+b.n,0),candidates=[...bins.values()].sort((a,b)=>b.n-a.n).map(b=>({r:Math.round(b.r/b.n),g:Math.round(b.g/b.n),b:Math.round(b.b/b.n),a:255,n:b.n}));
 const palette=[{r:255,g:255,b:255,a:255}],distance=(p,c)=>(p.r-c.r)**2+(p.g-c.g)**2+(p.b-c.b)**2;
 for(const c of candidates){if(c.n<Math.max(15,total*.004))continue;const hi=Math.max(c.r,c.g,c.b),lo=Math.min(c.r,c.g,c.b);if(hi>160&&(hi-lo)/hi<.25)continue;if(Math.max(c.r,c.g,c.b)-Math.min(c.r,c.g,c.b)<25&&c.r>25&&c.r<240)continue;if(palette.every(p=>distance(p,c)>1000))palette.push(c);if(palette.length>=count+1)break;}
 if(preserve){const covered=new Set(palette.map(hueBucket));for(const c of candidates){if(c.n<Math.max(6,total*.00003))continue;const hue=hueBucket(c);if(hue<0||covered.has(hue))continue;if(palette.every(p=>distance(p,c)>1200)){palette.push(c);covered.add(hue);}if(palette.length>=count+9)break;}}
 return palette;
}
function removeBackground(data,w,h){
 const out=new Uint8ClampedArray(data),seeds=[0,w-1,(h-1)*w,w*h-1],refs=seeds.filter(i=>data[i*4+3]>200).map(i=>[data[i*4],data[i*4+1],data[i*4+2]]);if(!refs.length)return out;
 const seen=new Uint8Array(w*h),queue=new Int32Array(w*h);let head=0,tail=0;
 function push(i){if(seen[i])return;seen[i]=1;const j=i*4;if(data[j+3]<20||refs.some(c=>(data[j]-c[0])**2+(data[j+1]-c[1])**2+(data[j+2]-c[2])**2<4500)){queue[tail++]=i;out[j+3]=0;}}
 for(let x=0;x<w;x++){push(x);push((h-1)*w+x);}for(let y=0;y<h;y++){push(y*w);push(y*w+w-1);}while(head<tail){const i=queue[head++],x=i%w;if(x)push(i-1);if(x<w-1)push(i+1);if(i>=w)push(i-w);if(i<w*(h-1))push(i+w);}return out;
}
// Neutral shadows can be tinted by the image's light background. Normalize
// that tint before merging shades, so a fading black arc remains one shape.
function flattenShading(data){
 const bins=new Map();for(let i=0;i<data.length;i+=4){if(data[i+3]<200)continue;const r=data[i],g=data[i+1],b=data[i+2],hi=Math.max(r,g,b),lo=Math.min(r,g,b);if(lo<155||hi-lo>70)continue;const key=(r>>4)*256+(g>>4)*16+(b>>4);let v=bins.get(key);if(!v){v={n:0,r:0,g:0,b:0};bins.set(key,v);}v.n++;v.r+=r;v.g+=g;v.b+=b;}
 let best=null;for(const b of bins.values())if(!best||b.n>best.n)best=b;const bg=best?[best.r/best.n,best.g/best.n,best.b/best.n]:[255,255,255],out=data.slice();
 for(let i=0;i<data.length;i+=4){if(data[i+3]<20)continue;const nr=data[i]/bg[0],ng=data[i+1]/bg[1],nb=data[i+2]/bg[2],hi=Math.max(nr,ng,nb),lo=Math.min(nr,ng,nb);if(hi<.08||(hi-lo)/hi<.28){const v=hi<.94?0:255;out[i]=out[i+1]=out[i+2]=v;}}
 return out;
}
function medianRGB(data,w,h){const out=data.slice(),samples=[[],[],[]];for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){for(let c=0;c<3;c++){const v=samples[c];let n=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)v[n++]=data[((y+dy)*w+x+dx)*4+c];v.sort((a,b)=>a-b);out[(y*w+x)*4+c]=v[4];}}return out;}
function cleanLabels(labels,w,h,preserve,palette){
 const original=labels.slice(),votes=new Uint8Array(64);
 for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){votes.fill(0);const i=y*w+x;let best=original[i],n=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const k=original[i+dy*w+dx];if(++votes[k]>n){n=votes[k];best=k;}}if(votes[original[i]]<=4&&n>=5)labels[i]=best;}
 const seen=new Uint8Array(w*h),q=new Int32Array(w*h);for(let start=0;start<labels.length;start++){if(seen[start]||!labels[start])continue;const k=labels[start];let head=0,tail=1;q[0]=start;seen[start]=1;while(head<tail){const i=q[head++],x=i%w;for(const j of [x?i-1:-1,x<w-1?i+1:-1,i>=w?i-w:-1,i<w*(h-1)?i+w:-1])if(j>=0&&!seen[j]&&labels[j]===k){seen[j]=1;q[tail++]=j;}}const col=palette[k],neutral=col&&Math.max(col.r,col.g,col.b)-Math.min(col.r,col.g,col.b)<25;if(tail<(neutral?48:preserve?8:20))for(let j=0;j<tail;j++)labels[q[j]]=0;}
}
// Smooth binary boundaries at subpixel resolution before fitting Bézier curves.
function smoothMask(rgba,w,h,level){
 if(!level)return {data:rgba,w,h,factor:1};
 const sigma=[0,.4,.65,.9][Math.min(3,level)],radius=Math.ceil(sigma*3),kernel=[];let sum=0;for(let i=-radius;i<=radius;i++){const v=Math.exp(-i*i/(2*sigma*sigma));kernel.push(v);sum+=v;}for(let i=0;i<kernel.length;i++)kernel[i]/=sum;
 const tmp=new Float32Array(w*h),field=new Float32Array(w*h);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){let v=0;for(let k=-radius;k<=radius;k++)v+=(rgba[(y*w+Math.max(0,Math.min(w-1,x+k)))*4]===0?1:0)*kernel[k+radius];tmp[y*w+x]=v;}
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){let v=0;for(let k=-radius;k<=radius;k++)v+=tmp[Math.max(0,Math.min(h-1,y+k))*w+x]*kernel[k+radius];field[y*w+x]=v;}
 const factor=w*h<=1000000?2:1,sw=w*factor,sh=h*factor,out=new Uint8ClampedArray(sw*sh*4);
 for(let y=0;y<sh;y++){const fy=Math.max(0,Math.min(h-1,(y+.5)/factor-.5)),y0=Math.floor(fy),y1=Math.min(h-1,y0+1),ty=fy-y0;for(let x=0;x<sw;x++){const fx=Math.max(0,Math.min(w-1,(x+.5)/factor-.5)),x0=Math.floor(fx),x1=Math.min(w-1,x0+1),tx=fx-x0;const v=field[y0*w+x0]*(1-tx)*(1-ty)+field[y0*w+x1]*tx*(1-ty)+field[y1*w+x0]*(1-tx)*ty+field[y1*w+x1]*tx*ty;const j=(y*sw+x)*4,b=v>=.5?0:255;out[j]=out[j+1]=out[j+2]=b;out[j+3]=255;}}
 return {data:out,w:sw,h:sh,factor};
}
async function trace(data,w,h,options={}){
 const {threshold=128,invert=false,alpha=false,minArea=3,tolerance=.6,smooth=0,mode='dark',colors=12,preserveDetails=true,dropBackground=false,ignoreShading=true,smoothing=2}=options;
 if(dropBackground)data=removeBackground(data,w,h);
 const regions=mode==='colors';if(regions&&minArea>0)data=medianRGB(data,w,h);
 if(regions&&ignoreShading)data=flattenShading(data);
 const palette=regions?paletteFor(data,colors,preserveDetails):[{r:255,g:255,b:255,a:255},{r:0,g:0,b:0,a:255}];
 const labels=new Uint8Array(w*h);
 for(let i=0;i<labels.length;i++){const j=i*4;if(regions){if(data[j+3]<threshold)continue;let best=Infinity,index=0;for(let k=0;k<palette.length;k++){const p=palette[k],d=(p.r-data[j])**2+(p.g-data[j+1])**2+(p.b-data[j+2])**2;if(d<best){best=d;index=k;}}labels[i]=index;}else{const lum=.2126*data[j]+.7152*data[j+1]+.0722*data[j+2];labels[i]=alpha?(data[j+3]>=threshold?1:0):(data[j+3]>20&&(invert?lum>=threshold:lum<threshold)?1:0);}}
 if(regions&&minArea>0)cleanLabels(labels,w,h,preserveDetails,palette);
 const raster=new Uint8ClampedArray(w*h*4);const paths=[];let nodes=0,contours=0;
 const convert=typeof module!=='undefined'?require('./vendor/potrace.js').loadFromCanvas:root.loadFromCanvas;
 for(let k=1;k<palette.length;k++){
  for(let i=0;i<labels.length;i++){const v=labels[i]===k?0:255;raster[i*4]=raster[i*4+1]=raster[i*4+2]=v;raster[i*4+3]=255;}
  // Remove isolated speckles; preserve thin connected marks and counters.
  const mask=raster.slice();if(minArea>0)for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=y*w+x;if(mask[i*4])continue;let same=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(mask[((y+dy)*w+x+dx)*4]===0)same++;if(same<=2)raster[i*4]=raster[i*4+1]=raster[i*4+2]=255;}
  const refined=smoothMask(raster,w,h,smoothing);
  const raw=await convert({width:refined.w,height:refined.h,getContext:()=>({getImageData:()=>({data:refined.data})})});
  let transform=(raw.match(/<g[^>]*transform="([^"]+)"/)||[])[1]||'';
  if(refined.factor!==1)transform=`scale(${1/refined.factor}) `+transform;
  for(const m of raw.matchAll(/<path[^>]*d="([^"]+)"/g)){const d=m[1];if(!d.trim())continue;nodes+=(d.match(/[-+]?(?:\d*\.)?\d+/g)||[]).length/2;contours+=(d.match(/m/gi)||[]).length;const p=palette[k];paths.push({d,outer:d,transform,strokeScale:10*refined.factor,color:`rgb(${p.r},${p.g},${p.b})`});}
 }
 return {paths,nodes:Math.round(nodes),contours,w,h,regions,palette:palette.slice(1).map(p=>({r:p.r,g:p.g,b:p.b})),preserveDetails};
}
function svg(result,{color='#192822',width=100,style='outline',strokeWidth=.65,outerOnly=false,background=null}={}){
 if(!/^#[a-f0-9]{6}$/i.test(color))color='#192822';width=Math.max(1,Math.min(2000,Number(width)||100));strokeWidth=Math.max(.1,Math.min(5,Number(strokeWidth)||.65));
 const backdrop=typeof background==='string'&&/^#[a-f0-9]{6}$/i.test(background)?`<rect width="${result.w}" height="${result.h}" fill="${background}"/>`:'';
 const paths=result.paths.map(p=>`<g transform="${p.transform||''}"><path d="${outerOnly?p.outer:p.d}" fill="${style==='outline'?'none':style==='color'?p.color:color}" stroke="${style==='outline'?color:'none'}" stroke-width="${p.transform?strokeWidth*(p.strokeScale||10):strokeWidth}" stroke-linejoin="round" stroke-linecap="round" fill-rule="evenodd"/></g>`).join('');
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}mm" height="${num(width*result.h/result.w)}mm" viewBox="0 0 ${result.w} ${result.h}" role="img" aria-label="Tracé vectoriel"><title>Tracé vectoriel Rom3D</title>${backdrop}${paths}</svg>`;
}
root.VectorTrace={trace,svg};if(typeof module!=='undefined')module.exports=root.VectorTrace;
})(typeof window!=='undefined'?window:globalThis);
