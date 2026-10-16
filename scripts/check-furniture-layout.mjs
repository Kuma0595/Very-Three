import fs from 'node:fs';import assert from 'node:assert/strict';
const base=new URL('../dist/',import.meta.url),noop=()=>{},events={},opened=[],states=[];
const ctx=new Proxy({}, {get:(_,k)=>k==='createImageData'?(w,h)=>({data:new Uint8ClampedArray(w*h*4)}):k==='createLinearGradient'?()=>({addColorStop:noop}):noop,set:()=>true});
globalThis.document={createElement:()=>({getContext:()=>ctx,style:{},addEventListener:noop,append:noop,remove:noop,toDataURL:()=>''})};globalThis.devicePixelRatio=1;globalThis.matchMedia=()=>({matches:true});globalThis.ResizeObserver=class{observe(){}disconnect(){}};globalThis.cancelAnimationFrame=noop;
let frame;globalThis.requestAnimationFrame=fn=>{frame=fn;return 1;};
const prelude=`import * as THREE from '${new URL('vendor/three.module.js',base)}';class OrbitControls{constructor(camera){this.camera=camera;this.target=new THREE.Vector3()}addEventListener(){}update(){this.camera.lookAt(this.target)}dispose(){}}class Renderer{constructor(){this.domElement={addEventListener(k,f){globalThis.playerEvents[k]=f},getBoundingClientRect(){return {left:0,top:0,width:1200,height:650}},remove(){}};this.shadowMap={};}setPixelRatio(){}setSize(){}render(scene,camera){scene.updateMatrixWorld(true);camera.updateMatrixWorld(true)}dispose(){}}\n`;
globalThis.playerEvents=events;
let source=fs.readFileSync(new URL('scene.js',base),'utf8').replace(/from '(\.\/[^']+)'/g,(_,p)=>`from '${new URL(p,base)}'`).replace(/import \* as THREE[^\n]+\n/,'').replace(/import \{ OrbitControls \}[^\n]+\n/,'').replace('new THREE.WebGLRenderer({antialias:true,alpha:true})','new Renderer()').replace('reset(){currentView=-2;','reset(){currentView=-2;').replace('},renderer};','},renderer,scene,camera,getNavigation(){prepareNavigation();return navigator}};');
const {createHome}=await import('data:text/javascript;base64,'+Buffer.from(prelude+source).toString('base64'));
const home=createHome({clientWidth:1200,clientHeight:650,prepend:noop,querySelector:()=>({append:noop,replaceChildren:noop})},id=>opened.push(id),s=>states.push(s));let time=0;const step=(count=1)=>{for(let i=0;i<count;i++){time+=50;frame(time)}};

home.setResidentsPaused(true);home.setPlayer(0);step();
const config=furniture=>({colors:{},items:[],furniture}),v=(x,y,z)=>new home.camera.position.constructor(x,y,z);
const root=id=>home.scene.getObjectByName('furniture-'+id);
const beforeCount=()=>{let n=0;home.scene.traverse(o=>{if(o.isMesh)n++});return n};
for(let room=0;room<4;room++){
 const list=home.getBuiltinFurniture(room);assert(list.length>=8,`room ${room} includes its original furniture`);assert.equal(new Set(list.map(e=>e.id)).size,list.length);
 for(const entry of list){const r=root(entry.id);assert(r&&r.parent);assert(r.children.length);assert(Number.isFinite(entry.x));}
 console.log('room',room,':',list.map(i=>i.name).join(' / '));
}
// 每件原有家具均可创建/清除预览；取消选择不销毁原模型几何体与照片纹理。
const count=beforeCount();for(let room=0;room<4;room++)for(const entry of home.getBuiltinFurniture(room)){
 let disposed=false;const original=root(entry.id);original.traverse(o=>{if(o.isMesh)o.geometry.addEventListener('dispose',()=>disposed=true)});
 home.setDecorationEditor(room,{builtin:entry.id,type:'builtin',...entry});assert.equal(original.visible,false);home.setDecorationEditor(-1,null);assert.equal(original.visible,true);assert.equal(disposed,false,entry.id+' original geometry retained');
}assert.equal(beforeCount(),count);
// 每组原有家具在腾空房间后都能找到合法的新位置，避免只接入清单却无法摆放。
for(let room=0;room<4;room++){
 const all=home.getBuiltinFurniture(room),stored=Object.fromEntries(all.map(e=>[e.id,{x:e.x,z:e.z,rotation:e.rotation,hidden:true}]));home.setDecorRoom(room,config(stored));
 for(const entry of all){let found=false;for(let z=room===3?3:-2;z<(room===3?11:8)&&!found;z+=1)for(let x=room===3?-14:-4;x<(room===3?13:3)&&!found;x+=1){if(home.canPlaceDecor(room,{builtin:entry.id,type:'builtin',x,z,rotation:0})){found=true;break}}assert(found,entry.id+' has a valid placement')}
 home.setDecorRoom(room,{colors:{},items:[]});
}
const bedId='r0-bed',original=home.getBuiltinState(bedId),bedTarget=()=>home.getFurnitureTargets().find(t=>t.mode==='bed'&&t.owner===0);
// 清空原有家具以验证可用位置、移动后睡眠锚点与人物旋转，不修改任何数据库。
let hidden=Object.fromEntries(home.getBuiltinFurniture(0).map(e=>[e.id,{x:e.x,z:e.z,rotation:e.rotation,hidden:true}]));
home.setDecorRoom(0,config(hidden));assert.equal(bedTarget(),undefined,'stored bed is not interactive');home.setResidentNight(true);step();assert.notEqual(home.getResidentStates()[0].mode,'bed','no phantom bed at old position');
const placement={builtin:bedId,type:'builtin',x:-2.8,z:0,rotation:1,hidden:false};assert(home.canPlaceDecor(0,placement),'bed fits empty interior');
assert.equal(home.canPlaceDecor(0,{...placement,x:-.9,z:8}),false,'door clearance protected');assert.equal(home.canPlaceDecor(0,{...placement,x:50}),false,'outside room rejected');
hidden[bedId]={x:placement.x,z:placement.z,rotation:placement.rotation,hidden:false};home.setDecorRoom(0,config(hidden));step();const target=bedTarget(),expected=target.root.localToWorld(v(...target.slots[0].dock)),npc=home.getResidentStates()[0];assert(npc.position.distanceTo(expected)<.001,'sleep follows moved bed');assert.equal(root(bedId).rotation.y,Math.PI/2);
assert(home.ensurePlayer());assert(home.useFurniture(target));step(600);assert.equal(home.getWalkState().pose,'bed');let actor=home.scene.getObjectByName('walking-resident');assert(actor.position.distanceTo(expected)<.001);assert(Math.abs(actor.rotation.y-Math.PI/2)<.001);assert(home.standUp());assert(home.getNavigation().canStand(actor.position));
// 正在使用的原有家具收到新布局时安全解除，再按新锚点运行。
assert(home.useFurniture(target));step(600);hidden[bedId].hidden=true;home.setDecorRoom(0,config(hidden));step();assert.equal(home.getWalkState().active,false);assert.equal(bedTarget(),undefined);
// 老数据没有 furniture 字段时，恢复默认且保留旧装饰的兼容路径。
home.setDecorRoom(0,{colors:{},items:[]});assert.deepEqual(home.getBuiltinState(bedId),original);assert(root(bedId).visible);assert(bedTarget());
const sofaId='r3-living-sofa',sofaOriginal=home.getBuiltinState(sofaId);home.setDecorRoom(3,config({[sofaId]:{...sofaOriginal,rotation:3}}));const sofa=home.getFurnitureTargets().find(t=>t.mode==='sit'&&t.slots.length===3);const dir=v(0,0,1).applyQuaternion(sofa.root.getWorldQuaternion(new home.camera.quaternion.constructor()));assert(dir.x<-.99,'270-degree rotation retains sign');
// 不可信/旧版本布局参数不会让场景变成 NaN、越界或隐藏全部物件。
home.setDecorRoom(0,config({[bedId]:{x:Infinity,z:0,rotation:0,hidden:true},unknown:{x:0,z:0,rotation:0,hidden:true}}));assert.deepEqual(home.getBuiltinState(bedId),original);
home.setDecorRoom(3,{colors:{},items:[]});assert.deepEqual(home.getBuiltinState(sofaId),sofaOriginal);
home.dispose();console.log('PASS: full furniture registry, non-destructive preview, moved/rotated bed interaction and NPC sleep, storage, door bounds, legacy/default restore and invalid data');
