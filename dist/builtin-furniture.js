import * as THREE from './vendor/three.module.js';

// 原有家具只记录变换，不重建几何体；稳定 ID 与场景建模顺序无关。
export function createBuiltinFurniture(rooms, definitions){
 const entries=new Map(),states=rooms.map(()=>({}));
 for(const def of definitions){
  const room=rooms.indexOf(def.room);if(room<0)continue;
  const parts=def.parts.filter(p=>p.parent);if(!parts.length)continue;
  def.room.updateWorldMatrix(true,true);
  const group=new THREE.Group();group.name='furniture-'+def.id;group.userData.builtinId=def.id;def.room.add(group);
  // attach 保留功能组和内部座位的世界变换，避免家具散架或坐标跳变。
  for(const part of parts)group.attach(part);
  const bounds=new THREE.Box3().setFromObject(group),center=bounds.getCenter(new THREE.Vector3());
  const origin=def.room.worldToLocal(center);origin.y=0;
  group.position.copy(origin);for(const part of group.children)part.position.sub(origin);
  group.updateWorldMatrix(true,true);
  const local=new THREE.Box3();group.traverse(o=>{if(o.isMesh&&o.material.visible!==false){o.geometry.computeBoundingBox();const b=o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld).applyMatrix4(group.matrixWorld.clone().invert());local.union(b)}});
  const size=local.getSize(new THREE.Vector3());
  entries.set(def.id,{...def,room,root:group,base:{x:origin.x,z:origin.z,rotation:0,hidden:false},w:size.x,d:size.z,low:local.max.y<.35});
 }
 function state(id){const e=entries.get(id);return e?{...e.base,...states[e.room][id]}:null}
 function spec(id){const e=entries.get(id);return e?{name:e.name,w:e.w,d:e.d,wall:false,low:e.low}:null}
 function clean(e,value){
  if(!value||!Number.isFinite(value.x)||!Number.isFinite(value.z)||![0,1,2,3].includes(value.rotation)||typeof value.hidden!=='boolean')return null;
  const plan=rooms[e.room].userData.floorPlan;
  if(value.x<plan.minX||value.x>plan.maxX||value.z<plan.minZ||value.z>plan.maxZ)return null;
  return {x:value.x,z:value.z,rotation:value.rotation,hidden:value.hidden};
 }
 function apply(room,config={}){
  states[room]={};for(const [id,e] of entries){if(e.room!==room)continue;
   const s=clean(e,config[id]);if(s)states[room][id]=s;const value=s??e.base;
   e.root.position.set(value.x,0,value.z);e.root.rotation.y=value.rotation*Math.PI/2;e.root.visible=!value.hidden;
  }
 }
 function visible(o){for(let p=o;p;p=p.parent)if(!p.visible)return false;return true}
 return {apply,state,spec,visible,roots:room=>[...entries.values()].filter(e=>e.room===room&&e.root.visible).map(e=>e.root),
  list:room=>[...entries].filter(([,e])=>e.room===room).map(([id,e])=>({id,name:e.name,...state(id)})),
  find(object){for(let p=object;p;p=p.parent)if(p.userData.builtinId)return p.userData.builtinId;return null},
  root:id=>entries.get(id)?.root,
  preview(id){const source=entries.get(id)?.root;if(!source)return null;const clone=o=>{if(o.isMesh&&o.material.visible===false)return null;const copy=o.clone(false);for(const child of o.children){const c=clone(child);if(c)copy.add(c)}return copy};const g=clone(source);g.visible=true;
   g.traverse(o=>{if(o.isMesh){o.geometry=o.geometry.clone();o.material=o.material.clone();if(o.material.map)o.material.map=o.material.map.clone();o.userData.ownedMaterial=false;o.userData.previewMaterial=true}});return g;
  },
 };
}
