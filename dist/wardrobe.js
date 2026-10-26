import {client,currentMember} from './cloud.js?v=4';
import {OUTFIT_SLOTS,OUTFIT_ITEMS,OUTFIT_COLORS,defaultOutfit,outfitFromConfig,outfitRoom} from './outfits.js?v=1';
import {createWardrobeStore} from './wardrobe-store.js?v=1';

export function setupWardrobe({home,notify,canOpen=()=>true}){
 const trigger=document.querySelector('#wardrobe-open'),dialog=document.createElement('dialog');dialog.id='wardrobe-dialog';dialog.className='wardrobe-dialog';dialog.setAttribute('aria-labelledby','wardrobe-title');document.body.append(dialog);
 const store=createWardrobeStore(client,currentMember);let records=[],loaded=false,draft=null,index=null,slot='top',angle=0,busy=false,syncing=false,stopped=false,dirty=false,epoch=0,revision=0;
 const status=text=>{const node=dialog.querySelector('.wardrobe-status');if(node)node.textContent=text};
 function apply(rows){records=rows;for(let i=0;i<4;i++)home()?.setOutfit(i,outfitFromConfig(rows.find(row=>row.room_id===outfitRoom(i))?.config,i))}
 async function sync(){if(stopped||syncing||busy||document.hidden)return;syncing=true;const started=revision;try{const rows=await store.read();if(!stopped&&!busy&&started===revision){loaded=true;apply(rows)}}catch{if(dialog.open&&!busy)status('暂时连不上云端，可以继续试穿；保存时会重新连接。')}finally{syncing=false}}
 function preview(){try{dialog.querySelector('.wardrobe-preview img').src=home().getOutfitPreview(index,draft,angle)}catch(error){console.warn('穿搭预览暂未生成',error);status('3D 预览暂未显示，请关闭衣橱后重试。')}}
 function selections(){
  dialog.querySelectorAll('[data-outfit-style]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.outfitStyle===draft[slot].style)));
  dialog.querySelectorAll('[data-outfit-color]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.outfitColor===draft[slot].color)));
  dialog.querySelector('.wardrobe-look').textContent=Object.keys(OUTFIT_SLOTS).map(key=>OUTFIT_ITEMS[key].find(([id])=>id===draft[key].style)[1]).join(' · ');
  dialog.querySelector('[data-wardrobe="save"]').disabled=busy||!dirty;
 }
 function category(){
  const options=dialog.querySelector('.wardrobe-options');
  options.innerHTML=`<div class="wardrobe-items" aria-label="${OUTFIT_SLOTS[slot]}款式">${OUTFIT_ITEMS[slot].map(([id,name,description])=>`<button type="button" class="wardrobe-item" data-outfit-style="${id}" aria-pressed="false"><span class="wardrobe-item-mark" aria-hidden="true">${{top:'♧',bottom:'Ⅱ',shoes:'⌁',accessory:'✧'}[slot]}</span><strong>${name}</strong><small>${description}</small><span class="wardrobe-check" aria-hidden="true">✓</span></button>`).join('')}</div><h3>选一个喜欢的颜色</h3><div class="wardrobe-colors" aria-label="${OUTFIT_SLOTS[slot]}配色">${OUTFIT_COLORS.map(([color,name])=>`<button type="button" style="--swatch:${color}" data-outfit-color="${color}" aria-label="${name}" title="${name}" aria-pressed="false"><span></span></button>`).join('')}</div><p class="wardrobe-color-note">${slot==='accessory'?'原配配饰保留原色；选择其他配饰后可更换颜色。':'颜色随款式一起保存，原配细节也为你保留。'}</p>`;
  dialog.querySelectorAll('[data-outfit-slot]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.outfitSlot===slot)));
  options.querySelectorAll('[data-outfit-style]').forEach(button=>button.onclick=()=>change({...draft[slot],style:button.dataset.outfitStyle}));
  options.querySelectorAll('[data-outfit-color]').forEach(button=>button.onclick=()=>change({...draft[slot],color:button.dataset.outfitColor}));
  selections();
 }
 function change(value){if(busy)return;draft={...draft,[slot]:value};dirty=true;status('正在试穿 · 保存后才会穿回小屋');selections();preview()}
 function finish(){if(busy)return;dialog.close()}
 async function open(){
  if(dialog.open||busy||!canOpen())return;if(!home()){notify('3D 小屋还没准备好，稍等一下');return}
  const member=currentMember();if(!Number.isInteger(member?.id)||member.id<0||member.id>3){notify('请先登录自己的家人账号');return}
  index=member.id;draft=outfitFromConfig(records.find(row=>row.room_id===outfitRoom(index))?.config,index);slot='top';angle=0;dirty=false;const ticket=++epoch,started=revision;
  dialog.innerHTML=`<div class="wardrobe-heading"><div><span class="wardrobe-eyebrow">VERY THREE / 我的衣橱</span><h2 id="wardrobe-title">今天，穿成喜欢的自己。</h2><p>一点颜色，一点心情。衣服随你搭。</p></div><button type="button" data-wardrobe="close" aria-label="关闭衣橱">×</button></div><div class="wardrobe-body"><div class="wardrobe-preview"><span class="wardrobe-preview-tag">正在试穿</span><img width="384" height="448" alt="自己的三维穿搭预览"><div class="wardrobe-turn"><button type="button" data-wardrobe="left" aria-label="向左转动试穿角色">↶</button><span>转一转，看一看</span><button type="button" data-wardrobe="right" aria-label="向右转动试穿角色">↷</button></div><p class="wardrobe-look"></p></div><section class="wardrobe-picker" aria-label="自由搭配"><nav class="wardrobe-tabs" aria-label="服装类别">${Object.entries(OUTFIT_SLOTS).map(([id,name])=>`<button type="button" data-outfit-slot="${id}" aria-pressed="false">${name}</button>`).join('')}</nav><div class="wardrobe-options"></div></section></div><div class="wardrobe-bottom"><p class="wardrobe-status" role="status">${loaded?'选一件喜欢的，试试看。':'正在连接云端衣橱…'}</p><div class="wardrobe-actions"><button type="button" data-wardrobe="reset">恢复原配</button><button type="button" data-wardrobe="close">取消</button><button type="button" class="primary" data-wardrobe="save" disabled>保存穿搭</button></div><small>保存后家人可见 · 共用卧室的穿搭分别保存</small></div>`;
  dialog.querySelectorAll('[data-outfit-slot]').forEach(button=>button.onclick=()=>{if(!busy){slot=button.dataset.outfitSlot;category()}});
  dialog.querySelectorAll('[data-wardrobe="close"]').forEach(button=>button.onclick=finish);
  for(const [action,delta] of [['left',-.6],['right',.6]])dialog.querySelector(`[data-wardrobe="${action}"]`).onclick=()=>{angle+=delta;preview()};
  dialog.querySelector('[data-wardrobe="reset"]').onclick=()=>{if(busy)return;draft=defaultOutfit(index);dirty=true;category();preview();status('已试穿原配 · 保存后生效')};
  dialog.querySelector('[data-wardrobe="save"]').onclick=save;
  category();dialog.showModal();preview();
  try{const rows=await store.read();if(stopped||busy||started!==revision||ticket!==epoch||!dialog.open)return;loaded=true;apply(rows);if(!dirty){draft=outfitFromConfig(rows.find(row=>row.room_id===outfitRoom(index))?.config,index);category();preview();status('选一件喜欢的，试试看。')}}catch{if(dialog.open&&!busy&&ticket===epoch)status('暂时连不上云端，可以继续试穿；保存时会重新连接。')}
 }
 async function save(){
  if(busy||!dirty)return;if(currentMember()?.id!==index){status('登录身份已变化，请重新打开衣橱');return}
  busy=true;dialog.querySelectorAll('button').forEach(button=>button.disabled=true);status('正在保存穿搭…');
  try{
   const saved=await store.save(draft);revision++;apply(records.filter(row=>row.room_id!==saved.room_id).concat(saved));loaded=true;dirty=false;dialog.close();notify('穿搭已保存，回小屋看看新的自己。');
  }catch(error){status(error?.message?.includes('其他设备')?'其他设备刚更新了房间或穿搭，你的试穿已保留。再次保存会合并最新房间。':'穿搭尚未保存，试穿已保留。请检查网络后重试。')}
  finally{busy=false;if(dialog.open){dialog.querySelectorAll('button').forEach(button=>button.disabled=false);selections()}}
 }
 dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault()});
 dialog.addEventListener('close',()=>{epoch++;draft=null;dirty=false});
 trigger.onclick=open;void sync();const timer=setInterval(sync,10000);
 const visible=()=>{if(!document.hidden)void sync()};document.addEventListener('visibilitychange',visible);
 window.addEventListener('pagehide',()=>{stopped=true;clearInterval(timer);document.removeEventListener('visibilitychange',visible)});
 return {open,sync,get editing(){return dialog.open}};
}
