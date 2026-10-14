import {client,currentMember,currentRoom} from './cloud.js?v=2';
import {DECOR_ITEMS,DECOR_COLORS,DECOR_PAGES} from './decoration-scene.js?v=7';
export function setupDecoration({home,focus,notify}){
 const button=document.createElement('button');button.id='decorate-room';button.textContent='布置我的房间';button.type='button';document.querySelector('.focus-summary').append(button);
 const commonButton=document.createElement('button');commonButton.id='decorate-living';commonButton.textContent='布置客厅 · 大家一起';commonButton.type='button';button.after(commonButton);
 const drawer=document.createElement('section');drawer.className='decor-editor';drawer.hidden=true;drawer.setAttribute('aria-label','布置房间');document.querySelector('main').append(drawer);
 const catalog=document.createElement('dialog');catalog.className='decor-dialog';catalog.setAttribute('aria-labelledby','decor-dialog-title');document.body.append(catalog);
 catalog.addEventListener('click',event=>{if(event.target===catalog){const r=catalog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)catalog.close()}});
 let records=[],ready=false,editing=false,draft=null,history=[],selected=null,valid=false,busy=false,version=0,catalogPage=0,editingRoom=null,commonReady=false;
 const empty=()=>({colors:{},items:[]}),room=()=>editingRoom??currentRoom(),title=()=>room()===3?'布置我们的客厅':'布置我的房间';
 async function sync(){if(busy)return;try{const [own,common]=await Promise.all([client.from('vt_decor').select('*'),client.from('vt_common_decor').select('*')]);ready=!own.error;commonReady=!common.error&&Boolean(common.data?.length);records=(own.data??[]).filter(r=>r.room_id<3).concat(commonReady?common.data.map(r=>({...r,room_id:3})):[]);for(const row of records)if(!editing||row.room_id!==room())home()?.setDecorRoom(row.room_id,row.config)}catch{} }
 function push(){history.push(structuredClone(draft));if(history.length>30)history.shift()}
 function preview(){home()?.setDecorRoom(room(),draft);home()?.setDecorationEditor(room(),selected,change=>{
  if(change.selected){selected=structuredClone(draft.items.find(i=>i.id===change.selected));valid=true;preview();render()}
  if(change.item){selected=change.item;valid=change.valid;preview();render()}
 });}
 function render(){
  drawer.innerHTML=`<div class="decor-heading"><strong>${title()}</strong><button data-action="cancel" ${busy?'disabled':''} aria-label="退出布置">×</button></div><p class="decor-tip" role="status">${selected?valid?'位置可以摆放，点击确定':DECOR_ITEMS[selected.type].wall?'点客厅后方墙面选位置；红色表示不能摆放':'点地面选位置；红色表示不能摆放':'点选已摆放的物件，或添加一件小装饰'}</p><div class="decor-colors">${[['wall',room()===3?'客厅墙面':'墙面'],['floor','地板'],['rug','原有地毯']].map(([key,label])=>`<label>${label}<select data-color="${key}" aria-label="${label}颜色"><option value="">原配色</option>${DECOR_COLORS.map((c,i)=>`<option value="${c}" ${draft.colors[key]===c?'selected':''}>${['暖粉','浅绿','淡紫','奶油','雾蓝','木棕'][i]}</option>`).join('')}</select></label>`).join('')}</div><button class="decor-browse" data-action="browse">选择装饰 · 查看物品预览</button>${selected?`<div class="decor-selection"><span>${DECOR_ITEMS[selected.type].name}</span><button data-action="rotate" ${DECOR_ITEMS[selected.type].wall?'disabled':''}>旋转 90°</button><button data-action="place" ${valid?'':'disabled'}>确定</button><button data-action="remove">${draft.items.some(i=>i.id===selected.id)?'收回':'取消添加'}</button></div>`:''}<div class="decor-footer"><button data-action="undo" ${history.length?'':'disabled'}>撤销</button><button data-action="reset">恢复默认</button><button class="primary" data-action="save" ${busy||selected?'disabled':''}>${busy?'保存中…':'保存布置'}</button></div><small>最多 12 件 · ${room()===3?'四位家人都可编辑 · 保存后同步':'只修改自己的房间 · 保存后共享'}</small>`;
  drawer.querySelectorAll('[data-color]').forEach(b=>b.onchange=()=>{push();if(b.value)draft.colors[b.dataset.color]=b.value;else delete draft.colors[b.dataset.color];preview();render()});
  drawer.querySelectorAll('[data-action]').forEach(b=>b.onclick=async()=>{
   if(busy)return;const action=b.dataset.action;
   if(action==='browse'){openCatalog();return}
   if(action==='cancel'){finish(false);return}
   if(action==='rotate'){selected.rotation=(selected.rotation+1)%4;valid=home().canPlaceDecor(room(),selected)}
   if(action==='place'&&valid){push();draft.items=draft.items.filter(i=>i.id!==selected.id).concat(selected);selected=null}
   if(action==='remove'){if(draft.items.some(i=>i.id===selected.id)){push();draft.items=draft.items.filter(i=>i.id!==selected.id)}selected=null}
   if(action==='undo'){draft=history.pop();selected=null}
   if(action==='reset'){push();draft=empty();selected=null}
   if(action==='save'){
    if(room()===3&&!commonReady){notify('客厅共享保存需要先执行 living-decoration.sql，当前布置仍可预览');return;}
    busy=true;render();try{const {data,error}=await client.rpc(room()===3?'vt_save_common_decor':'vt_save_decor',{p_config:draft,p_version:version});if(error)throw error;const savedRow=Array.isArray(data)?data[0]:data;const row={...savedRow,room_id:room()};records=records.filter(r=>r.room_id!==room()).concat(row);finish(true);notify('布置已保存，家人也能看到啦')}
    catch(error){notify(error.message?.includes('无效的装饰')?'新增家具需要先在 Supabase 执行 living-decoration.sql':error.message?.includes('其他设备')?'其他设备更新了房间，请退出后重新布置':'布置保存未完成，请检查网络后重试')}finally{busy=false;if(editing)render()}return;
   }
   preview();render();
  });
 }
 function openCatalog(page=catalogPage){
  catalogPage=page;const entries=Object.entries(DECOR_ITEMS).filter(([,v])=>v.page===page&&(!v.wall||room()===3));
  let images={};try{images=home().getDecorPreviews(DECOR_COLORS[room()],entries.map(([key])=>key))}catch(error){console.error('装饰预览生成失败',error);notify('物品预览暂时未能加载，仍可选择后在房间查看')}
  const full=draft.items.length>=12;
  catalog.innerHTML=`<div class="decor-dialog-heading"><div><small>VERY THREE / 房间布置</small><h2 id="decor-dialog-title">${room()===3?'一起布置我们的客厅。':'给房间添点喜欢的。'}</h2></div><button data-close aria-label="关闭装饰选择">×</button></div><p class="decor-dialog-desc">${full?'房间已有 12 件装饰，先收回一件再添加。':page===5?'选择墙饰，再点客厅后方墙面摆放。预览与实际模型一致。':'选择家具，再点地面摆放。预览与实际模型一致。'}</p><nav class="decor-pages" aria-label="装饰分类">${DECOR_PAGES.map((name,i)=>i===5&&room()!==3?'':`<button data-page="${i}" aria-pressed="${i===page}">${i+1} · ${name}</button>`).join('')}</nav><div class="decor-item-grid">${entries.map(([key,v])=>`<button class="decor-item-card" data-add="${key}" ${full?'disabled':''}>${images[key]?`<img src="${images[key]}" alt="${v.name}的三维模型预览" width="192" height="192">`:'<span class="decor-preview-empty">预览暂不可用</span>'}<span class="decor-item-name">${v.name}</span><small>${v.desc}${['arcade','aquarium','telescope'].includes(key)?' · 可互动':''}</small><span class="decor-item-add">＋ 选它</span></button>`).join('')}</div><button class="decor-dialog-back" data-close>回房间继续布置</button>`;
  catalog.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>{openCatalog(Number(b.dataset.page));catalog.querySelector(`[data-page="${catalogPage}"]`)?.focus()});
  catalog.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>catalog.close());
  catalog.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>{selected={id:crypto.randomUUID(),type:b.dataset.add,rotation:0,color:DECOR_COLORS[room()]};valid=false;catalog.close();preview();render();notify(DECOR_ITEMS[selected.type].wall?'点客厅后方墙面选位置，门洞周围不能摆放':'点地面选位置，再点击确定')});
  if(!catalog.open)catalog.showModal();
 }
 function finish(saved){catalog.close();editing=false;drawer.hidden=true;document.body.classList.remove('decorating');home()?.setDecorationEditor(-1,null);const row=records.find(r=>r.room_id===room());home()?.setDecorRoom(room(),row?.config??empty());selected=null;editingRoom=null;void sync()}
 async function begin(target){if(editing||busy)return;if(!home()){notify('3D 场景尚未准备好');return}await sync();if(target!==3&&!ready){notify('装饰功能需要先在 Supabase 执行 decoration.sql');return}editingRoom=target;const row=records.find(r=>r.room_id===room());version=row?.version??0;draft=structuredClone(row?.config??empty());history=[];selected=null;catalogPage=0;editing=true;document.querySelector('#panel').close();focus(room()===3?-1:room());drawer.hidden=false;document.body.classList.add('decorating');preview();render();openCatalog();if(target===3&&!commonReady)notify('可以先预览布置；共享保存需执行 living-decoration.sql')}
 button.onclick=()=>begin(currentRoom());commonButton.onclick=()=>begin(3);
 const timer=setInterval(sync,10000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)void sync()});window.addEventListener('pagehide',()=>clearInterval(timer));void sync();
 return {get editing(){return editing}};
}
