import { createHome } from './scene.js';
import { isNightTime, millisecondsUntilThemeBoundary } from './time-theme.js';
const $=s=>document.querySelector(s);
const KEY='three-at-home-v1';
const initial={people:[{name:'Piggy',status:'摇滚与电玩',emoji:'🐷'},{name:'4010',status:'黑胶与欧美音乐',emoji:'◎'},{name:'Joey',status:'亚文化与 K-pop',emoji:'✦'}],notes:[],plans:[],photos:[],rooms:[{title:'摇滚开场，下一局见',note:'吉他有点响，游戏刚开场。'},{title:'让唱针慢慢落下',note:'把喜欢的欧美音乐，放进黑胶里。'},{title:'今天也要有自己的风格',note:'亚文化、K-pop，和一点不一样的自己。'}],themeMode:'auto',night:false,lit:false};
let data=structuredClone(initial),home=null;
try {const saved=JSON.parse(localStorage.getItem(KEY));if(saved&&Array.isArray(saved.people)&&saved.people.length===3)data={...data,...saved};}catch{}
if(!Array.isArray(data.rooms)||data.rooms.length!==3)data.rooms=structuredClone(initial.rooms);
// 把旧版占位人物更新为真实昵称，保留用户已经编辑的留言和照片。
const oldNames=['Piggy','朋友 A','朋友 B'],oldStatuses=['回来坐坐','今天也可爱','自在做自己'];
data.people=data.people.map((p,i)=>({...p,name:p.name===oldNames[i]?initial.people[i].name:p.name,status:p.status===oldStatuses[i]?initial.people[i].status:p.status,emoji:initial.people[i].emoji}));
const oldTitles=['灵感慢慢来','下一局，一起','把日子过慢一点'];
data.rooms=data.rooms.map((r,i)=>r.title===oldTitles[i]?structuredClone(initial.rooms[i]):r);
data.rooms=data.rooms.map(r=>({...r,framePhotos:Array.from({length:3},(_,i)=>r.framePhotos?.[i]??null)}));
if(!['auto','manual'].includes(data.themeMode))data.themeMode='auto';
let activeRoom=-2;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let toastTimer;
function toast(text){$('#toast').textContent=text;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),2800)}
function commit(next){try {localStorage.setItem(KEY,JSON.stringify(next));data=next;return true}catch{toast('浏览器空间不足或禁止保存，请减少照片后重试');return false}}
function update(change){return commit({...data,...change})}
function refreshRoomUI(){
 const nav=$('#room-nav');nav.innerHTML=`<button data-room="-2" aria-pressed="${activeRoom===-2}">⌂ 全景</button><button data-room="-1" aria-pressed="${activeRoom===-1}">客厅</button>${data.people.map((p,i)=>`<button data-room="${i}" aria-pressed="${activeRoom===i}"><span class="room-color color-${i}"></span>${esc(p.name)}</button>`).join('')}`;
 nav.querySelectorAll('button').forEach(b=>b.onclick=()=>switchRoom(Number(b.dataset.room)));
 $('#home-heading').innerHTML=activeRoom<0?'世界很大，<br>我们有个小家。':`${esc(data.people[activeRoom].name)}的房间<br><span class="room-subtitle">${esc(data.rooms[activeRoom].title)}</span>`;
 $('#home-description').innerHTML=activeRoom<0?'三个人，三种可爱。<br>在这里，可以自在做自己。':`${esc(data.rooms[activeRoom].note)}<br><button id="edit-room" class="edit-room">写下房间的小心情</button>`;
 if($('#edit-room'))$('#edit-room').onclick=()=>openPanel('room'+activeRoom);
 $('#scene-caption').textContent=activeRoom<0?(data.night?'夜晚的小家 · 不管多晚，都有你的位置':'晴天的小家 · 灯一直为你留着'):`${data.people[activeRoom].name}的${['摇滚电玩房','黑胶聆听室','亚文化小天地'][activeRoom]} · ${data.night?'晚安，也爱自己':'今天也自在做自己'}`;
}
function switchRoom(index){if(!Number.isInteger(index)||index<-2||index>2)return;activeRoom=index;home?.setRoom(index);refreshRoomUI()}
function members(){ $('#members').innerHTML=data.people.map((p,i)=>`<button data-person="${i}" title="${esc(p.status)}"><span class="avatar">${esc(p.emoji)}</span><span class="member-name">${esc(p.name)}</span></button>`).join('');$('#members').querySelectorAll('button').forEach(b=>b.onclick=()=>switchRoom(Number(b.dataset.person)));}
const panel=$('#panel');let lastFocus,currentPanelId;
function openPanel(id){const focus=/^focus(-1|[0-2])$/.exec(id);if(focus){switchRoom(Number(focus[1]));return}const frameMatch=/^frame([0-2])-([0-2])$/.exec(id);if(frameMatch)id='frames'+frameMatch[1];if(id==='lamp'){toggleLamp();return}lastFocus=document.activeElement;renderPanel(id);if(!panel.open)panel.showModal();}
function renderPanel(id){currentPanelId=id;const content=$('#panel-content');
 if(/^room[0-2]$/.test(id)){
 const i=Number(id.slice(-1)),r=data.rooms[i];
 content.innerHTML=`<h2>${esc(data.people[i].name)}的小房间。</h2><p class="panel-desc">${['电吉他、音箱、游戏桌和手柄；圆润的 Piggy 玩偶穿着闪电摇滚 T 恤。','黑胶唱片、唱片机和一对音箱；戴着耳机的 4010 玩偶，让喜欢的欧美音乐慢慢转。','专辑展示、穿衣镜和街头穿搭；Joey 是短寸男生玩偶，穿星星 T 恤、宽松外套和深色长裤。'][i]}<br>这是初始布置，之后可以继续换成你们的风格。</p><form id="room-form"><label class="room-label" for="room-title">房间名</label><input id="room-title" name="title" value="${esc(r.title)}" maxlength="20" required style="width:100%;margin-bottom:16px"><label class="room-label" for="room-note">房间的小心情</label><textarea id="room-note" name="note" maxlength="120" placeholder="最近喜欢什么，或者想留下一句什么？">${esc(r.note)}</textarea><button class="primary" style="margin-top:15px">留在房间里</button></form><button class="primary room-photos-entry" id="room-photos-entry">给三个相框放照片</button><button class="back-home" id="back-home">回客厅，和大家坐坐</button>`;
 $('#room-form').onsubmit=e=>{e.preventDefault();const f=new FormData(e.target),title=f.get('title').trim(),note=f.get('note').trim();if(!title){toast('给房间起个名字吧');return}const rooms=data.rooms.map((r,j)=>j===i?{...r,title,note}:r);if(update({rooms})){refreshRoomUI();toast('房间记下你的小心情啦');panel.close()}};
 $('#room-photos-entry').onclick=()=>renderPanel('frames'+i);
 $('#back-home').onclick=()=>{panel.close();switchRoom(-1)};
 }
 if(/^frames[0-2]$/.test(id)){
 const room=Number(id.slice(-1));
 content.innerHTML=`<h2>${esc(data.people[room].name)}的三个相框。</h2><p class="panel-desc">选择图片后，照片会直接挂到房间墙上。<br>相框使用居中方形裁切；先保存在当前浏览器。</p><div class="frame-upload-grid">${data.rooms[room].framePhotos.map((photo,slot)=>`<article class="frame-upload-card"><div class="frame-preview">${photo?`<img src="${esc(photo.src)}" alt="${esc(data.people[room].name)}的第${slot+1}张相框照片">`:'<span>＋<small>把喜欢的瞬间放进来</small></span>'}</div><h3>相框 ${slot+1}</h3><label class="primary upload-label">${photo?'换一张照片':'选择照片'}<input type="file" data-frame-upload="${slot}" accept="image/*"></label>${photo?`<button class="frame-clear" data-frame-clear="${slot}">移除照片</button>`:''}</article>`).join('')}</div><button class="back-home" id="view-photo-room">回房间看看</button>`;
 content.querySelectorAll('[data-frame-upload]').forEach(input=>input.onchange=async e=>{
  const file=e.target.files[0],slot=Number(input.dataset.frameUpload);if(!file)return;
  if(!file.type.startsWith('image/')){toast('请选择一张图片');return}
  input.disabled=true;const url=URL.createObjectURL(file);
  try{
   const img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url});
   // 压成方形，弹窗预览与墙上相框保持一致，并限制浏览器占用。
   const canvas=document.createElement('canvas');canvas.width=640;canvas.height=640;
   const side=Math.min(img.width,img.height);const ctx=canvas.getContext('2d');ctx.fillStyle='#fff4e4';ctx.fillRect(0,0,640,640);ctx.drawImage(img,(img.width-side)/2,(img.height-side)/2,side,side,0,0,640,640);
   const photo={src:canvas.toDataURL('image/jpeg',.82),name:file.name};
   const rooms=data.rooms.map((r,i)=>i===room?{...r,framePhotos:r.framePhotos.map((p,j)=>j===slot?photo:p)}:r);
   if(update({rooms})){await home?.setRoomPhoto(room,slot,photo.src);if(panel.open&&currentPanelId===id)renderPanel(id);toast('照片已经挂到房间里啦')}
  }catch{toast('这张图片无法读取，请试试 JPG 或 PNG')}finally{URL.revokeObjectURL(url);input.disabled=false;input.value=''}
 });
 content.querySelectorAll('[data-frame-clear]').forEach(button=>button.onclick=async()=>{
  const slot=Number(button.dataset.frameClear),rooms=data.rooms.map((r,i)=>i===room?{...r,framePhotos:r.framePhotos.map((p,j)=>j===slot?null:p)}:r);
  if(update({rooms})){await home?.setRoomPhoto(room,slot,null);renderPanel(id);toast('相框已腾出位置')}
 });
 $('#view-photo-room').onclick=()=>{panel.close();switchRoom(room)};
 }

 if(id==='people'){
 content.innerHTML=`<h2>沙发上，刚好三个位置。</h2><p class="panel-desc">名字可以改，心情也可以。<br>不管今天怎样，这里都有你的位置。</p><form id="people-form">${data.people.map((p,i)=>`<div class="person-form"><span class="avatar">${esc(p.emoji)}</span><div><label for="name-${i}">第 ${i+1} 位家人</label><input id="name-${i}" name="name-${i}" value="${esc(p.name)}" maxlength="12" required aria-label="第${i+1}位家人的名字"><input name="status-${i}" value="${esc(p.status)}" maxlength="30" placeholder="今天的心情" aria-label="第${i+1}位家人的心情"></div></div>`).join('')}<button class="primary" style="margin-top:20px">保存我们仨</button></form>`;
 $('#people-form').onsubmit=e=>{e.preventDefault();const f=new FormData(e.target);const people=data.people.map((p,i)=>({...p,name:f.get('name-'+i).trim(),status:f.get('status-'+i).trim()}));if(people.some(p=>!p.name)){toast('给每位家人写一个名字吧');return}if(update({people})){members();refreshRoomUI();toast('名字和心情都记下啦');panel.close()}};
 }
 if(id==='notes'){
 content.innerHTML=`<h2>有句话，想留给你。</h2><p class="panel-desc">一句晚安，一个内部梗，或者只是“今天想你们”。</p><div id="notes-list">${data.notes.length?data.notes.map((n,i)=>`<article class="sticky-note"><p>${esc(n.text)}</p><small>${esc(n.author)} · ${esc(n.date)}</small><button class="remove" data-note="${i}" aria-label="删除这条留言">×</button></article>`).join(''):'<div class="sticky-note"><p>小家还没有留言。<br>把第一句话留在这里吧 ♡</p><small>等你来写</small></div>'}</div><form id="note-form"><textarea name="text" required maxlength="240" placeholder="想说的话，放在这里…" aria-label="留言内容"></textarea><div class="form-row"><select name="author" aria-label="留言人">${data.people.map(p=>`<option>${esc(p.name)}</option>`).join('')}</select><button class="primary">贴上留言</button></div></form>`;
 content.querySelectorAll('[data-note]').forEach(b=>b.onclick=()=>{const notes=data.notes.filter((_,i)=>i!==Number(b.dataset.note));if(update({notes}))renderPanel(id)});
 $('#note-form').onsubmit=e=>{e.preventDefault();const f=new FormData(e.target),text=f.get('text').trim();if(!text)return;const note={text,author:f.get('author'),date:new Date().toLocaleDateString('zh-CN')};if(update({notes:[...data.notes,note]})){renderPanel(id);toast('已经贴到小家的留言板')}};
 }
 if(id==='plans'){
 content.innerHTML=`<h2>下一次，我们一起。</h2><p class="panel-desc">把想一起做的事写下来。等实现了，再一起打个勾。</p><div>${data.plans.length?data.plans.map((p,i)=>`<label class="plan ${p.done?'done':''}"><input type="checkbox" data-plan="${i}" ${p.done?'checked':''}><span>${esc(p.text)}</span><button type="button" data-remove-plan="${i}" aria-label="删除这项计划">×</button></label>`).join(''):'<p class="panel-desc">还没有约定。可以从“一起吃顿饭”开始。</p>'}</div><form id="plan-form" class="form-row"><input name="text" maxlength="80" required placeholder="下一次想一起做什么？" aria-label="新计划"><button class="primary">约好啦</button></form>`;
 content.querySelectorAll('[data-plan]').forEach(b=>b.onchange=()=>{const plans=data.plans.map((p,i)=>i===Number(b.dataset.plan)?{...p,done:b.checked}:p);if(update({plans}))renderPanel(id)});
 content.querySelectorAll('[data-remove-plan]').forEach(b=>b.onclick=e=>{e.preventDefault();if(update({plans:data.plans.filter((_,i)=>i!==Number(b.dataset.removePlan))}))renderPanel(id)});
 $('#plan-form').onsubmit=e=>{e.preventDefault();const text=new FormData(e.target).get('text').trim();if(text&&update({plans:[...data.plans,{text,done:false}]})){renderPanel(id);toast('约好了，下一次一起')}};
 }
 if(id==='memories'){
 content.innerHTML=`<h2>把一起的日子挂起来。</h2><p class="panel-desc">这里是共享回忆相册；个人房间的三个相框可以单独上传。<br>在这里也可以放你们自己的照片，<br>再给回忆起个名字。</p><div class="photo-grid">${data.photos.length?data.photos.map((p,i)=>`<div class="polaroid"><img src="${esc(p.src)}" alt="${esc(p.caption)}"><span>${esc(p.caption)}</span><button class="remove" data-photo="${i}" aria-label="删除照片">×</button></div>`).join(''):'<div class="polaroid"><div class="empty-photo">♡<small>第一张合照</small></div><span>这个位置留给我们</span></div><div class="polaroid"><div class="empty-photo" style="background:#deeadf">☀<small>某个好天气</small></div><span>等下一次出门</span></div>'}</div><form id="photo-form" style="margin-top:25px"><input id="caption" maxlength="40" placeholder="给这张回忆起个名字" aria-label="照片标题" style="width:100%;margin-bottom:12px"><label class="primary upload-label">放一张照片<input id="photo-upload" type="file" accept="image/*"></label><p class="panel-desc" style="margin-top:12px;margin-bottom:0">最多 8 张照片。仅存于当前浏览器。</p></form>`;
 content.querySelectorAll('[data-photo]').forEach(b=>b.onclick=()=>{if(update({photos:data.photos.filter((_,i)=>i!==Number(b.dataset.photo))}))renderPanel(id)});
 $('#photo-upload').onchange=async e=>{const file=e.target.files[0];if(!file)return;if(data.photos.length>=8){toast('先移除一张，再留下新的回忆吧');return}if(!file.type.startsWith('image/')){toast('请选择一张图片');return}const caption=$('#caption').value.trim()||'一起的日子';const url=URL.createObjectURL(file);try{const img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url});const c=document.createElement('canvas');const scale=Math.min(1,900/Math.max(img.width,img.height));c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);c.getContext('2d').drawImage(img,0,0,c.width,c.height);const src=c.toDataURL('image/jpeg',.78);if(update({photos:[...data.photos,{src,caption}]})){renderPanel(id);toast('回忆已经留下来了')}}catch{toast('这张照片暂时无法读取，试试 JPG 或 PNG')}finally{URL.revokeObjectURL(url)}};
 }
 if(id==='help')content.innerHTML=`<h2>在小家里转一转。</h2><p class="panel-desc">电脑：按住鼠标拖动旋转，滚轮缩放。<br>手机：一根手指旋转，两根手指缩放。<br><br>点击门牌、上方的房间入口或头像，镜头会靠近个人房间。<br>点击房间上的小标签或底部按钮，打开对应内容。<br>自动模式按本机时间：22:00—次日 07:00 黑夜，其他时间白天。<br>右上角可手动切换；点击“自动”恢复随时间变化。<br>点击“留盏灯”，为今天的小家留一点温暖。<br><br>转迷路了？点“全景”或右侧的 ⌂ 看整个家。</p>`;
 if(id==='about')content.innerHTML=`<h2>Very Three，刚好我们仨。</h2><p class="panel-desc">我们想把群聊里的陪伴，变成一间能走进来的小家。<br><br>彩虹是墙上的旗，是沙发上的抱枕，也是这里的一点骄傲。在这里，可以自在做自己。<br><br>现在是一套完整的小家：共享客厅连着三个卧室。点击门牌、上方入口或头像，镜头会靠近房间；点击“全景”看整个家。Piggy 喜欢摇滚与电玩，4010 喜欢黑胶与欧美音乐，Joey 喜欢亚文化与 K-pop。人物穿搭是原创的第一版想象，可以继续调整。</p><p class="panel-desc">回忆页的照片保存在这个浏览器中；每个人房间里的三个相框可以单独上传照片，直接显示在 3D 墙上。初版还没有账号、实时在线或跨设备同步。</p>`;
}
function closePanel(){panel.close()}
$('#close').onclick=closePanel;panel.addEventListener('click',e=>{if(e.target===panel){const r=panel.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closePanel()}});panel.addEventListener('close',()=>lastFocus?.focus());
document.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>openPanel(b.dataset.open));$('#help').onclick=()=>openPanel('help');$('#about').onclick=()=>openPanel('about');
function applyTheme(){$('#theme-auto').setAttribute('aria-pressed',String(data.themeMode==='auto'));$('#theme-auto').title=data.themeMode==='auto'?'按本机时间自动切换：22:00—07:00 黑夜':'点击恢复按本机时间自动切换';document.body.classList.toggle('night',data.night);$('#theme').innerHTML=data.night?'☀ <span>天亮</span>':'☾ <span>入夜</span>';$('#theme').setAttribute('aria-label',data.night?'切换到白天':'切换到夜晚');$('#scene-caption').textContent=data.night?'夜晚的小家 · 不管多晚，都有你的位置':'晴天的小家 · 灯一直为你留着';home?.setNight(data.night);$('#lamp-label').textContent=data.lit?'灯已留着':'留盏灯';$('#lamp').classList.toggle('active',data.lit);home?.setLamp(data.lit);refreshRoomUI()}
$('#theme').onclick=()=>{if(update({themeMode:'manual',night:!data.night})){applyTheme();toast('已手动切换，点击“自动”恢复随时间变化')}};
$('#theme-auto').onclick=()=>{if(update({themeMode:'auto'})){syncTimeTheme(true);toast('已恢复自动：22:00—07:00 黑夜，其他时间白天')}};
function syncTimeTheme(force=false){
 if(data.themeMode==='auto'){const night=isNightTime();if(force||night!==data.night){data.night=night;applyTheme()}}
 else if(force)applyTheme();
}
let clockTimer;
function scheduleThemeClock(){
 clearTimeout(clockTimer);syncTimeTheme();
 // 既在准确的昼夜边界更新，也定期检测设备时钟调整。
 clockTimer=setTimeout(scheduleThemeClock,Math.min(60_000,millisecondsUntilThemeBoundary()));
}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)scheduleThemeClock()});
window.addEventListener('focus',scheduleThemeClock);
window.addEventListener('pageshow',scheduleThemeClock);
window.addEventListener('pagehide',()=>clearTimeout(clockTimer));
function toggleLamp(){if(update({lit:!data.lit})){applyTheme();toast(data.lit?'灯留着了，等你们回来 ♡':'灯关好了，下次回来再亮起来')}}
$('#lamp').onclick=toggleLamp;$('#zoom-in').onclick=()=>home?.zoom(.85);$('#zoom-out').onclick=()=>home?.zoom(1.15);$('#reset').onclick=()=>switchRoom(-2);members();
try{home=createHome($('#stage'),openPanel);$('#loading').remove();data.rooms.forEach((r,i)=>r.framePhotos.forEach((p,j)=>{if(p)home.setRoomPhoto(i,j,p.src).catch(()=>toast('有一张相框照片无法读取，请重新选择'))}))}catch(error){console.error(error);$('#loading').innerHTML='这个浏览器暂时无法显示 3D 小屋<small>试试 Safari / Chrome；下方留言与相册仍可使用。</small>'}
syncTimeTheme(true);
scheduleThemeClock();
