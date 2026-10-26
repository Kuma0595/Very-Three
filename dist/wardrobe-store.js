import {outfitFromConfig,mergeOutfit,outfitRoom,normalizeOutfit} from './outfits.js?v=1';

// 复用已有房间 JSON 和版本校验；服装保存不会覆盖家具、照片或另一人的穿搭。
export function createWardrobeStore(client,getMember){
 async function read(){const {data,error}=await client.from('vt_decor').select('*');if(error)throw error;if(!Array.isArray(data))throw Error('暂时无法读取穿搭');return data}
 async function save(outfit){
  const member=getMember();if(!member||!Number.isInteger(member.id)||member.id<0||member.id>3)throw Error('请使用自己的家人账号');
  const room=outfitRoom(member.id),rows=await read(),row=rows.find(item=>item.room_id===room);
  if(!row||!Number.isInteger(row.version))throw Error('暂时无法读取房间，请稍后再保存');
  const config=mergeOutfit(row.config,member.id,outfit);
  if(getMember()?.id!==member.id||getMember()?.user_id!==member.user_id)throw Error('登录身份已变化，请重新打开衣橱');
  const {data,error}=await client.rpc('vt_save_decor',{p_config:config,p_version:row.version});if(error)throw error;
  const saved=Array.isArray(data)?data[0]:data;
  if(!saved?.config?.outfits?.[member.id]||saved.room_id!==room||!Number.isInteger(saved.version)||saved.version<=row.version||JSON.stringify(outfitFromConfig(saved.config,member.id))!==JSON.stringify(normalizeOutfit(outfit,member.id)))throw Error('未收到穿搭保存确认，请保留草稿后重试');
  return saved;
 }
 return {read,save};
}
