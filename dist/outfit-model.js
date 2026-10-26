import * as THREE from './vendor/three.module.js';
import {normalizeOutfit} from './outfits.js?v=1';

// 每次换装只拥有自己的新增几何体和材质，不修改角色、家具共用的材质。
const owned=new WeakMap();
export function releaseOutfit(actor){
 const state=owned.get(actor);if(!state)return;
 for(const {node,material,visible} of state.originals){if(node.material!==material)node.material.dispose();node.material=material;node.visible=visible}
 for(const node of state.added){node.removeFromParent();node.geometry.dispose();node.material.dispose()}
 owned.delete(actor);
}
export function applyOutfit(actor,index,value){
 releaseOutfit(actor);const outfit=normalizeOutfit(value,index),state={originals:[],added:[]};owned.set(actor,state);
 const width=index===0?.59:index===2?.56:.44,front=index===0?.305:.175,skin=['#e5b196','#b98365','#efc5a8','#ddb799'][index];
 function remember(node){if(!state.originals.some(entry=>entry.node===node))state.originals.push({node,material:node.material,visible:node.visible})}
 function paint(node,color){remember(node);node.material=node.material.clone();node.material.color.set(color)}
 function add(geometry,color,x,y,z,parent=actor){const node=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color,roughness:.86}));node.position.set(x,y,z);node.castShadow=true;node.receiveShadow=true;node.userData.outfitPart=true;parent.add(node);state.added.push(node);return node}
 const box=(w,h,d,c,x,y,z,p)=>add(new THREE.BoxGeometry(w,h,d),c,x,y,z,p);
 const ball=(r,c,x,y,z,p)=>add(new THREE.SphereGeometry(r,16,12),c,x,y,z,p);
 const tube=(r,h,c,x,y,z,p)=>add(new THREE.CylinderGeometry(r,r,h,16),c,x,y,z,p);
 const nodes=[];actor.traverse(node=>{if(node.isMesh)nodes.push(node)});
 for(const node of nodes){const part=node.userData.clothingPart;
  if(part==='top')paint(node,outfit.top.color);
  if(part==='top-print'||part==='top-detail'){remember(node);node.visible=outfit.top.style==='original'}
  if(part==='accessory'){remember(node);node.visible=outfit.accessory.style==='original'}
 }
 for(const side of ['left','right']){
  const leg=actor.getObjectByName(side+'-leg'),shoe=actor.getObjectByName(side+'-shoe'),arm=actor.getObjectByName(side+'-arm');
  paint(leg,outfit.bottom.style==='shorts'?skin:outfit.bottom.color);paint(shoe,outfit.shoes.color);
  if(outfit.bottom.style==='shorts')box(index===2?.216:.16,.26,.216,outfit.bottom.color,0,.12,0,leg);
  if(outfit.bottom.style==='trousers'){box(.012,.37,.012,'#f4e6d9',side==='left'?-.072:.072,0,.104,leg);box(.07,.07,.012,outfit.bottom.color,0,.13,.107,leg)}
  if(outfit.top.style!=='original')tube(.098,outfit.top.style==='tee'?.16:.31,outfit.top.color,0,outfit.top.style==='tee'?.10:.02,0,arm);
  if(outfit.shoes.style!=='original'){
   box(.181,.045,.265,'#f4e6d9',0,-.063,0,shoe);
   if(outfit.shoes.style==='sneakers')for(const y of [0,.025,.05])box(.095,.01,.012,'#f4e6d9',0,y,.127,shoe);
   else box(.175,.17,.19,outfit.shoes.color,0,.115,-.025,shoe);
  }
 }
 if(outfit.top.style==='hoodie'){
  const hood=ball(.17,outfit.top.color,0,.55,-.10);hood.scale.set(1.15,.85,.75);box(width*.55,.11,.025,outfit.top.color,0,.23,front);
  for(const x of [-.045,.045]){box(.012,.16,.012,'#f4e6d9',x,.44,front);ball(.012,'#f4e6d9',x,.36,front)}
 }
 if(outfit.top.style==='jacket'){
  box(width*.29,.34,.025,outfit.top.color,-width*.31,.35,front);box(width*.29,.34,.025,outfit.top.color,width*.31,.35,front);
  box(width*.29,.32,.02,'#f4e6d9',0,.35,front+.005);for(const x of [-width*.23,width*.23])box(.075,.055,.012,'#bda77e',x,.29,front+.025);
 }
 if(outfit.top.style==='shirt'){
  for(const sign of [-1,1]){const collar=box(.10,.095,.025,'#f4e6d9',sign*.055,.53,front);collar.rotation.z=sign*.4}
  for(const y of [.26,.35,.44])ball(.012,'#f4e6d9',0,y,front+.008);
 }
 const accent=outfit.accessory.color;
 if(outfit.accessory.style==='glasses'){
  for(const x of [-.082,.082])add(new THREE.TorusGeometry(.064,.01,8,20),accent,x,.76,.283);
  box(.045,.014,.02,accent,0,.76,.283);
 }
 if(outfit.accessory.style==='headphones'){
  add(new THREE.TorusGeometry(.28,.026,8,24,Math.PI),accent,0,.78,.025);
  for(const x of [-.28,.28]){const pad=tube(.084,.065,accent,x,.76,.02);pad.rotation.z=Math.PI/2}
 }
 if(outfit.accessory.style==='beanie'){
  add(new THREE.SphereGeometry(.273,20,16,0,Math.PI*2,0,Math.PI*.5),accent,0,.83,.015);
  tube(.271,.075,accent,0,.84,.015);ball(.055,accent,0,1.10,.015);
 }
 if(outfit.accessory.style==='scarf'){
  tube(.16,.07,accent,0,.59,.02);box(.09,.22,.035,accent,.085,.47,front+.025);
 }
 return outfit;
}
