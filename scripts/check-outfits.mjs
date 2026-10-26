import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {OUTFIT_ITEMS,defaultOutfit,normalizeOutfit,mergeOutfit,outfitFromConfig} from '../dist/outfits.js';
import {applyOutfit,releaseOutfit} from '../dist/outfit-model.js';
import {createWardrobeStore} from '../dist/wardrobe-store.js';

// 不连接业务数据库：覆盖共用卧室、完整配置合并、保存确认和版本冲突。
const next=defaultOutfit(2);next.top={style:'hoodie',color:'#a4bfae'};next.bottom.style='shorts';next.shoes.style='boots';next.accessory.style='beanie';
const original={colors:{wall:'#c8bfdc'},items:[{id:'keep',type:'plant'}],furniture:{'r2-bed':{x:1,z:2,rotation:1,hidden:false}},outfits:{3:defaultOutfit(3)},future:{keep:true}};
const merged=mergeOutfit(original,2,next);assert.deepEqual(merged.outfits[3],original.outfits[3]);assert.deepEqual(merged.furniture,original.furniture);assert.deepEqual(merged.future,original.future);assert.equal(original.outfits[2],undefined);assert.deepEqual(outfitFromConfig({},3),defaultOutfit(3));
assert.deepEqual(normalizeOutfit({top:{style:'<script>',color:'url(secret)'}},2),defaultOutfit(2));assert.throws(()=>mergeOutfit({},2,next));assert.throws(()=>mergeOutfit(original,5,next));
let member={id:2,user_id:'joey'},record={room_id:2,version:7,config:structuredClone(original)},fail=null,ack=true,calls=[],readError=null;
const client={from(){return {async select(){if(readError)return {error:readError};return {data:[structuredClone(record)]}}}},async rpc(name,args){calls.push({name,args:structuredClone(args)});if(fail)return {error:fail};assert.equal(args.p_version,record.version);record={room_id:2,version:record.version+1,config:structuredClone(args.p_config)};return {data:ack?structuredClone(record):null}}};
const store=createWardrobeStore(client,()=>member);await store.save(next);assert.equal(calls[0].name,'vt_save_decor');assert.equal(calls[0].args.p_version,7);assert.deepEqual(record.config.outfits[3],original.outfits[3]);assert.deepEqual(record.config.items,original.items);
member={id:3,user_id:'zakery'};const partner=defaultOutfit(3);partner.shoes.style='sneakers';await store.save(partner);assert.deepEqual(record.config.outfits[2],next);assert.equal(record.config.outfits[3].shoes.style,'sneakers');assert.equal(calls[1].args.p_version,8);
fail={message:'其他设备已更新房间'};const before=structuredClone(record);await assert.rejects(store.save(partner));assert.deepEqual(record,before);fail=null;
ack=false;await assert.rejects(store.save(partner),/未收到/);ack=true;readError={message:'offline'};const called=calls.length;await assert.rejects(store.save(partner));assert.equal(calls.length,called,'读取失败绝不从空房间覆盖数据');readError=null;
member=null;await assert.rejects(store.save(next),/家人账号/);

// 四种体型的材质、动画关节和原有资源不能因换装互相影响。
const shared=new THREE.MeshStandardMaterial({color:'#bda77e'});
function actor(){const root=new THREE.Group();for(const name of ['top','top-print','top-detail','accessory','left-leg','right-leg','left-shoe','right-shoe','left-arm','right-arm']){const node=new THREE.Mesh(new THREE.BoxGeometry(.2,.2,.2),shared);node.name=name;if(['top','top-print','top-detail','accessory'].includes(name))node.userData.clothingPart=name;root.add(node)}return root}
for(let index=0;index<4;index++){
 const root=actor(),neighbor=actor(),leg=root.getObjectByName('left-leg');leg.rotation.x=-Math.PI/2;const geometry=leg.geometry;let disposed=false;geometry.addEventListener('dispose',()=>disposed=true);const pose=leg.rotation.clone();
 for(const slot of Object.keys(OUTFIT_ITEMS))for(const [style] of OUTFIT_ITEMS[slot]){
  const outfit=defaultOutfit(index);outfit[slot].style=style;outfit[slot].color='#a4bfae';applyOutfit(root,index,outfit);
  assert(leg.rotation.equals(pose),'坐卧关节保持不变');assert.strictEqual(leg.geometry,geometry);assert.equal(disposed,false);assert.equal(shared.color.getHexString(),'bda77e');assert.strictEqual(neighbor.getObjectByName('top').material,shared);
 }
 applyOutfit(root,index,next);const added=[];root.traverse(node=>{if(node.userData.outfitPart)added.push(node)});assert(added.length>0);let cleaned=0;for(const node of added)node.geometry.addEventListener('dispose',()=>cleaned++);
 applyOutfit(root,index,defaultOutfit(index));assert.equal(cleaned,added.length,'旧服装几何体全部释放');assert(root.getObjectByName('top-print').visible);assert(root.getObjectByName('accessory').visible);
 releaseOutfit(root);assert.equal(root.children.length,10);assert.strictEqual(root.getObjectByName('top').material,shared);assert.equal(disposed,false);
}
console.log('PASS: outfit defaults/validation, shared-room identities, lossless config merge, CAS/conflict/offline/unconfirmed-save handling, all styles on four bodies, independent materials, pose preservation and resource cleanup');
