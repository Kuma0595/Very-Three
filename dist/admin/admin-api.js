import {client} from '../cloud.js?v=4';
// 界面只依赖此服务层。迁移时替换这里的传输和图片存储实现即可。
export function cleanRecord(row){if(!row)return null;return Object.fromEntries(Object.entries(row).filter(([k])=>!['src','email','is_admin','imageError'].includes(k)))}
export function adminError(error){
 if(['PGRST202','PGRST205','42P01'].includes(error?.code))return '管理台尚未启用，请先执行 admin.sql。';
 if(error?.code==='42501')return '当前账号没有管理员权限。';
 if(error?.code==='40001'||error?.code==='PGRST116')return '内容已被更新，请刷新后重新编辑。';
 if(error?.code==='23505')return '账号已绑定其他成员，或相框刚被更新，请刷新后重试。';
 if(error?.code==='23514')return '内容超出长度或相框范围，请检查输入。';
 if(error?.message?.includes('Invalid login credentials'))return '邮箱或密码不正确。';
 return error?.message||'请求未完成，请检查网络后重试。';
}
export function createAdminApi(db=client){
 const check=r=>{if(r.error)throw r.error;return r.data};
 async function rpc(name,args){return check(await db.rpc(name,args))}
 async function snapshot(){const data=await rpc('vt_admin_snapshot');if(!data||!Array.isArray(data.members)||!Array.isArray(data.rooms))throw Error('管理台数据格式不正确');await Promise.all([...data.frames,...data.photos].map(async r=>{try{r.src=check(await db.storage.from('very-three').createSignedUrl(r.path,3600)).signedUrl}catch{r.src=null;r.imageError=true}}));return data;}
 async function mutate(kind,key,action,data={},before=null){return rpc('vt_admin_mutate',{p_kind:kind,p_key:key==null?null:String(key),p_action:action,p_data:data,p_before:Array.isArray(before)?before.map(cleanRecord):cleanRecord(before)})}
 async function removeFile(path){if(!path)return true;try{const {error}=await db.storage.from('very-three').remove([path]);return !error}catch{return false}}
 async function saveImage({kind,key,before,blob,name,caption,owner}){
  if(blob.type!=='image/jpeg'||blob.size>2097152)throw Error('图片需为 2 MB 以内的 JPEG');
  const id=crypto.randomUUID(),path=kind==='frame'?`frames/${String(key).replace(':','/')}/${id}.jpg`:`memories/${before?.creator??owner}/${id}.jpg`;
  check(await db.storage.from('very-three').upload(path,blob,{contentType:'image/jpeg',upsert:false,cacheControl:'3600'}));
  let result;try{result=await mutate(kind,key,'save',{path,name:(name||'').slice(0,120),caption:caption||'一起的日子'},before)}catch(error){await removeFile(path);throw error}
  const cleaned=before?.path&&before.path!==path?await removeFile(before.path):true;return {...result,cleaned};
 }
 return {snapshot,mutate,saveImage,removeFile,status:()=>rpc('vt_admin_status'),async currentUser(){const {data,error}=await db.auth.getUser();if(error)return null;return data?.user??null},async login(email,password){return check(await db.auth.signInWithPassword({email,password}))},async logout(){check(await db.auth.signOut({scope:'local'}))},onAuth:fn=>db.auth.onAuthStateChange(fn)};
}
export const adminApi=createAdminApi();
export async function imageBlob(file){if(!file?.type?.startsWith('image/'))throw Error('请选择图片');const url=URL.createObjectURL(file);try{const image=new Image();await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('图片无法读取，请试试 JPG 或 PNG'));image.src=url});const scale=Math.min(1,1600/Math.max(image.width,image.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));const ctx=canvas.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.82));if(!blob||blob.size>2097152)throw Error('图片压缩后仍超过 2 MB，请选择较小图片');return blob;}finally{URL.revokeObjectURL(url)}}
