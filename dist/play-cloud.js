import {client} from './cloud.js?v=1';
export async function loadPlay(){
 const {data,error}=await client.from('vt_play').select('*');
 if(error){if(['42P01','PGRST205'].includes(error.code))return {ready:false,rows:[],wishes:[]};throw error}
 const wish=await client.from('vt_wishes').select('*').order('created_at',{ascending:false}).limit(20);if(wish.error)throw wish.error;
 return {ready:true,rows:data,wishes:wish.data};
}
export async function playAction(room,action,value){const {data,error}=await client.rpc('vt_play_action',{p_room:room,p_action:action,p_value:value??{}});if(error)throw error;return data}
