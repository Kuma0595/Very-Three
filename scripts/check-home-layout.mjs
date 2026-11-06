import {cell,migrateLayoutConfig} from '../dist/home-layout.js';
import fs from 'node:fs';import assert from 'node:assert/strict';
const base=new URL('../dist/',import.meta.url),noop=()=>{},events={},opened=[],states=[];
const ctx=new Proxy({}, {get:(_,k)=>k==='createImageData'?(w,h)=>({data:new Uint8ClampedArray(w*h*4)}):k==='createLinearGradient'?()=>({addColorStop:noop}):noop,set:()=>true});
globalThis.document={createElement:()=>({getContext:()=>ctx,style:{},addEventListener:noop,append:noop,remove:noop,toDataURL:()=>''})};globalThis.devicePixelRatio=1;globalThis.matchMedia=()=>({matches:true});globalThis.ResizeObserver=class{observe(){}disconnect(){}};globalThis.cancelAnimationFrame=noop;
let frame;globalThis.requestAnimationFrame=fn=>{frame=fn;return 1;};
const prelude=`import * as THREE from '${new URL('vendor/three.module.js',base)}';class OrbitControls{constructor(camera){this.camera=camera;this.target=new THREE.Vector3()}addEventListener(){}update(){this.camera.lookAt(this.target)}dispose(){}}class Renderer{constructor(){this.domElement={addEventListener(k,f){globalThis.playerEvents[k]=f},getBoundingClientRect(){return {left:0,top:0,width:1200,height:650}},remove(){}};this.shadowMap={};}getRenderTarget(){return this.target??null}setRenderTarget(target){this.target=target}readRenderTargetPixels(){}setPixelRatio(){}setSize(){}render(scene,camera){scene.updateMatrixWorld(true);camera.updateMatrixWorld(true)}dispose(){}}\n`;
globalThis.playerEvents=events;
let source=fs.readFileSync(new URL('scene.js',base),'utf8').replace(/from '(\.\/[^']+)'/g,(_,p)=>`from '${new URL(p,base)}'`).replace(/import \* as THREE[^\n]+\n/,'').replace(/import \{ OrbitControls \}[^\n]+\n/,'').replace('new THREE.WebGLRenderer({antialias:true,alpha:true})','new Renderer()').replace('reset(){currentView=-2;','reset(){currentView=-2;').replace('},renderer};','},renderer,scene,camera,getNavigation(){prepareNavigation();return navigator}};');
const {createHome}=await import('data:text/javascript;base64,'+Buffer.from(prelude+source).toString('base64'));
const home=createHome({clientWidth:1200,clientHeight:650,prepend:noop,querySelector:()=>({append:noop,replaceChildren:noop})},id=>opened.push(id),s=>states.push(s));let time=0;const step=(count=1)=>{for(let i=0;i<count;i++){time+=50;frame(time)}};

home.setResidentsPaused(true);home.setResidentNight(true);home.setPlayer(0);step();
const nav=home.getNavigation(),hub=cell(22,17);
for(const [name,x,y] of [['Piggy',12,8],['4010',24,8],['Joey',12,25],['厨房',36,8],['浴室',37,17],['长廊',21,25],['露台',31,23],['石板路',30,31]]){
 const goal=cell(x,y);console.log(name,'stand',nav.canStand(goal),'path',Boolean(nav.findPath(hub,goal)));
 assert(nav.findPath(hub,goal)?.length,name+' 必须与客厅相通');
}
for(const [x,y] of [[11,19.5],[17.5,21],[24.5,21],[35.5,30],[40,22.1],[35,5]])assert.equal(nav.canStand(cell(x,y)),false,'墙体/池塘/菜地/柜体阻挡 '+[x,y]);
for(const i of [0,1,2,3]){
 home.stopWalking();home.setPlayer(i);assert(home.ensurePlayer());
 const bed=home.getFurnitureTargets().find(t=>t.mode==='bed'&&t.owner===Math.min(i,2)&&(t.memberIndex===undefined||t.memberIndex===i));
 assert(bed,'每位住户有床');assert(home.useFurniture(bed),'床旁可到达 '+i);step(900);assert.equal(home.getWalkState().pose,'bed');assert(home.standUp());assert(home.walkTo(hub));step(900);const actor=home.scene.getObjectByName('walking-resident');assert(Math.hypot(actor.position.x-hub.x,actor.position.z-hub.z)<.5,'下床可走回客厅 '+i);
}
const old={colors:{wall:'#c8bfdc'},items:[{id:'keep',type:'plant',x:0,z:6}],furniture:{'r2-bed':{x:1.7,z:-1.72,rotation:1,hidden:true}},outfits:{2:{keep:true}},future:{keep:true}},snapshot=structuredClone(old),migrated=migrateLayoutConfig(2,old);
assert.deepEqual(old,snapshot);assert.deepEqual(migrated.outfits,old.outfits);assert.deepEqual(migrated.future,old.future);assert.equal(migrated.items[0].id,'keep');assert(migrated.furniture['r2-bed'].hidden);assert.deepEqual(migrateLayoutConfig(2,migrated),migrated,'迁移幂等，不重复压缩');
home.dispose();console.log('PASS: pixel floor plan routes, walls/pond/crops, four independent bed approaches/exits and lossless idempotent config migration');
