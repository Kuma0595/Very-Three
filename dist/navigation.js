// 在连续地板上寻路，门洞可通过；墙体和家具使用水平包围盒避让。
export function createNavigator(floors,obstacles,{radius=.40,step=.25}={}){
 const contains=(r,p)=>p.x>=r.minX&&p.x<=r.maxX&&p.z>=r.minZ&&p.z<=r.maxZ;
 const onFloor=p=>floors.some(r=>contains(r,p));
 function canStand(p){
  if(!onFloor(p))return false;
  for(let n=0;n<8;n++){const a=n*Math.PI/4;if(!onFloor({x:p.x+Math.cos(a)*radius,z:p.z+Math.sin(a)*radius}))return false}
  return !obstacles.some(r=>p.x>r.minX-radius&&p.x<r.maxX+radius&&p.z>r.minZ-radius&&p.z<r.maxZ+radius);
 }
 function clearLine(a,b){
  // 精确检查线段与扩张后的家具包围盒，避免采样漏过门框角落。
  for(const r of obstacles){
   let near=0,far=1,intersects=true;
   for(const axis of ['x','z']){
    const min=r[axis==='x'?'minX':'minZ']-radius,max=r[axis==='x'?'maxX':'maxZ']+radius,delta=b[axis]-a[axis];
    if(Math.abs(delta)<1e-9){if(a[axis]<=min||a[axis]>=max){intersects=false;break}}
    else{const one=(min-a[axis])/delta,two=(max-a[axis])/delta;near=Math.max(near,Math.min(one,two));far=Math.min(far,Math.max(one,two));if(near>=far){intersects=false;break}}
   }
   if(intersects&&near<1&&far>0)return false;
  }
  const count=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.05);
  for(let n=1;n<=count;n++){const t=n/count;if(!canStand({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t}))return false}
  return true;
 }
 const minX=Math.min(...floors.map(r=>r.minX)),minZ=Math.min(...floors.map(r=>r.minZ));
 const width=Math.ceil((Math.max(...floors.map(r=>r.maxX))-minX)/step),depth=Math.ceil((Math.max(...floors.map(r=>r.maxZ))-minZ)/step);
 const point=key=>({x:minX+(key%width+.5)*step,z:minZ+(Math.floor(key/width)+.5)*step});
 const walkable=new Uint8Array(width*depth);
 for(let key=0;key<walkable.length;key++)walkable[key]=canStand(point(key))?1:0;
 function nearestKey(p,limit=1.5){
  let best=-1,distance=Infinity;const ix=Math.floor((p.x-minX)/step),iz=Math.floor((p.z-minZ)/step),range=Math.ceil(limit/step);
  for(let z=Math.max(0,iz-range);z<=Math.min(depth-1,iz+range);z++)for(let x=Math.max(0,ix-range);x<=Math.min(width-1,ix+range);x++){
   const key=z*width+x;if(!walkable[key])continue;const q=point(key),d=Math.hypot(q.x-p.x,q.z-p.z);
   if(d<distance&&d<=limit&&(!canStand(p)||clearLine(p,q))){best=key;distance=d}
  }
  return best;
 }
 function findPath(start,end,extra=[]){
  const usable=extra.length?walkable.slice():walkable;
  const blocked=p=>extra.some(r=>p.x>r.minX-radius&&p.x<r.maxX+radius&&p.z>r.minZ-radius&&p.z<r.maxZ+radius);
  if(extra.length)for(const r of extra){for(let z=Math.max(0,Math.floor((r.minZ-radius-minZ)/step));z<=Math.min(depth-1,Math.ceil((r.maxZ+radius-minZ)/step));z++)for(let x=Math.max(0,Math.floor((r.minX-radius-minX)/step));x<=Math.min(width-1,Math.ceil((r.maxX+radius-minX)/step));x++){const key=z*width+x;if(blocked(point(key)))usable[key]=0}}
  const dynamicLine=(a,b)=>{if(!clearLine(a,b))return false;const count=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.05);for(let i=1;i<=count;i++){const t=i/count;if(blocked({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t}))return false}return true};
  const from=nearestKey(start);let to=nearestKey(end,.9);
  if(to>=0&&!usable[to]){to=-1;let best=.95;for(let key=0;key<usable.length;key++){if(!usable[key])continue;const p=point(key),distance=Math.hypot(p.x-end.x,p.z-end.z);if(distance<best){best=distance;to=key}}}
  if(extra.length&&from>=0)usable[from]=1;if(from<0||to<0)return null;
  const cost=new Float64Array(walkable.length).fill(Infinity),parent=new Int32Array(walkable.length).fill(-1),closed=new Uint8Array(walkable.length),heap=[];
  const estimate=key=>Math.hypot(key%width-to%width,Math.floor(key/width)-Math.floor(to/width));
  function push(value){heap.push(value);let i=heap.length-1;while(i){const p=(i-1)>>1;if(heap[p].score<=value.score)break;heap[i]=heap[p];i=p}heap[i]=value}
  function pop(){const first=heap[0],last=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let child=i*2+1;if(child+1<heap.length&&heap[child+1].score<heap[child].score)child++;if(heap[child].score>=last.score)break;heap[i]=heap[child];i=child}heap[i]=last}return first}
  cost[from]=0;push({key:from,score:estimate(from)});
  while(heap.length){
   const key=pop().key;if(closed[key])continue;closed[key]=1;
   if(key===to){
    const path=[];for(let k=to;k!==-1;k=parent[k])path.push(point(k));path.reverse();
    if(canStand(end)&&!blocked(end)&&dynamicLine(path.at(-1),end))path.push({x:end.x,z:end.z});
    // 合并直线段，减少行走时的小幅转向。
    const result=[];let anchor=start,index=0;
    while(index<path.length){let last=index;while(last+1<path.length&&dynamicLine(anchor,path[last+1]))last++;result.push(path[last]);anchor=path[last];index=last+1}
    return result;
   }
   const x=key%width,z=Math.floor(key/width);
   for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
    if(!dx&&!dz)continue;const nx=x+dx,nz=z+dz;if(nx<0||nx>=width||nz<0||nz>=depth)continue;
    const next=nz*width+nx;if(!usable[next]||closed[next])continue;
    if(dx&&dz&&(!usable[z*width+nx]||!usable[nz*width+x]))continue;
    const candidate=cost[key]+(dx&&dz?Math.SQRT2:1);
    if(candidate<cost[next]){cost[next]=candidate;parent[next]=key;push({key:next,score:candidate+estimate(next)})}
   }
  }
  return null;
 }
 function move(p,dx,dz){
  const count=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.08));let q={...p};
  for(let n=0;n<count;n++){
   const next={x:q.x+dx/count,z:q.z+dz/count};
   if(canStand(next))q=next;
   else{const horizontal={x:next.x,z:q.z};if(canStand(horizontal))q=horizontal;const vertical={x:q.x,z:next.z};if(canStand(vertical))q=vertical}
  }
  return q;
 }
 return {canStand,findPath,move,nearest(p){const key=nearestKey(p,3);return key<0?null:point(key)},roomAt(p){return floors.find(r=>contains(r,p))?.room??-1}};
}
