import {client,currentMember} from './cloud.js?v=1';
import {DECOR_ITEMS,DECOR_COLORS} from './decoration-scene.js?v=1';
export function setupDecoration({home,focus,notify}){
 const button=document.createElement('button');button.id='decorate-room';button.textContent='布置我的房间';button.type='button';document.querySelector('.focus-summary').append(button);
 const drawer=document.createElement('section');drawer.className='decor-editor';drawer.hidden=true;drawer.setAttribute('aria-label','布置房间');document.querySelector('main').append(drawer);
 let records=[],ready=false,editing=false,draft=null,history=[],selected=null,valid=false,busy=false,version=0;
 const empty=()=>({colors:{},items:[]}),room=()=>currentMember().id;
 async function sync(){if(busy)return;try{const {data,error}=await client.from('vt_decor').select('*');if(error){ready=false;return}ready=true;records=data;for(const row of data)if(!editing||row.room_id!==room())home()?.setDecorRoom(row.room_id,row.config)}catch{} }
 function push(){history.push(structuredClone(draft));if(history.length>30)history.shift()}
 function preview(){home()?.setDecorRoom(room(),draft);home()?.setDecorationEditor(room(),selected,change=>{
  if(change.selected){selected=structuredClone(draft.items.find(i=>i.id===change.selected));valid=true;preview();render()}
  if(change.item){selected=change.item;valid=change.valid;preview();render()}
 });}
 function render(){
  drawer.innerHTML=`<div class="decor-heading"><strong>布置我的房间</strong><button data-action="cancel" ${busy?'disabled':''} aria-label="退出布置">×</button></div><p class="decor-tip" role="status">${selected?valid?'位置可以摆放，点击确定':'点房间地面选位置；红色表示不能摆放':'点选已摆放的物件，或添加一件小装饰'}</p><div class="decor-colors">${[['wall','墙面'],['floor','地板'],['rug','原有地毯']].map(([key,label])=>`<label>${label}<select data-color="${key}" aria-label="${label}颜色"><option value="">原配色</option>${DECOR_COLORS.map((c,i)=>`<option value="${c}" ${draft.colors[key]===c?'selected':''}>${['暖粉','浅绿','淡紫','奶油','雾蓝','木棕'][i]}</option>`).join('')}</select></label>`).join('')}</div><div class="decor-catalog">${Object.entries(DECOR_ITEMS).map(([key,v])=>`<button data-add="${key}" ${draft.items.length>=12?'disabled':''}>＋ ${v.name}</button>`).join('')}</div>${selected?`<div class="decor-selection"><span>${DECOR_ITEMS[selected.type].name}</span><button data-action="rotate">旋转 90°</button><button data-action="place" ${valid?'':'disabled'}>确定</button><button data-action="remove">${draft.items.some(i=>i.id===selected.id)?'收回':'取消添加'}</button></div>`:''}<div class="decor-footer"><button data-action="undo" ${history.length?'':'disabled'}>撤销</button><button data-action="reset">恢复默认</button><button class="primary" data-action="save" ${busy||selected?'disabled':''}>${busy?'保存中…':'保存布置'}</button></div><small>最多 12 件 · 只修改自己的房间 · 保存后共享</small>`;
  drawer.querySelectorAll('[data-color]').forEach(b=>b.onchange=()=>{push();if(b.value)draft.colors[b.dataset.color]=b.value;else delete draft.colors[b.dataset.color];preview();render()});
  drawer.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>{selected={id:crypto.randomUUID(),type:b.dataset.add,rotation:0,color:DECOR_COLORS[room()]};valid=false;preview();render()});
  drawer.querySelectorAll('[data-action]').forEach(b=>b.onclick=async()=>{
   if(busy)return;const action=b.dataset.action;
   if(action==='cancel'){finish(false);return}
   if(action==='rotate'){selected.rotation=(selected.rotation+1)%4;valid=home().canPlaceDecor(room(),selected)}
   if(action==='place'&&valid){push();draft.items=draft.items.filter(i=>i.id!==selected.id).concat(selected);selected=null}
   if(action==='remove'){if(draft.items.some(i=>i.id===selected.id)){push();draft.items=draft.items.filter(i=>i.id!==selected.id)}selected=null}
   if(action==='undo'){draft=history.pop();selected=null}
   if(action==='reset'){push();draft=empty();selected=null}
   if(action==='save'){
    busy=true;render();try{const {data,error}=await client.rpc('vt_save_decor',{p_config:draft,p_version:version});if(error)throw error;const row=Array.isArray(data)?data[0]:data;records=records.filter(r=>r.room_id!==room()).concat(row);finish(true);notify('房间布置已保存，朋友也能看到啦')}
    catch(error){notify(error.message?.includes('其他设备')?'其他设备更新了房间，请退出后重新布置':'布置保存未完成，请检查网络后重试')}finally{busy=false;if(editing)render()}return;
   }
   preview();render();
  });
 }
 function finish(saved){editing=false;drawer.hidden=true;document.body.classList.remove('decorating');home()?.setDecorationEditor(-1,null);const row=records.find(r=>r.room_id===room());home()?.setDecorRoom(room(),row?.config??empty());selected=null;void sync()}
 button.onclick=async()=>{if(!home()){notify('3D 场景尚未准备好');return}await sync();if(!ready){notify('装饰功能需要先在 Supabase 执行 decoration.sql');return}const row=records.find(r=>r.room_id===room());version=row?.version??0;draft=structuredClone(row?.config??empty());history=[];selected=null;editing=true;document.querySelector('#panel').close();focus(room());drawer.hidden=false;document.body.classList.add('decorating');preview();render()};
 const timer=setInterval(sync,10000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)void sync()});window.addEventListener('pagehide',()=>clearInterval(timer));void sync();
 return {get editing(){return editing}};
}
