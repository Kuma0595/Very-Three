import {DEFAULT_HOME_SETTINGS,loadHomeSettings} from './home-settings.js?v=1';
import {setupPhotoViewer} from './photo-viewer.js?v=2';
import {setupActivities} from './activities.js?v=5';
import {setupDecoration} from './decoration.js?v=14-click-move';
import {loadGarden,gardenAction,growthStage,SPECIES,STAGES} from './garden.js?v=4';
import {loadCloud,saveCloud,currentMember,currentRoom,cloudError,startCloudSync} from './cloud.js?v=4';
import { createHome } from './scene.js?v=29-click-move';
import { createRoomMusic } from './room-music.js?v=2-cat';
import { watchHomeTime } from './time-theme.js?v=4-settings';
const $=s=>document.querySelector(s);
const KEY='three-at-home-v1';
const initial={people:[{name:'Piggy',status:'摇滚与电玩',emoji:'🐷'},{name:'4010',status:'黑胶与欧美音乐',emoji:'◎'},{name:'Joey',status:'亚文化与 K-pop',emoji:'✦'},{name:'Zakery',status:'Joey 的男朋友',emoji:'♡'}],notes:[],plans:[],photos:[],rooms:[{title:'摇滚开场，下一局见',note:'吉他有点响，游戏刚开场。'},{title:'让唱针慢慢落下',note:'把喜欢的欧美音乐，放进黑胶里。'},{title:'今天也要有自己的风格',note:'亚文化、K-pop，和一点不一样的自己。'}],themeMode:'auto',night:true,lit:false};
let data=structuredClone(initial),home=null,homeSettings={...DEFAULT_HOME_SETTINGS};
try {const saved=JSON.parse(localStorage.getItem(KEY));if(saved&&Array.isArray(saved.people)&&saved.people.length===3)data={...data,lit:Boolean(saved.lit)};}catch{}
if(!Array.isArray(data.rooms)||data.rooms.length!==3)data.rooms=structuredClone(initial.rooms);
// 把旧版占位人物更新为真实昵称，保留用户已经编辑的留言和照片。
const oldNames=['Piggy','朋友 A','朋友 B'],oldStatuses=['回来坐坐','今天也可爱','自在做自己'];
data.people=data.people.map((p,i)=>({...p,name:p.name===oldNames[i]?initial.people[i].name:p.name,status:p.status===oldStatuses[i]?initial.people[i].status:p.status,emoji:initial.people[i].emoji}));
const oldTitles=['灵感慢慢来','下一局，一起','把日子过慢一点'];
data.rooms=data.rooms.map((r,i)=>r.title===oldTitles[i]?structuredClone(initial.rooms[i]):r);
data.rooms=data.rooms.map(r=>({...r,framePhotos:Array.from({length:3},(_,i)=>r.framePhotos?.[i]??null),sharedPhotos:Array(6).fill(null)}));
if(!['auto','manual'].includes(data.themeMode))data.themeMode='manual';
let activeRoom=-2;
let gardenData={ready:false,plants:[]},gardenLoading=false,gardenSaving=false;
let walking=false,lastWalkerRoom=null;
function updateMuteButton(muted){
 const button=$('#music-toggle');
 button.setAttribute('aria-pressed',String(muted));
 button.setAttribute('aria-label',muted?'取消静音':'静音');
 button.title=muted?'取消静音':'静音';
}
const roomMusic=createRoomMusic(({muted})=>updateMuteButton(muted));
updateMuteButton(roomMusic.muted);
$('#music-toggle').onclick=()=>roomMusic.setMuted(!roomMusic.muted);
document.addEventListener('visibilitychange',()=>{if(document.hidden)roomMusic.stop()});
window.addEventListener('pagehide',()=>roomMusic.stop());
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let toastTimer;
function toast(text){$('#toast').textContent=text;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),2800)}
let mutationBusy=false,stopSync=null;
function commitPreferences(change){
 data={...data,...change};
 try{const saved=JSON.parse(localStorage.getItem(KEY)||'{}');localStorage.setItem(KEY,JSON.stringify({...saved,themeMode:data.themeMode,night:data.night,lit:data.lit}))}catch{}
 return true;
}
const displayedPhotos=Array.from({length:5},(_,i)=>Array(i>=3?4:3).fill(undefined));
const pendingPhotos=Array.from({length:5},(_,i)=>Array(i>=3?4:3).fill(null));
const livingPhotos=()=>data.photos.slice(-4);
const couplePhotos=()=>data.rooms[2].sharedPhotos??Array(6).fill(null);
const coupleWallPhotos=()=>couplePhotos().map((p,slot)=>p?({...p,slot}):null).filter(Boolean).slice(-4);
let lastPhotoError=0;
function syncRoomPhotos(){
 if(!home)return;
 const sync=(i,slot,src,load,current)=>{
  if(displayedPhotos[i][slot]===src||pendingPhotos[i][slot]?.src===src)return;
  const request={src};pendingPhotos[i][slot]=request;
  load(src).then(()=>{
   if(pendingPhotos[i][slot]===request&&current()===src)displayedPhotos[i][slot]=src;
  }).catch(()=>{
   if(pendingPhotos[i][slot]===request&&Date.now()-lastPhotoError>30000){toast('相框照片暂时未显示，下一次同步会自动重试');lastPhotoError=Date.now()}
  }).finally(()=>{if(pendingPhotos[i][slot]===request)pendingPhotos[i][slot]=null});
 };
 data.rooms.forEach((room,i)=>room.framePhotos.forEach((photo,slot)=>sync(i,slot,photo?.src??null,src=>home.setRoomPhoto(i,slot,src),()=>data.rooms[i].framePhotos[slot]?.src??null)));
 for(let slot=0;slot<4;slot++)sync(3,slot,livingPhotos()[slot]?.src??null,src=>home.setLivingPhoto(slot,src),()=>livingPhotos()[slot]?.src??null);
}
function applyCloud(next){
 data={...data,...next};members();refreshRoomUI();syncRoomPhotos();void syncGarden();
}
async function update(change){
 if(!Object.keys(change).some(key=>['people','rooms','notes','plans','photos'].includes(key)))return commitPreferences(change);
 if(mutationBusy){toast('上一项正在保存，请稍等');return false}
 mutationBusy=true;
 try{await saveCloud(data,change);try{applyCloud(await loadCloud())}catch{toast('已保存，暂时未能刷新；稍后会重新同步。')}return true}
 catch(error){toast(cloudError(error));return false}
 finally{mutationBusy=false}
}
const ownRoom=index=>currentRoom()===index;
const ownPerson=index=>currentMember()?.id===index;
const roomName=index=>index===2?`${data.people[2].name} & ${data.people[3]?.name??'Zakery'}`:data.people[index].name;
const ownRecord=record=>record.creator===currentMember()?.user_id;
function refreshRoomUI(){
 document.body.classList.toggle('room-focus',activeRoom!==-2||walking);
 document.body.classList.toggle('walking',walking);
 $('#focus-heading').textContent=activeRoom===-3?'我们的庭院':activeRoom===-1?'我们的客厅':activeRoom>=0?`${roomName(activeRoom)}的房间`:walking?'在家里走走':'';
 $('#focus-info').textContent=activeRoom===-3?'照顾花园':activeRoom>=0?'房间手记':'小家手记';
 const nav=$('#room-nav');nav.innerHTML=`<button data-room="-2" aria-pressed="${activeRoom===-2}">⌂ 全景</button><button data-room="-1" aria-pressed="${activeRoom===-1}">客厅</button><button data-room="-3" aria-pressed="${activeRoom===-3}">庭院</button>${data.people.slice(0,3).map((p,i)=>`<button data-room="${i}" aria-pressed="${activeRoom===i}"><span class="room-color color-${i}"></span>${esc(roomName(i))}</button>`).join('')}`;
 nav.querySelectorAll('button').forEach(b=>b.onclick=()=>switchRoom(Number(b.dataset.room)));
 $('#home-heading').innerHTML=activeRoom<0?esc(homeSettings.welcomeTitle).replace(/\n/g,'<br>'):`${esc(roomName(activeRoom))}的房间<br><span class="room-subtitle">${esc(data.rooms[activeRoom].title)}</span>`;
 $('#home-description').innerHTML=activeRoom<0?esc(homeSettings.welcomeNote).replace(/\n/g,'<br>'):`${esc(data.rooms[activeRoom].note)}<br><button id="edit-room" class="edit-room">写下房间的小心情</button>`;
 if($('#edit-room'))$('#edit-room').onclick=()=>openPanel('room'+activeRoom);
 $('#scene-caption').textContent=activeRoom===-3?'我们的庭院 · 一起等花开':activeRoom<0?(data.night?'夜晚的小家 · 不管多晚，都有你的位置':'晴天的小家 · 灯一直为你留着'):`${roomName(activeRoom)}的${['摇滚电玩房','黑胶聆听室','亚文化小天地'][activeRoom]} · ${data.night?'晚安，也爱自己':'今天也自在做自己'}`;
}
let decorController=null,activityController=null;
function switchRoom(index){if(decorController?.editing&&index!==currentRoom()){toast('请先保存或退出房间布置');return}if(!Number.isInteger(index)||index<-3||index>2)return;activeRoom=index;home?.setRoom(index);refreshRoomUI();void roomMusic.play(index)}
$('#focus-info').onclick=()=>openPanel(activeRoom===-3?'garden':activeRoom>=0?'room'+activeRoom:'about');
const walkKeys=new Set();
function setWalkKeys(){
 const down=key=>walkKeys.has(key);
 const x=Number(down('KeyD')||down('ArrowRight'))-Number(down('KeyA')||down('ArrowLeft'));
 const y=Number(down('KeyS')||down('ArrowDown'))-Number(down('KeyW')||down('ArrowUp'));
 home?.setWalkInput(x,y);
}
function cancelMovement(){walkKeys.clear();home?.cancelWalk()}
function onWalkState(state){
 if(state.interactionError)toast(state.interactionError);
 if(state.blocked)toast('这个位置暂时走不过去，试着点旁边的空地');
 walking=state.active;
 $('#walk-stand').hidden=!['sit','bed'].includes(state.pose);
 $('#walk-hint').textContent=state.pose==='sit'?'坐着歇一会儿 · 点空地起身':state.pose==='bed'?'躺一会儿 · 点空地下床':'点地面移动 · 点椅子坐下 · 点自己的床躺下';
 if(!walking){lastWalkerRoom=null;walkKeys.clear()}
 else if(state.room!==lastWalkerRoom){lastWalkerRoom=state.room;switchRoom(state.room)}
 refreshRoomUI();
}
$('#walk-stand').onclick=()=>home?.standUp();
$('#walk-find').onclick=()=>{const state=home?.getWalkState();if(state)switchRoom(state.room)};
const movementKeys=['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowLeft','ArrowDown','ArrowRight'];
window.addEventListener('keydown',event=>{
 if(decorController?.editing||event.metaKey||event.ctrlKey||event.altKey||!movementKeys.includes(event.code)||document.querySelector('dialog[open]')||event.target?.closest?.('input,textarea,select,[contenteditable=true]'))return;
 if(!home?.ensurePlayer())return;event.preventDefault();walkKeys.add(event.code);setWalkKeys();
});
window.addEventListener('keyup',event=>{if(!walkKeys.has(event.code))return;walkKeys.delete(event.code);setWalkKeys()});
window.addEventListener('blur',cancelMovement);
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelMovement()});
function members(){ $('#members').innerHTML=data.people.map((p,i)=>`<button data-person="${i}" title="${esc(p.status)}"><span class="avatar">${esc(p.emoji)}</span><span class="member-name">${esc(p.name)}</span></button>`).join('');$('#members').querySelectorAll('button').forEach(b=>b.onclick=()=>switchRoom(Math.min(Number(b.dataset.person),2)));}
const panel=$('#panel');let lastFocus,currentPanelId;
const photoViewer=setupPhotoViewer();
function openPhotoAlbum(kind,room,slot){cancelMovement();const items=kind==='living'?data.photos.map((p,i)=>({...p,slot:i})):kind==='couple'?couplePhotos().map((p,i)=>p?({...p,slot:i}):null):data.rooms[room].framePhotos.map((p,i)=>p?({...p,slot:i}):null);return photoViewer.open({title:kind==='living'?'我们的回忆':kind==='couple'?'Joey & Zakery · 我们的相册':roomName(room)+'的相册',items,slot});}

function openPanel(id){const couplePhoto=/^photo:couple:([0-3])$/.exec(id);if(couplePhoto){const p=coupleWallPhotos()[Number(couplePhoto[1])];if(p&&openPhotoAlbum('couple',2,p.slot))return;id='couple-album'}const livingPhoto=/^photo:living:([0-3])$/.exec(id),roomPhoto=/^photo:room:([0-2]):([0-2])$/.exec(id);if(livingPhoto){const slot=Number(livingPhoto[1]),photos=livingPhotos();if(photos[slot]&&openPhotoAlbum('living',null,Math.max(0,data.photos.length-4)+slot))return;id='memories'}if(roomPhoto){const room=Number(roomPhoto[1]),slot=Number(roomPhoto[2]);if(data.rooms[room].framePhotos[slot]&&openPhotoAlbum('room',room,slot))return;id='frames'+room}const activity=/^activity:(arcade|aquarium|telescope):([0-3])$/.exec(id);if(activity){cancelMovement();void activityController?.open(activity[1],Number(activity[2]));return}if(id==='dog-pet'){toast('小狗摇了摇尾巴，贴过来让你摸摸');return}if(id==='cat-pet'){void roomMusic.meow();toast('喵～ 小猫蹭了蹭你的手');return}const focus=/^focus(-3|-1|[0-2])$/.exec(id);if(focus){switchRoom(Number(focus[1]));return}const frameMatch=/^frame([0-2])-([0-2])$/.exec(id);if(frameMatch){const room=Number(frameMatch[1]),slot=Number(frameMatch[2]);if(data.rooms[room].framePhotos[slot]&&openPhotoAlbum('room',room,slot))return;id='frames'+room;}if(id==='lamp'){toggleLamp();return}cancelMovement();lastFocus=document.activeElement;renderPanel(id);if(!panel.open)panel.showModal();}
function renderPanel(id){currentPanelId=id;const content=$('#panel-content');if(id==='couple-album'){renderCoupleAlbum(content);return;}
 if(/^garden[0-2]?$/.test(id)){renderGarden(id);return}
 if(/^room[0-2]$/.test(id)){
 const i=Number(id.slice(-1)),r=data.rooms[i];
 content.innerHTML=`<h2>${esc(roomName(i))}的小房间。</h2><p class="panel-desc">${['演出海报、游戏收藏、懒人沙发与电吉他；圆润的 Piggy 坐在电脑前拿着手柄打游戏。','胡桃木唱片架、阅读角和暖光落地灯；4010 戴耳机坐在听音椅上翻唱片，黑胶缓缓旋转。','金属拼贴板、镜边灯、专辑、杂志与鞋盒；Joey 是短寸男生，站在镜前整理宽松外套。'][i]}<br>点上方相框入口，把你们自己的照片挂进来。</p><form id="room-form"><label class="room-label" for="room-title">房间名</label><input id="room-title" name="title" value="${esc(r.title)}" ${ownRoom(i)?'':'readonly'} maxlength="20" required style="width:100%;margin-bottom:16px"><label class="room-label" for="room-note">房间的小心情</label><textarea id="room-note" name="note" ${ownRoom(i)?'':'readonly'} maxlength="120" placeholder="最近喜欢什么，或者想留下一句什么？">${esc(r.note)}</textarea>${ownRoom(i)?'<button class="primary" style="margin-top:15px">留在房间里</button>':'<p class="read-only">这间房由主人编辑，你可以看看他的照片和心情。</p>'}</form><button class="primary room-photos-entry" id="room-photos-entry">${ownRoom(i)?'给三个相框放照片':'看看他的相框'}</button><button class="back-home" id="back-home">回客厅，和大家坐坐</button>`;
 $('#room-form').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target),title=f.get('title').trim(),note=f.get('note').trim();if(!title){toast('给房间起个名字吧');return}const rooms=data.rooms.map((r,j)=>j===i?{...r,title,note}:r);if(await update({rooms})){refreshRoomUI();toast('房间记下你的小心情啦');panel.close()}};
 $('#room-photos-entry').onclick=()=>renderPanel('frames'+i);if(i===2){const b=document.createElement('button');b.className='primary room-photos-entry';b.textContent='Joey & Zakery · 共用相册';b.onclick=()=>renderPanel('couple-album');content.append(b);}
 $('#back-home').onclick=()=>{panel.close();switchRoom(-1)};
 }
 if(/^frames[0-2]$/.test(id)){
 const room=Number(id.slice(-1));
 content.innerHTML=`<h2>${esc(roomName(room))}的三个相框。</h2><p class="panel-desc">选择图片后，照片会直接挂到房间墙上。<br>相框使用居中方形裁切；保存到小家云端，四位家人都能看到。</p><div class="frame-upload-grid">${data.rooms[room].framePhotos.map((photo,slot)=>`<article class="frame-upload-card"><div class="frame-preview">${photo?`<button class="photo-thumbnail" type="button" data-view-frame="${slot}" aria-label="查看第${slot+1}张照片大图"><img src="${esc(photo.src)}" alt="${esc(roomName(room))}的第${slot+1}张相框照片"></button>`:'<span>＋<small>把喜欢的瞬间放进来</small></span>'}</div><h3>相框 ${slot+1}</h3>${ownRoom(room)?`<label class="primary upload-label">${photo?'换一张照片':'选择照片'}<input type="file" data-frame-upload="${slot}" accept="image/*"></label>`:''}${photo&&ownRoom(room)?`<button class="frame-clear" data-frame-clear="${slot}">移除照片</button>`:''}</article>`).join('')}</div><button class="back-home" id="view-photo-room">回房间看看</button>`;
 content.querySelectorAll('[data-view-frame]').forEach(b=>b.onclick=()=>openPhotoAlbum('room',room,Number(b.dataset.viewFrame)));
 content.querySelectorAll('[data-frame-upload]').forEach(input=>input.onchange=async e=>{
  const file=e.target.files[0],slot=Number(input.dataset.frameUpload);if(!file)return;
  if(!file.type.startsWith('image/')){toast('请选择一张图片');return}
  input.disabled=true;const url=URL.createObjectURL(file);
  try{
   const img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url});
   // 保存完整比例的大图；方形裁切只发生在墙上相框和缩略图。
   const canvas=document.createElement('canvas'),scale=Math.min(1,1200/Math.max(img.width,img.height));canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));
   const ctx=canvas.getContext('2d');ctx.fillStyle='#fff4e4';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
   const photo={src:canvas.toDataURL('image/jpeg',.82),name:file.name};
   const rooms=data.rooms.map((r,i)=>i===room?{...r,framePhotos:r.framePhotos.map((p,j)=>j===slot?photo:p)}:r);
   if(await update({rooms})){if(panel.open&&currentPanelId===id)renderPanel(id);toast('照片已经挂到房间里啦')}
  }catch{toast('这张图片无法读取，请试试 JPG 或 PNG')}finally{URL.revokeObjectURL(url);input.disabled=false;input.value=''}
 });
 content.querySelectorAll('[data-frame-clear]').forEach(button=>button.onclick=async()=>{
  const slot=Number(button.dataset.frameClear),rooms=data.rooms.map((r,i)=>i===room?{...r,framePhotos:r.framePhotos.map((p,j)=>j===slot?null:p)}:r);
  if(await update({rooms})){renderPanel(id);toast('相框已腾出位置')}
 });
 $('#view-photo-room').onclick=()=>{panel.close();switchRoom(room)};
 }

 if(id==='people'){
 content.innerHTML=`<h2>四个人，都有自己的位置。</h2><p class="panel-desc">可以更新自己的名字和心情。<br>不管今天怎样，这里都有你的位置。</p><form id="people-form">${data.people.map((p,i)=>`<div class="person-form"><span class="avatar">${esc(p.emoji)}</span><div><label for="name-${i}">第 ${i+1} 位家人</label><input id="name-${i}" name="name-${i}" value="${esc(p.name)}" ${ownPerson(i)?'':'readonly'} maxlength="12" required aria-label="第${i+1}位家人的名字"><input name="status-${i}" value="${esc(p.status)}" ${ownPerson(i)?'':'readonly'} maxlength="30" placeholder="今天的心情" aria-label="第${i+1}位家人的心情"></div></div>`).join('')}<button class="primary" style="margin-top:20px">保存家人们</button></form>`;
 $('#people-form').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target);const people=data.people.map((p,i)=>({...p,name:f.get('name-'+i).trim(),status:f.get('status-'+i).trim()}));if(people.some(p=>!p.name)){toast('给每位家人写一个名字吧');return}if(await update({people})){members();refreshRoomUI();toast('名字和心情都记下啦');panel.close()}};
 }
 if(id==='notes'){
 content.innerHTML=`<h2>有句话，想留给你。</h2><p class="panel-desc">一句晚安，一个内部梗，或者只是“今天想你们”。</p><div id="notes-list">${data.notes.length?data.notes.map((n,i)=>`<article class="sticky-note"><p>${esc(n.text)}</p><small>${esc(n.author)} · ${esc(n.date)}</small>${ownRecord(n)?`<button class="remove" data-note="${i}" aria-label="删除这条留言">×</button>`:''}</article>`).join(''):'<div class="sticky-note"><p>小家还没有留言。<br>把第一句话留在这里吧 ♡</p><small>等你来写</small></div>'}</div><form id="note-form"><textarea name="text" required maxlength="240" placeholder="想说的话，放在这里…" aria-label="留言内容"></textarea><div class="form-row"><span>${esc(data.people[currentMember().id].name)}</span><button class="primary">贴上留言</button></div></form>`;
 content.querySelectorAll('[data-note]').forEach(b=>b.onclick=async()=>{const notes=data.notes.filter((_,i)=>i!==Number(b.dataset.note));if(await update({notes}))renderPanel(id)});
 $('#note-form').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target),text=f.get('text').trim();if(!text)return;const note={text,author:data.people[currentMember().id].name,date:new Date().toLocaleDateString('zh-CN')};if(await update({notes:[...data.notes,note]})){renderPanel(id);toast('已经贴到小家的留言板')}};
 }
 if(id==='plans'){
 content.innerHTML=`<h2>下一次，我们一起。</h2><p class="panel-desc">把想一起做的事写下来。等实现了，再一起打个勾。</p><div>${data.plans.length?data.plans.map((p,i)=>`<label class="plan ${p.done?'done':''}"><input type="checkbox" data-plan="${i}" ${p.done?'checked':''}><span>${esc(p.text)}</span><button type="button" data-remove-plan="${i}" aria-label="删除这项计划">×</button></label>`).join(''):'<p class="panel-desc">还没有约定。可以从“一起吃顿饭”开始。</p>'}</div><form id="plan-form" class="form-row"><input name="text" maxlength="80" required placeholder="下一次想一起做什么？" aria-label="新计划"><button class="primary">约好啦</button></form>`;
 content.querySelectorAll('[data-plan]').forEach(b=>b.onchange=async()=>{const plans=data.plans.map((p,i)=>i===Number(b.dataset.plan)?{...p,done:b.checked}:p);if(await update({plans}))renderPanel(id)});
 content.querySelectorAll('[data-remove-plan]').forEach(b=>b.onclick=async e=>{e.preventDefault();if(await update({plans:data.plans.filter((_,i)=>i!==Number(b.dataset.removePlan))}))renderPanel(id)});
 $('#plan-form').onsubmit=async e=>{e.preventDefault();const text=new FormData(e.target).get('text').trim();if(text&&await update({plans:[...data.plans,{text,done:false}]})){renderPanel(id);toast('约好了，下一次一起')}};
 }
 if(id==='memories'){
 content.innerHTML=`<h2>把一起的日子挂起来。</h2><p class="panel-desc">这里是共享回忆相册，客厅墙上会显示最近四张；个人房间的三个相框可以单独上传。<br>在这里也可以放你们自己的照片，<br>再给回忆起个名字。</p><div class="photo-grid">${data.photos.length?data.photos.map((p,i)=>`<div class="polaroid"><button class="photo-thumbnail" type="button" data-view-memory="${i}" aria-label="查看${esc(p.caption)}大图"><img src="${esc(p.src)}" alt="${esc(p.caption)}"></button><span>${esc(p.caption)}</span>${ownRecord(p)?`<button class="remove" data-photo="${i}" aria-label="删除照片">×</button>`:''}</div>`).join(''):'<div class="polaroid"><div class="empty-photo">♡<small>第一张合照</small></div><span>这个位置留给我们</span></div><div class="polaroid"><div class="empty-photo" style="background:#deeadf">☀<small>某个好天气</small></div><span>等下一次出门</span></div>'}</div><form id="photo-form" style="margin-top:25px"><input id="caption" maxlength="40" placeholder="给这张回忆起个名字" aria-label="照片标题" style="width:100%;margin-bottom:12px"><label class="primary upload-label">放一张照片<input id="photo-upload" type="file" accept="image/*"></label><p class="panel-desc" style="margin-top:12px;margin-bottom:0">墙上展示最近 4 张，旧照片保留在相册。<br>相册最多 8 张；只能删除自己上传的照片。</p></form>`;
 content.querySelectorAll('[data-view-memory]').forEach(b=>b.onclick=()=>openPhotoAlbum('living',null,Number(b.dataset.viewMemory)));
 content.querySelectorAll('[data-photo]').forEach(b=>b.onclick=async()=>{if(await update({photos:data.photos.filter((_,i)=>i!==Number(b.dataset.photo))}))renderPanel(id)});
 $('#photo-upload').onchange=async e=>{const file=e.target.files[0];if(!file)return;if(data.photos.length>=8){toast('先移除一张，再留下新的回忆吧');return}if(!file.type.startsWith('image/')){toast('请选择一张图片');return}const caption=$('#caption').value.trim()||'一起的日子';const url=URL.createObjectURL(file);try{const img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url});const c=document.createElement('canvas');const scale=Math.min(1,900/Math.max(img.width,img.height));c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);c.getContext('2d').drawImage(img,0,0,c.width,c.height);const src=c.toDataURL('image/jpeg',.78);if(await update({photos:[...data.photos,{src,caption}]})){renderPanel(id);toast('回忆已经留下来了')}}catch{toast('这张照片暂时无法读取，试试 JPG 或 PNG')}finally{URL.revokeObjectURL(url)}};
 }
 if(id==='help')content.innerHTML=`<h2>在小家里转一转。</h2><p class="panel-desc">电脑：按住鼠标拖动旋转，滚轮缩放。<br>手机：一根手指旋转，两根手指缩放。<br><br>点击门牌、上方的房间入口或头像，镜头会靠近个人房间。<br>点击房间上的小标签或底部按钮，打开对应内容。<br>自动模式按设备本地时间切换昼夜；点击“天亮”可以切到白天。<br>白天与夜晚时间由小屋设置决定。<br>右上角可手动切换；点击“自动”恢复按时间切换。人物作息始终按实际时间判断，手动切换外观不影响睡觉。<br>点击“留盏灯”，为今天的小家留一点温暖。<br><br>点击地面，当前账号的玩偶就会走过去，无需开启模式。电脑也可用 WASD / 方向键移动；拖动旋转视角，双指或滚轮缩放。点椅子、沙发或坐垫会先走近再坐下，点自己的床会躺下；再点空地或“起身”即可离开。有人占用或通道被挡住时会提示。三间卧室直接通往客厅，客厅前方连着庭院；“找到我”回到角色所在房间。停止操作一会儿后，站立角色会恢复日常活动或按实际时间睡觉。<br><br>客厅的小狗会休息和散步，点击它或“摸摸小狗”，它会抬头摇尾巴。<br>小猫会睡觉和散步。点击它或“摸摸小猫”可以摸头，你移动时它还会跟着走一会儿；右上角静音同时控制喵叫与音乐。<br><br>转迷路了？点“全景”或右侧的 ⌂ 看整个家。</p>`;
 if(id==='about')content.innerHTML=`<h2>Very Three，刚好家人们。</h2><p class="panel-desc">我们想把群聊里的陪伴，变成一间能走进来的小家。<br><br>彩虹是墙上的旗，是沙发上的抱枕，也是这里的一点骄傲。在这里，可以自在做自己。<br><br>现在是一套完整的小家：共享客厅连着三个卧室。点击门牌、上方入口或头像，镜头会靠近房间；点击“全景”看整个家。Piggy 喜欢摇滚与电玩，4010 喜欢黑胶与欧美音乐，Joey 喜欢亚文化与 K-pop。人物穿搭是原创的第一版想象，可以继续调整。</p><p class="panel-desc">照片、留言、计划和房间心情保存在小家云端，只有绑定的家人账号可访问。房间由主人编辑，共享计划由大家维护；内容每十秒同步一次，音乐和外观偏好保留在当前设备。</p>`;
}
function renderCoupleAlbum(content){
 const photos=couplePhotos(),own=ownRoom(2);content.innerHTML=`<h2>Joey & Zakery · 我们的相册。</h2><p class="panel-desc">左墙展示四张照片，这个共用相册最多六张。点击照片查看大图。${own?'你们都可以上传、替换和移除照片。':'这里记录他们的日常。'}</p><div class="photo-grid">${photos.map((p,i)=>`<article class="polaroid">${p?`<button class="photo-thumbnail" type="button" data-couple-view="${i}" aria-label="查看第${i+1}张照片"><img src="${esc(p.src)}" alt="${esc(p.name||'我们的照片')}"></button>`:'<div class="empty-photo">♡<small>相框 '+(i+1)+'</small></div>'}<span>相框 ${i+1}</span>${own?`<label class="primary upload-label">${p?'换一张':'上传照片'}<input type="file" data-couple-upload="${i}" accept="image/*"></label>${p?`<button class="remove" data-couple-remove="${i}" aria-label="移除第${i+1}张照片">×</button>`:''}`:''}</article>`).join('')}</div>${own?'<p class="panel-desc">首次启用共享保存需执行 couple-album.sql。</p>':''}`;
 content.querySelectorAll('[data-couple-view]').forEach(b=>b.onclick=()=>openPhotoAlbum('couple',2,Number(b.dataset.coupleView)));
 content.querySelectorAll('[data-couple-remove]').forEach(b=>b.onclick=async()=>{const slot=Number(b.dataset.coupleRemove),rooms=data.rooms.map((r,i)=>i===2?{...r,sharedPhotos:couplePhotos().map((p,j)=>j===slot?null:p)}:r);if(await update({rooms}))renderPanel('couple-album')});
 content.querySelectorAll('[data-couple-upload]').forEach(input=>input.onchange=async e=>{const file=e.target.files[0],slot=Number(input.dataset.coupleUpload);if(!file)return;if(!file.type.startsWith('image/')){toast('请选择图片');return}input.disabled=true;const url=URL.createObjectURL(file);try{const img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url});const scale=Math.min(1,1200/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(img.width*scale));c.height=Math.max(1,Math.round(img.height*scale));c.getContext('2d').drawImage(img,0,0,c.width,c.height);const photo={src:c.toDataURL('image/jpeg',.82),name:file.name},rooms=data.rooms.map((r,i)=>i===2?{...r,sharedPhotos:couplePhotos().map((p,j)=>j===slot?photo:p)}:r);if(await update({rooms})){renderPanel('couple-album');toast('照片已放进你们的相册')}}catch{toast('照片读取失败，请试试 JPG 或 PNG')}finally{URL.revokeObjectURL(url);input.disabled=false;input.value=''}});
}

function closePanel(){panel.close()}
$('#close').onclick=closePanel;panel.addEventListener('click',e=>{if(e.target===panel){const r=panel.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closePanel()}});panel.addEventListener('close',()=>lastFocus?.focus());
document.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>openPanel(b.dataset.open));$('#help').onclick=()=>openPanel('help');$('#about').onclick=()=>openPanel('about');
async function syncGarden(){
 if(gardenLoading||gardenSaving)return;gardenLoading=true;
 try{gardenData=await loadGarden();home?.setGardenPlants(gardenData.plants.map(p=>({...p,stage:growthStage(p)})));
  if(panel.open&&/^garden[0-2]?$/.test(currentPanelId)&&!panel.contains(document.activeElement))renderGarden(currentPanelId);
 }catch{if(panel.open&&/^garden/.test(currentPanelId))toast('花园暂时未能同步，稍后会重试')}
 finally{gardenLoading=false}
}
function renderGarden(id){
 const content=$('#panel-content'),room=/[0-2]$/.test(id)?Number(id.at(-1)):currentRoom();
 content.innerHTML=`<h2>一起等花开。</h2><p class="panel-desc">每间卧室对应三个种植位；Joey 和 Zakery 共用花圃，家人只在自己的花圃播种，大家都可以帮忙浇水。约 12 小时长成，离线也会生长；每次浇水提前一小时，四小时后可再浇。不照顾也不会枯死。</p><div class="garden-members">${data.people.slice(0,3).map((p,i)=>`<button data-garden-room="${i}" aria-pressed="${room===i}">${esc(roomName(i))}</button>`).join('')}</div>${gardenData.ready?'':'<p class="read-only">花圃正在准备中，种植暂未开启。</p>'}<div class="garden-slots">${[0,1,2].map(slot=>{
 const plant=gardenData.plants.find(p=>p.room_id===room&&p.slot===slot),stage=growthStage(plant),wet=plant?.watered_at&&Date.now()-Date.parse(plant.watered_at)<14400000;
 return `<section class="garden-slot"><span class="garden-sprout">${stage<0?'◌':stage===0?'·':stage<3?'🌱':plant.species==='sunflower'?'🌻':plant.species==='mint'?'🌿':'🌸'}</span><div><h3>${stage<0?'空种植位':SPECIES[plant.species]?.name??'植物'}</h3><p>${stage<0?'选一颗种子种下去':STAGES[stage]}</p>${stage<0?room===currentRoom()?`<select id="seed-${slot}" aria-label="第 ${slot+1} 个种植位的植物" ${gardenData.ready?'':'disabled'}>${Object.entries(SPECIES).map(([key,v])=>`<option value="${key}">${v.name}</option>`).join('')}</select><button class="primary" data-plant="${slot}" ${gardenData.ready?'':'disabled'}>播种</button>`:'<small>等主人来播种</small>':`<button class="primary" data-water="${slot}" ${wet?'disabled':''}>${wet?'土壤湿润':'浇水'}</button>`}</div></section>`;
 }).join('')}</div>`;
 content.querySelectorAll('[data-garden-room]').forEach(b=>b.onclick=()=>openPanel('garden'+b.dataset.gardenRoom));
 async function act(slot,action,species){if(gardenSaving)return;let saved=false;gardenSaving=true;content.querySelectorAll('button,select').forEach(b=>b.disabled=true);
  try{const result=await gardenAction(room,slot,action,species);saved=true;const plant=Array.isArray(result)?result[0]:result;if(plant?.room_id===room&&plant.slot===slot)gardenData={ready:true,plants:gardenData.plants.map(p=>p.room_id===room&&p.slot===slot?plant:p)};else gardenData=await loadGarden();home?.setGardenPlants(gardenData.plants.map(p=>({...p,stage:growthStage(p)})));toast(action==='plant'?'种子种好了，一起等它长大':'浇过水啦，长得再快一点')}
  catch(error){const known=['只能在自己的花圃播种','这里已经有植物了','土壤还湿润，四小时后再浇水'];toast(saved?'已保存，花园稍后会重新同步':known.includes(error.message)?error.message:'花园保存未完成，请稍后重试')}
  finally{gardenSaving=false;if(panel.open&&(currentPanelId==='garden'+room||currentPanelId==='garden'))renderGarden(currentPanelId)}
 }
 content.querySelectorAll('[data-plant]').forEach(b=>b.onclick=()=>act(Number(b.dataset.plant),'plant',$('#seed-'+b.dataset.plant).value));
 content.querySelectorAll('[data-water]').forEach(b=>b.onclick=()=>act(Number(b.dataset.water),'water'));
}
function applyTheme(){$('#theme-auto').setAttribute('aria-pressed',String(data.themeMode==='auto'));$('#theme-auto').title=data.themeMode==='auto'?'按本地时间自动切换昼夜':'点击恢复按时间切换昼夜';document.body.classList.toggle('night',data.night);$('#theme').innerHTML=data.night?'☀ <span>天亮</span>':'☾ <span>入夜</span>';$('#theme').setAttribute('aria-label',data.night?'切换到白天':'切换到夜晚');$('#scene-caption').textContent=data.night?'夜晚的小家 · 不管多晚，都有你的位置':'晴天的小家 · 灯一直为你留着';home?.setNight(data.night);$('#lamp-label').textContent=data.lit?'灯已留着':'留盏灯';$('#lamp').classList.toggle('active',data.lit);home?.setLamp(data.lit);refreshRoomUI()}
$('#theme').onclick=async()=>{if(await update({themeMode:'manual',night:!data.night})){applyTheme();toast('已手动切换，点击“自动”恢复按时间切换')}};
$('#theme-auto').onclick=async()=>{if(await update({themeMode:'auto'})){syncSystemTheme(true);toast('已恢复按小屋设置的时间切换')}};
function syncSystemTheme(force=false){
 home?.setResidentNight(systemTheme.isDark());
 if(data.themeMode==='auto'){const night=systemTheme.isDark();if(force||night!==data.night){data.night=night;applyTheme()}}
 else if(force)applyTheme();
}
const systemTheme=watchHomeTime(()=>syncSystemTheme(),{hours:()=>homeSettings});
let settingsLoading=false;async function refreshHomeSettings(){if(settingsLoading)return;settingsLoading=true;try{const next=await loadHomeSettings();if(JSON.stringify(next)!==JSON.stringify(homeSettings)){homeSettings=next;syncSystemTheme(true);refreshRoomUI()}}catch(error){console.warn('小屋设置暂未同步',error)}finally{settingsLoading=false}}
// 浏览器返回缓存页面时会恢复定时器，不在 pagehide 时提前清除。
setInterval(refreshHomeSettings,30000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden){syncSystemTheme();void refreshHomeSettings()}});
window.addEventListener('focus',()=>{syncSystemTheme();void refreshHomeSettings()});
window.addEventListener('pageshow',()=>{syncSystemTheme();void refreshHomeSettings()});
async function toggleLamp(){if(await update({lit:!data.lit})){applyTheme();toast(data.lit?'灯留着了，等你们回来 ♡':'灯关好了，下次回来再亮起来')}}
$('#lamp').onclick=toggleLamp;$('#zoom-in').onclick=()=>home?.zoom(.85);$('#zoom-out').onclick=()=>home?.zoom(1.15);$('#reset').onclick=()=>switchRoom(-2);
applyCloud(await loadCloud());await refreshHomeSettings();
try{home=createHome($('#stage'),openPanel,onWalkState);$('#loading').remove();syncRoomPhotos()}catch(error){console.error(error);$('#loading').innerHTML='这个浏览器暂时无法显示 3D 小屋<small>试试 Safari / Chrome；下方留言与相册仍可使用。</small>'}
home?.setPlayer(currentMember().id);syncSystemTheme(true);void syncGarden();decorController=setupDecoration({home:()=>home,focus:switchRoom,notify:toast});activityController=setupActivities({home:()=>home,notify:toast});


let lastSyncError=0;
stopSync=startCloudSync(next=>{
 if(mutationBusy)return;
 const before=JSON.stringify([data.notes,data.plans,data.photos,data.people,data.rooms]);
 applyCloud(next);
 const editing=panel.contains(document.activeElement)&&document.activeElement.matches('textarea,input:not([type=checkbox]),select');
 if(panel.open&&!['help','about'].includes(currentPanelId)&&before!==JSON.stringify([data.notes,data.plans,data.photos,data.people,data.rooms])&&!editing)renderPanel(currentPanelId);
},error=>{if(Date.now()-lastSyncError>60000){toast(cloudError(error));lastSyncError=Date.now()}});
window.addEventListener('pagehide',()=>stopSync?.());
window.addEventListener('pageshow',event=>{if(event.persisted){location.reload()}});
