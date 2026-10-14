import * as THREE from './vendor/three.module.js';
// 四个人共享地面寻路；动作是当前浏览器的日常模拟，不写入云端位置。
export function createResidents({scene,sources,models,rooms,seats,getNavigator,getControlled,getCat,getDog,onPet}){
 const occupants=new Map();let paused=false;
 const residents=models.map(({actor},index)=>{
  actor.name='resident-npc-'+index;actor.userData.memberIndex=index;scene.add(actor);sources[index].visible=false;
  const room=Math.min(index,2),spawn=[[-.9,3.7],[1.1,2.8],[-1.2,2.3],[.7,5.9]][index],p=rooms[room].position;
  actor.position.set(p.x+spawn[0],.63,p.z+spawn[1]);actor.rotation.set(0,Math.PI,0);
  return {index,actor,room,mode:'idle',timer:3+index*4,path:[],target:null,blocked:0,ready:false};
 });
 function release(npc){if(npc.target?.key&&occupants.get(npc.target.key)===npc.index)occupants.delete(npc.target.key);npc.target=null}
 function standing(npc){npc.actor.rotation.x=0;npc.actor.rotation.z=0;npc.actor.position.y=.63;
  for(const side of ['left','right']){const x=side==='left'?-.13:.13;npc.actor.getObjectByName(side+'-leg').rotation.set(0,0,0);npc.actor.getObjectByName(side+'-shoe').position.set(x,-.36,.10);npc.actor.getObjectByName(side+'-arm').rotation.x=0}
 }
 function choose(npc){const nav=getNavigator();release(npc);standing(npc);const safe=nav.nearest(npc.actor.position);if(safe){npc.actor.position.x=safe.x;npc.actor.position.z=safe.z}
  const world=(room,x,z)=>({x:rooms[room].position.x+x,z:rooms[room].position.z+z});
  const seat=seats[npc.index],bedX=npc.room===2?(npc.index===3?2.2:1.2):1.7;
  const choices=[
   {mode:'sit',key:'seat-'+npc.index,point:world(npc.room,npc.index===3?.7:seat.local.x,npc.index===3?5.9:seat.local.z+1),dock:seat.world,rotation:seat.rotation},
   {mode:'bed',key:'bed-'+npc.index,point:world(npc.room,-.5,-1.5),dock:{...world(npc.room,bedX,-1.55),y:1.15},rotation:0},
   {mode:'cat',key:'cat',point:getCat()}, {mode:'dog',key:'dog',point:getDog()},
   {mode:'idle',point:{x:0,z:7.8}}, {mode:'idle',point:{x:0,z:15.3}},
   {mode:'idle',point:world((npc.room+1)%3,1,2.9)}, {mode:'idle',point:world(npc.room,-.7,3.5)}
  ];
  // 多试几条路线；不能到达就短暂停留，不穿越家具。
  for(let i=0;i<choices.length;i++){
   const target=choices[(Math.floor(Math.random()*choices.length)+i)%choices.length];if(target.key&&occupants.has(target.key))continue;
   let destination=target.point;if(target.mode==='cat'||target.mode==='dog'){const angle=npc.index*1.7;destination={x:destination.x+Math.cos(angle)*1.05,z:destination.z+Math.sin(angle)*1.05}}
   const path=nav.findPath(npc.actor.position,destination);if(!path?.length)continue;
   if(target.key)occupants.set(target.key,npc.index);npc.target=target;npc.path=path;npc.mode='walk';npc.timer=Math.max(30,path.reduce((sum,p,i)=>sum+(i?Math.hypot(p.x-path[i-1].x,p.z-path[i-1].z):0),0)/1.35+10);npc.blocked=0;return;
  }
  npc.mode='idle';npc.timer=5;
 }
 function arrive(npc){npc.path=[];npc.mode=npc.target.mode;npc.timer=12+Math.random()*15;
  const a=npc.actor,target=npc.target;
  if(target.dock){a.position.set(target.dock.x,target.dock.y,target.dock.z);a.rotation.y=target.rotation??0}
  if(npc.mode==='bed'){a.rotation.x=-Math.PI/2;npc.timer=22+Math.random()*18}
  if(npc.mode==='sit'){for(const side of ['left','right']){const x=side==='left'?-.13:.13;a.getObjectByName(side+'-leg').rotation.x=-Math.PI/2;a.getObjectByName(side+'-shoe').position.set(x,-.13,.42)}}
  if(npc.mode==='cat'||npc.mode==='dog'){const pet=npc.mode==='cat'?getCat():getDog();a.rotation.y=Math.atan2(pet.x-a.position.x,pet.z-a.position.z);onPet(npc.mode);npc.timer=6}
 }
 function blockers(exclude){return residents.filter(n=>n.index!==exclude&&n.actor.visible&&!['bed','sit'].includes(n.mode)).map(n=>({minX:n.actor.position.x-.23,maxX:n.actor.position.x+.23,minZ:n.actor.position.z-.23,maxZ:n.actor.position.z+.23}))}
 function clear(p,index){const controlled=getControlled();return !residents.some(n=>n.index!==index&&n.actor.visible&&!['bed','sit'].includes(n.mode)&&Math.hypot(n.actor.position.x-p.x,n.actor.position.z-p.z)<.66)&&!(controlled&&controlled.index!==index&&Math.hypot(controlled.actor.position.x-p.x,controlled.actor.position.z-p.z)<.68)}
 function safePosition(point,index){const nav=getNavigator(),nearest=nav.canStand(point)?{x:point.x,z:point.z}:nav.nearest(point);if(nearest&&clear(nearest,index))return nearest;
  const origin=nearest??point;for(const radius of [.75,1.2,1.8,2.5,3])for(let i=0;i<16;i++){const angle=i*Math.PI/8,p={x:origin.x+Math.cos(angle)*radius,z:origin.z+Math.sin(angle)*radius};if(nav.canStand(p)&&clear(p,index))return p}return null;
 }
 function nudge(npc,threat){if(npc.yieldPath?.length&&npc.yieldTimer>0)return;if(['bed','sit'].includes(npc.mode))return;const nav=getNavigator(),p=npc.actor.position,dx=p.x-threat.x,dz=p.z-threat.z,d=Math.hypot(dx,dz)||1;
  const candidates=[];for(const distance of [.85,1.35,1.8])for(const angle of [Math.PI/2,-Math.PI/2,0,Math.PI/4,-Math.PI/4]){const x=dx/d,z=dz/d;const q={x:p.x+(x*Math.cos(angle)-z*Math.sin(angle))*distance,z:p.z+(x*Math.sin(angle)+z*Math.cos(angle))*distance};if(nav.canStand(q)&&clear(q,npc.index)){const path=nav.findPath(p,q,blockers(npc.index));if(path?.length)candidates.push({q,path,score:Math.hypot(q.x-threat.x,q.z-threat.z)+Math.abs(angle)*.1})}}
  candidates.sort((a,b)=>b.score-a.score);if(candidates.length){npc.yieldPath=candidates[0].path;npc.yieldTimer=3;}
 }
 function resolveMove(start,next,index){const blocked=residents.filter(n=>n.index!==index&&n.actor.visible&&!['bed','sit'].includes(n.mode)&&Math.hypot(n.actor.position.x-next.x,n.actor.position.z-next.z)<.66);
  if(!blocked.length)return next;for(const npc of blocked)nudge(npc,start);
  const nav=getNavigator(),dx=next.x-start.x,dz=next.z-start.z;
  for(const sign of [1,-1]){const side=nav.move(start,-dz*sign,dx*sign);if(Math.hypot(side.x-start.x,side.z-start.z)>.001&&clear(side,index))return side}return {x:start.x,z:start.z};
 }
 function update(time,dt,reduced=false){
  const controlled=getControlled(),nav=getNavigator();
  for(const npc of residents){const a=npc.actor;sources[npc.index].visible=false;a.visible=controlled?.index!==npc.index;
   if(!a.visible){release(npc);npc.path=[];npc.yieldPath=[];npc.mode='idle';npc.timer=3;continue}
   if(!npc.ready){const p=safePosition(a.position,npc.index);if(p){a.position.x=p.x;a.position.z=p.z}npc.ready=true}
   if(!['bed','sit'].includes(npc.mode)&&!nav.canStand(a.position)){const safe=safePosition(a.position,npc.index);if(safe){a.position.x=safe.x;a.position.z=safe.z;npc.path=[];npc.mode='idle';npc.timer=4}}
   if(paused)continue;
   if(npc.yieldPath?.length){const q=npc.yieldPath[0],dx=q.x-a.position.x,dz=q.z-a.position.z,d=Math.hypot(dx,dz);if(d<.05)npc.yieldPath.shift();else{const p=nav.move(a.position,dx/d*Math.min(d,dt*1.7),dz/d*Math.min(d,dt*1.7));if(clear(p,npc.index)){a.position.x=p.x;a.position.z=p.z;a.rotation.y=Math.atan2(dx,dz)}}npc.yieldTimer-=dt;if(npc.yieldTimer<=0)npc.yieldPath=[];if(!npc.yieldPath.length&&npc.path.length){const goal=npc.path.at(-1);npc.path=nav.findPath(a.position,goal,blockers(npc.index))??npc.path}continue}
   if(reduced)continue;
   npc.timer-=dt;
   if(npc.mode==='walk'){
    if(npc.path.length){const point=npc.path[0],dx=point.x-a.position.x,dz=point.z-a.position.z,d=Math.hypot(dx,dz);
     if(d<.03){a.position.x=point.x;a.position.z=point.z;npc.path.shift()}
     else{const distance=Math.min(d,dt*1.35),next=nav.move(a.position,dx/d*distance,dz/d*distance);
      const busy=residents.some(other=>other!==npc&&other.actor.visible&&other.mode!=='bed'&&Math.hypot(other.actor.position.x-next.x,other.actor.position.z-next.z)<.64)||(controlled&&Math.hypot(controlled.actor.position.x-next.x,controlled.actor.position.z-next.z)<.65);
      if(busy){for(const other of residents)if(other!==npc&&other.actor.visible&&!['bed','sit'].includes(other.mode)&&Math.hypot(other.actor.position.x-next.x,other.actor.position.z-next.z)<.66&&(npc.index<other.index||other.mode!=='walk'))nudge(other,a.position)}
      if(!busy&&Math.hypot(next.x-a.position.x,next.z-a.position.z)>.0001){a.position.x=next.x;a.position.z=next.z;a.rotation.y=Math.atan2(dx,dz);npc.blocked=0}else npc.blocked+=dt;
     }
    }else arrive(npc);
    if(npc.blocked>1&&npc.path.length){const replanned=nav.findPath(a.position,npc.path.at(-1),blockers(npc.index));if(replanned?.length){npc.path=replanned;npc.blocked=0}else nudge(npc,npc.path[0])}
    if(npc.blocked>4||npc.timer<=0){release(npc);npc.path=[];npc.mode='idle';npc.timer=3+Math.random()*3}
   }else if(npc.timer<=0)choose(npc);
   const swing=npc.mode==='walk'&&npc.blocked===0?Math.sin(time*.011+npc.index)*.25:0;
   if(npc.mode!=='bed'&&npc.mode!=='sit')for(const side of ['left','right']){const sign=side==='left'?1:-1;a.getObjectByName(side+'-leg').rotation.x=swing*sign;a.getObjectByName(side+'-arm').rotation.x=-swing*sign}
   if(npc.mode==='cat'||npc.mode==='dog'){a.getObjectByName('right-arm').rotation.x=-.7+Math.sin(time*.006)*.13;a.getObjectByName('right-hand').rotation.x=.2}
  }
 }
 function resume(index,point){const npc=residents[index];if(!npc)return;standing(npc);npc.actor.position.x=point.x;npc.actor.position.z=point.z;npc.mode='idle';npc.timer=4;npc.ready=true}
 function hit(ray){const h=ray.intersectObjects(residents.filter(n=>n.actor.visible).map(n=>n.actor),true)[0];if(!h)return null;let a=h.object;while(a.userData.memberIndex===undefined&&a.parent)a=a.parent;return {distance:h.distance,room:Math.min(a.userData.memberIndex,2)}}
 return {update,resume,hit,resolveMove,blockers,safePosition,setPaused(value){paused=value},getPosition(index){return residents[index]?.actor.position.clone()},getStates(){return residents.map(n=>({index:n.index,mode:n.mode,position:n.actor.position.clone(),visible:n.actor.visible}))}};
}
