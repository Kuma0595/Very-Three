import fs from 'node:fs';
import assert from 'node:assert/strict';
// 控制器集成测试：模拟 RPC 返回、版本冲突和场景回调，不连接业务数据库。
class Element{
 constructor(){this.hidden=false;this.dataset={};this.nodes=[];this.open=false;this.value=''}
 set innerHTML(value){this.html=value;this.nodes=[];for(const m of value.matchAll(/<(button|select)\b([^>]*)>/g)){const node=new Element();node.disabled=/\bdisabled\b/.test(m[2]);for(const a of m[2].matchAll(/data-([\w-]+)="([^"]*)"/g))node.dataset[a[1]]=a[2];this.nodes.push(node)}}
 querySelectorAll(selector){const m=selector.match(/^\[data-([\w-]+)(?:="([^"]*)")?\]$/);return m?this.nodes.filter(n=>m[1] in n.dataset&&(m[2]===undefined||n.dataset[m[1]]===m[2])):[]}
 querySelector(selector){return this.querySelectorAll(selector)[0]}
 append(){}after(){}addEventListener(){}setAttribute(){}close(){this.open=false}showModal(){this.open=true}
}
const created=[],panel=new Element(),holder=new Element();globalThis.document={createElement(){const el=new Element();created.push(el);return el},querySelector:s=>s==='#panel'?panel:holder,body:{append(){},classList:{add(){},remove(){}}},addEventListener(){}};
globalThis.window={addEventListener(){}};globalThis.setInterval=()=>1;
let own={room_id:0,version:7,config:{colors:{},items:[]}},common={id:1,version:2,config:{colors:{},items:[]}},change,preview,fail=false,calls=[];const notices=[];
const original={x:1.7,z:-1.7,rotation:0,hidden:false},id='r0-bed';
globalThis.__decorClient={from(table){const q={select(){return q},eq(){return q},maybeSingle:async()=>({data:{config:{}},error:null}),then(a,b){return Promise.resolve({data:table==='vt_decor'?[structuredClone(own)]:table==='vt_common_decor'?[structuredClone(common)]:[],error:null}).then(a,b)}};return q},async rpc(name,args){calls.push({name,args:structuredClone(args)});if(fail)return {error:{message:'其他设备已更新房间'}};assert.equal(args.p_version,own.version);own={...own,version:own.version+1,config:structuredClone(args.p_config)};return {data:structuredClone(own),error:null}}};
const state=()=>preview?.furniture?.[id]??original;
const home={setDecorCatalog(){},setDecorRoom(room,value){preview=structuredClone(value)},setDecorationEditor(room,item,cb){if(cb)change=cb},getBuiltinFurniture:()=>[{id,name:'原配床',...state()}],getBuiltinState:state,getBuiltinSpec:()=>({name:'原配床',w:3,d:3}),canPlaceDecor:()=>true};
const base=new URL('../dist/',import.meta.url);let source=fs.readFileSync(new URL('decoration.js',base),'utf8').replace(/import \{client,currentMember,currentRoom\}[^\n]+/,'const client=globalThis.__decorClient,currentRoom=()=>0;').replace(/from '(\.\/[^']+)'/g,(_,p)=>`from '${new URL(p,base)}'`);
const {setupDecoration}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const controller=setupDecoration({home:()=>home,focus(){},notify:t=>notices.push(t)}),[button,,drawer]=created;
const click=async action=>{const node=drawer.querySelector(`[data-action="${action}"]`);assert(node&&!node.disabled,action+' enabled');await node.onclick()};
const choose=async()=>{if(!drawer.querySelector(`[data-furniture="${id}"]`))await click('furniture');await drawer.querySelector(`[data-furniture="${id}"]`).onclick()};
await button.onclick();assert(controller.editing);await choose();change({item:{builtin:id,type:'builtin',x:-2,z:1,rotation:1,hidden:false},valid:true});await click('place');await click('save');assert.equal(controller.editing,false);assert.equal(calls[0].name,'vt_save_decor');assert.deepEqual(own.config.furniture[id],{x:-2,z:1,rotation:1,hidden:false});assert.equal(calls[0].args.p_version,7);
await button.onclick();await choose();await click('remove');assert.equal(preview.furniture[id].hidden,true);await click('undo');assert.equal(preview.furniture[id].hidden,false);await choose();await click('remove');await click('save');assert(own.config.furniture[id].hidden);
await button.onclick();await choose();assert(drawer.querySelector('[data-action="place"]').disabled,'stored furniture needs placement confirmation');change({item:{builtin:id,type:'builtin',x:-1,z:2,rotation:0,hidden:false},valid:true});await click('place');await click('cancel');assert.equal(preview.furniture[id].hidden,true,'cancel restores cloud record');
await button.onclick();await click('reset');assert.deepEqual(preview.furniture,{});await click('undo');assert.equal(preview.furniture[id].hidden,true);fail=true;await click('save');assert(controller.editing,'conflict retains draft');assert(notices.at(-1).includes('其他设备'));assert.equal(own.version,9);await click('cancel');
console.log('PASS: editor movement/save RPC, version checks, storage/retrieve, undo, cancel, reset and conflict retention');
