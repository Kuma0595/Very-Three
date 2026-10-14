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
   {mode:'idle',point:{x:0,z:4.4}}, {mode:'idle',point:{x:-3.2,z:-5}},
   {mode:'idle',point:world((npc.room+1)%3,1,2.9)}, {mode:'idle',point:world(npc.room,-.7,3.5)}
  ];
  // 多试几条路线；不能到达就短暂停留，不穿越家具。
  for(let i=0;i<choices.length;i++){
   const target=choices[(Math.floor(Math.random()*choices.length)+i)%choices.length];if(target.key&&occupants.has(target.key))continue;
   let destination=target.point;if(target.mode==='cat'||target.mode==='dog'){const angle=npc.index*1.7;destination={x:destination.x+Math.cos(angle)*1.05,z:destination.z+Math.sin(angle)*1.05}}
   const path=nav.findPath(npc.actor.position,destination);if(!path?.length)continue;
   if(target.key)occupants.set(target.key,npc.index);npc.target=target;npc.path=path;npc.mode='walk';npc.timer=30;npc.blocked=0;return;
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
 function update(time,dt,reduced=false){
  const controlled=getControlled(),nav=getNavigator();
  for(const npc of residents){const a=npc.actor;sources[npc.index].visible=false;a.visible=controlled?.index!==npc.index;
   if(!a.visible){release(npc);npc.path=[];npc.mode='idle';npc.timer=3;continue}
   if(!npc.ready){const p=nav.nearest(a.position);if(p){a.position.x=p.x;a.position.z=p.z}npc.ready=true}
   if(!['bed','sit'].includes(npc.mode)&&!nav.canStand(a.position)){const safe=nav.nearest(a.position);if(safe){a.position.x=safe.x;a.position.z=safe.z;npc.path=[];npc.mode='idle';npc.timer=4}}
   if(paused||reduced)continue;
   npc.timer-=dt;
   if(npc.mode==='walk'){
    if(npc.path.length){const point=npc.path[0],dx=point.x-a.position.x,dz=point.z-a.position.z,d=Math.hypot(dx,dz);
     if(d<.03){a.position.x=point.x;a.position.z=point.z;npc.path.shift()}
     else{const distance=Math.min(d,dt*1.35),next=nav.move(a.position,dx/d*distance,dz/d*distance);
      const busy=residents.some(other=>other!==npc&&other.actor.visible&&other.mode!=='bed'&&Math.hypot(other.actor.position.x-next.x,other.actor.position.z-next.z)<.64)||(controlled&&Math.hypot(controlled.actor.position.x-next.x,controlled.actor.position.z-next.z)<.65);
      if(!busy&&Math.hypot(next.x-a.position.x,next.z-a.position.z)>.0001){a.position.x=next.x;a.position.z=next.z;a.rotation.y=Math.atan2(dx,dz);npc.blocked=0}else npc.blocked+=dt;
     }
    }else arrive(npc);
    if(npc.blocked>2||npc.timer<=0){release(npc);npc.path=[];npc.mode='idle';npc.timer=3+Math.random()*3}
   }else if(npc.timer<=0)choose(npc);
   const swing=npc.mode==='walk'&&npc.blocked===0?Math.sin(time*.011+npc.index)*.25:0;
   if(npc.mode!=='bed'&&npc.mode!=='sit')for(const side of ['left','right']){const sign=side==='left'?1:-1;a.getObjectByName(side+'-leg').rotation.x=swing*sign;a.getObjectByName(side+'-arm').rotation.x=-swing*sign}
   if(npc.mode==='cat'||npc.mode==='dog'){a.getObjectByName('right-arm').rotation.x=-.7+Math.sin(time*.006)*.13;a.getObjectByName('right-hand').rotation.x=.2}
  }
 }
 function resume(index,point){const npc=residents[index];if(!npc)return;standing(npc);npc.actor.position.x=point.x;npc.actor.position.z=point.z;npc.mode='idle';npc.timer=4;npc.ready=true}
 function hit(ray){const h=ray.intersectObjects(residents.filter(n=>n.actor.visible).map(n=>n.actor),true)[0];if(!h)return null;let a=h.object;while(a.userData.memberIndex===undefined&&a.parent)a=a.parent;return {distance:h.distance,room:Math.min(a.userData.memberIndex,2)}}
 return {update,resume,hit,setPaused(value){paused=value},getPosition(index){return residents[index]?.actor.position.clone()},getStates(){return residents.map(n=>({index:n.index,mode:n.mode,position:n.actor.position.clone(),visible:n.actor.visible}))}};
}
