import * as THREE from './vendor/three.module.js';
import {createNavigator} from './navigation.js?v=1';
export const DECOR_ITEMS={plant:{name:'盆栽',w:.65,d:.65},lamp:{name:'落地灯',w:.65,d:.65},stool:{name:'小凳子',w:.7,d:.7},table:{name:'边桌',w:.85,d:.85},cushion:{name:'坐垫',w:.8,d:.8},rug:{name:'小地毯',w:1.4,d:1}};
export const DECOR_COLORS=['#dfc2bd','#c6d7c5','#c8bfdc','#e6d2aa','#a6becd','#9e806a'];
export function createDecorationSystem({rooms,scene,box,ball,cylinder,round,invalidate,stopWalking}){
 const groups=rooms.map(room=>{const g=new THREE.Group();g.name='custom-decoration';room.add(g);return g}),keys=['','',''];
 let editor=-1,callback=()=>{},preview=null;
 const defaults=rooms.map(room=>{
  const surfaces={wall:[],floor:[],rug:[]};room.children.forEach(o=>{if(!o.isMesh)return;
   if(o.name.startsWith('floor-room'))surfaces.floor.push(o);
   else if(o.position.y===2.08)surfaces.wall.push(o);
   else if(o.geometry.parameters?.depth>2&&o.position.y>.19&&o.position.y<.26)surfaces.rug.push(o);
  });for(const objects of Object.values(surfaces))for(const o of objects){o.material=o.material.clone();o.userData.defaultColor=o.material.color.getHexString()}
  return surfaces;
 });
 function model(item,parent){
  const g=new THREE.Group();g.userData.decorId=item.id;parent.add(g);g.position.set(item.x??0,.20,item.z??0);g.rotation.y=(item.rotation??0)*Math.PI/2;
  const color=item.color??'#b6c7a0';
  if(item.type==='plant'){cylinder(.20,.15,.32,'#ba8b72',0,.16,0,g);cylinder(.02,.025,.55,'#748663',0,.55,0,g);for(let i=0;i<5;i++){const leaf=ball(.14,color,Math.sin(i*2)*.16,.4+i*.1,Math.cos(i*2)*.16,g);leaf.scale.y=.45}}
  if(item.type==='lamp'){cylinder(.23,.23,.06,'#8b756b',0,.03,0,g);cylinder(.025,.025,1.1,'#8b756b',0,.6,0,g);cylinder(.18,.3,.32,color,0,1.25,0,g)}
  if(item.type==='stool'||item.type==='table'){const w=item.type==='table'?.8:.65;round(w,.12,w,color,0,.57,0,.035,g);for(const x of [-w*.32,w*.32])for(const z of [-w*.32,w*.32])box(.07,.5,.07,'#9c8068',x,.26,z,g)}
  if(item.type==='cushion')round(.75,.18,.75,color,0,.12,0,.055,g);
  if(item.type==='rug')round(1.4,.022,1,color,0,.026,0,.008,g);
  return g;
 }
 function dispose(g){g.traverse(o=>{if(o.isMesh){o.geometry.dispose();if(o.userData.previewMaterial)o.material.dispose()}});g.clear()}
 function setRoom(room,config={}){
  if(!rooms[room])return;const key=JSON.stringify(config);if(keys[room]===key)return;keys[room]=key;
  for(const [surface,objects] of Object.entries(defaults[room]))for(const o of objects)o.material.color.set(config.colors?.[surface]??'#'+o.userData.defaultColor);
  dispose(groups[room]);for(const item of config.items??[])if(DECOR_ITEMS[item.type])model(item,groups[room]);invalidate();
 }
 function obstacles(room,exclude){const result=[],root=rooms[room];scene.updateMatrixWorld(true);root.traverse(o=>{
  if(!o.isMesh||o.name.startsWith('floor-')||o.material.visible===false)return;
  for(let p=o;p&&p!==root;p=p.parent)if(p.name==='decor-preview'||p.name.startsWith('resident-')||p.userData.decorId===exclude)return;
  const b=new THREE.Box3().setFromObject(o);if(b.max.y<.35||b.min.y>1.55)return;
  result.push({minX:b.min.x-root.position.x,maxX:b.max.x-root.position.x,minZ:b.min.z-root.position.z,maxZ:b.max.z-root.position.z});
 });return result}
 function canPlace(room,item){
  const spec=DECOR_ITEMS[item.type];if(!spec||!Number.isFinite(item.x)||!Number.isFinite(item.z))return false;
  const p=rooms[room].userData.floorPlan,w=(item.rotation%2?spec.d:spec.w)/2+.08,d=(item.rotation%2?spec.w:spec.d)/2+.08;
  const regions=[p,...(p.wing?[p.wing]:[])];if(!regions.some(r=>item.x-w>=r.minX+.25&&item.x+w<=r.maxX-.25&&item.z-d>=r.minZ+.25&&item.z+d<=r.maxZ-.25))return false;
  // 始终给门洞和日常人物起点留出空间。
  const spawn=[{x:-.9,z:3.7},{x:1.1,z:2.8},{x:-1.2,z:2.3}][room],exit=[{x:-.8,z:-2.7},{x:3.3,z:.95},{x:-3.25,z:2.25}][room];
  if([spawn,exit].some(q=>Math.abs(q.x-item.x)<w+.65&&Math.abs(q.z-item.z)<d+.65))return false;
  const obs=obstacles(room,item.id),rect={minX:item.x-w,maxX:item.x+w,minZ:item.z-d,maxZ:item.z+d};
  if(obs.some(r=>rect.minX<r.maxX&&rect.maxX>r.minX&&rect.minZ<r.maxZ&&rect.maxZ>r.minZ))return false;
  if(item.type==='rug')return true;
  const nav=createNavigator(regions,obs.concat(rect));return Boolean(nav.findPath(spawn,exit));
 }
 function clearPreview(){if(preview){dispose(preview);preview.parent.remove(preview);preview=null}}
 function setEditor(room,item,onChange=()=>{}){clearPreview();editor=room;callback=onChange;stopWalking();if(room<0)return;
  if(item){preview=model(item,rooms[room]);preview.name='decor-preview';preview.userData.item=structuredClone(item);preview.visible=Number.isFinite(item.x)&&Number.isFinite(item.z);preview.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.userData.previewMaterial=true;o.material.transparent=true;o.material.opacity=.55;o.material.color.set(canPlace(room,item)?'#9fc4a4':'#dc8b90')}})}
 }
 function tap(ray){if(editor<0)return false;
  const selected=ray.intersectObjects(groups[editor].children,true)[0];
  if(!preview&&selected){let o=selected.object;while(!o.userData.decorId&&o.parent)o=o.parent;callback({selected:o.userData.decorId});return true}
  if(preview){const hits=ray.intersectObjects(rooms[editor].children.filter(o=>o.name.startsWith('floor-room')));if(hits[0]){
   const p=rooms[editor].worldToLocal(hits[0].point.clone()),item={...preview.userData.item,x:Math.round(p.x*4)/4,z:Math.round(p.z*4)/4};const valid=canPlace(editor,item);callback({item,valid});
  }}return true;
 }
 return {setRoom,setEditor,canPlace,tap,get editing(){return editor>=0}};
}
