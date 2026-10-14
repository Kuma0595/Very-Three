import {createClient} from './vendor/supabase.js';
import {cloudConfig} from './cloud-config.js';
export const client=createClient(cloudConfig.url,cloudConfig.publishableKey);
const BUCKET='very-three',signedCache=new Map();
let member=null,loading=null,writing=false;
const checked=({data,error})=>{if(error)throw error;return data};
export function cloudError(error){
 if(error?.code==='42P01'||error?.code==='PGRST205')return '小家数据库还未初始化，请先执行 setup.sql。';
 if(error?.code==='23514')return '新增共用相册需要先在 Supabase 执行 couple-album.sql。';
 if(error?.code==='23505')return '这个相框刚被另一位家人更新了，请刷新相册后重试。';
 if(error?.code==='42501')return '没有修改权限，请使用自己的家人账号。';
 if(error?.message?.includes('8 张'))return '共享相册最多保留 8 张照片。';
 return '同步未完成，请检查网络后重试。';
}
export async function getMember(){
 const user=checked(await client.auth.getUser())?.user;
 if(!user)throw Error('请先登录');
 member=checked(await client.from('vt_members').select('*').eq('user_id',user.id).maybeSingle());
 if(!member)throw Error('这个账号还没有加入小家，请先绑定成员身份。');
 return member;
}
export function currentMember(){return member}
export function currentRoom(){return member?.room_id??Math.min(member?.id??0,2)}
async function signed(path){
 const cached=signedCache.get(path);if(cached&&cached.expires>Date.now())return cached.url;
 const result=checked(await client.storage.from(BUCKET).createSignedUrl(path,3600));
 signedCache.set(path,{url:result.signedUrl,expires:Date.now()+45*60*1000});return result.signedUrl;
}
export function loadCloud(){
 if(loading)return loading;
 loading=(async()=>{
  const [people,rooms,frames,notes,plans,photos]=await Promise.all([
   client.from('vt_members').select('*').order('id'),client.from('vt_rooms').select('*').order('id'),
   client.from('vt_frames').select('*'),client.from('vt_notes').select('*').order('created_at'),
   client.from('vt_plans').select('*').order('created_at'),client.from('vt_photos').select('*').order('created_at')
  ]).then(results=>results.map(checked));
  if(![3,4].includes(people.length)||rooms.length!==3)throw Error('小家数据尚未准备好');
  if(people.length===3)people.push({id:3,room_id:2,user_id:null,name:'Zakery',status:'Joey 的男朋友'});
  const lookup=Object.fromEntries(people.map(p=>[p.user_id,p.name]));
  const mappedRooms=rooms.map((r,i)=>({...r,framePhotos:[null,null,null],sharedPhotos:Array(i===2?6:0).fill(null)}));
  await Promise.all(frames.map(async f=>{const photo={path:f.path,name:f.name,src:await signed(f.path)};if(f.slot<3)mappedRooms[f.room_id].framePhotos[f.slot]=photo;else if(f.room_id===2&&f.slot<9)mappedRooms[2].sharedPhotos[f.slot-3]=photo}));
  const mappedPhotos=await Promise.all(photos.map(async p=>({...p,src:await signed(p.path)})));
  return {people:people.map((p,i)=>({...p,room_id:p.room_id??Math.min(i,2),emoji:['🐷','◎','✦','♡'][i]})),rooms:mappedRooms,
   notes:notes.map(n=>({...n,author:lookup[n.creator]??'家人',date:new Date(n.created_at).toLocaleDateString('zh-CN')})),plans,photos:mappedPhotos};
 })().finally(()=>{loading=null});return loading;
}
async function upload(src,path){
 const blob=await (await fetch(src)).blob();
 if(blob.type!=='image/jpeg'||blob.size>2097152)throw Error('图片格式或大小不符合要求');
 checked(await client.storage.from(BUCKET).upload(path,blob,{contentType:'image/jpeg',upsert:false,cacheControl:'3600'}));
}
async function removeFile(path){
 if(!path)return;
 // 数据库已经保存成功时，旧文件清理失败不回滚新记录。下次可在 Storage 清理。
 const {error}=await client.storage.from(BUCKET).remove([path]);if(error)console.warn('旧图片尚未清理');signedCache.delete(path);
}
export async function saveCloud(previous,change){
 if(writing)throw Error('上一项正在保存');writing=true;
 try{
  if(loading)await loading;
  if(!member)await getMember();
  // 先检查整次操作，避免在遇到越权字段前已经保存部分内容。
  if(change.people?.some((p,i)=>i!==member.id&&(p.name!==previous.people[i].name||p.status!==previous.people[i].status)))throw Error('只能编辑自己的名字和心情');
  if(change.rooms?.some((r,i)=>(r.sharedPhotos?.length??0)>6))throw Error('共用相册最多六张照片');
  if(change.rooms?.some((r,i)=>i!==currentRoom()&&(r.title!==previous.rooms[i].title||r.note!==previous.rooms[i].note||r.framePhotos.some((p,slot)=>p?.src!==previous.rooms[i].framePhotos[slot]?.src)||(r.sharedPhotos??[]).some((p,slot)=>p?.src!==previous.rooms[i].sharedPhotos?.[slot]?.src))))throw Error('只能上传自己房间的相框');
  if(change.notes&&previous.notes.some(n=>n.creator!==member.user_id&&!change.notes.some(next=>next.id===n.id)))throw Error('只能删除自己的留言');
  if(change.photos&&previous.photos.some(p=>p.creator!==member.user_id&&!change.photos.some(next=>next.id===p.id)))throw Error('只能移除自己上传的合照');
  if(change.people){
   for(let i=0;i<change.people.length;i++){const p=change.people[i],old=previous.people[i];if(p.name===old.name&&p.status===old.status)continue;
    if(i!==member.id)throw Error('只能编辑自己的名字和心情');
    checked(await client.from('vt_members').update({name:p.name,status:p.status}).eq('id',i).select().single());
   }
  }
  if(change.rooms){
   for(let room=0;room<3;room++){
    const r=change.rooms[room],old=previous.rooms[room];
    if(r.title!==old.title||r.note!==old.note){
     if(room!==currentRoom())throw Error('只能编辑自己的房间');
     checked(await client.from('vt_rooms').update({title:r.title,note:r.note}).eq('id',room).select().single());
    }
    for(let slot=0;slot<(room===2?9:3);slot++){
     const photo=slot<3?r.framePhotos[slot]:r.sharedPhotos?.[slot-3],before=slot<3?old.framePhotos[slot]:old.sharedPhotos?.[slot-3];
     if(photo===before||photo?.src===before?.src)continue;
     if(room!==currentRoom())throw Error('只能上传自己房间的相框');
     if(!photo){checked(await client.from('vt_frames').delete().eq('room_id',room).eq('slot',slot).select());await removeFile(before?.path);continue}
     const path=`frames/${room}/${slot}/${crypto.randomUUID()}.jpg`;
     await upload(photo.src,path);
     try{
      // 已存在的相框只更新路径；插入和更新使用独立权限，避免误授身份列权限。
      if(before)checked(await client.from('vt_frames').update({path,name:photo.name.slice(0,120)}).eq('room_id',room).eq('slot',slot).select().single());
      else checked(await client.from('vt_frames').insert({room_id:room,slot,path,name:photo.name.slice(0,120)}).select().single());
     }catch(error){await removeFile(path);throw error}
     await removeFile(before?.path);
    }
   }
  }
  if(change.notes){
   for(const note of change.notes.filter(n=>!n.id))checked(await client.from('vt_notes').insert({creator:member.user_id,text:note.text}));
   for(const old of previous.notes.filter(n=>!change.notes.some(next=>next.id===n.id))){
    if(old.creator!==member.user_id)throw Error('只能删除自己的留言');
    checked(await client.from('vt_notes').delete().eq('id',old.id).select().single());
   }
  }
  if(change.plans){
   for(const plan of change.plans.filter(p=>!p.id))checked(await client.from('vt_plans').insert({creator:member.user_id,text:plan.text,done:false}));
   for(const next of change.plans.filter(p=>p.id)){const old=previous.plans.find(p=>p.id===next.id);if(old&&old.done!==next.done)checked(await client.from('vt_plans').update({done:next.done}).eq('id',next.id).select().single())}
   for(const old of previous.plans.filter(p=>!change.plans.some(next=>next.id===p.id)))checked(await client.from('vt_plans').delete().eq('id',old.id).select().single());
  }
  if(change.photos){
   for(const photo of change.photos.filter(p=>!p.id)){
    const path=`memories/${member.user_id}/${crypto.randomUUID()}.jpg`;await upload(photo.src,path);
    try{checked(await client.from('vt_photos').insert({creator:member.user_id,path,caption:photo.caption}))}catch(error){await removeFile(path);throw error}
   }
   for(const old of previous.photos.filter(p=>!change.photos.some(next=>next.id===p.id))){
    if(old.creator!==member.user_id)throw Error('只能移除自己上传的合照');
    checked(await client.from('vt_photos').delete().eq('id',old.id).select().single());await removeFile(old.path);
   }
  }
 }finally{writing=false}
}
export function startCloudSync(onData,onError){
 let stopped=false,timer=null,busy=false;
 const sync=async()=>{if(stopped||busy||writing||document.hidden)return;busy=true;try{const next=await loadCloud();if(!stopped)onData(next)}catch(error){if(!stopped)onError(error)}finally{busy=false}};
 // 小家庭每十秒拉取最新内容；页面重新可见立即更新，不重置正在编辑的表单。
 const visible=()=>{if(!document.hidden)void sync()};
 document.addEventListener('visibilitychange',visible);window.addEventListener('focus',visible);
 timer=setInterval(sync,10000);
 return ()=>{stopped=true;clearInterval(timer);document.removeEventListener('visibilitychange',visible);window.removeEventListener('focus',visible)};
}
