import {client} from './cloud.js?v=1';
export const SPECIES={sunflower:{name:'向日葵',color:'#efbd51'},hydrangea:{name:'绣球',color:'#b69bd8'},mint:{name:'薄荷',color:'#86b69c'}};
export const STAGES=['刚播种','发芽了','长叶中','开花了'];
export function growthStage(plant,now=Date.now()){
 if(!plant?.species||!plant.planted_at)return -1;
 const age=Math.max(0,(now-Date.parse(plant.planted_at))/1000)+(plant.growth_bonus??0);
 return age>=43200?3:age>=21600?2:age>=7200?1:0;
}
let pending=null;
export function loadGarden(){
 if(pending)return pending;
 pending=(async()=>{const {data,error}=await client.from('vt_garden').select('*').order('room_id').order('slot');
  if(error){if(['42P01','PGRST205'].includes(error.code))return {ready:false,plants:[]};throw error}
  return {ready:true,plants:data};
 })().finally(()=>{pending=null});return pending;
}
export async function gardenAction(room,slot,action,species=null){
 const {data,error}=await client.rpc('vt_garden_action',{p_room_id:room,p_slot:slot,p_action:action,p_species:species});
 if(error)throw error;return data;
}
