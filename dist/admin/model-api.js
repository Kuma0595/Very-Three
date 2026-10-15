import {client} from '../cloud.js?v=4';
// 模型管理的数据入口；迁移服务器时仅替换此层。
export function createModelApi(db=client){
 async function rpc(name,args){const {data,error}=await db.rpc(name,args);if(error)throw error;return data;}
 const action=(name,version,config=null,base=null)=>rpc('vt_models_action',{p_action:name,p_version:version,p_config:config,p_base:base});
 return {snapshot:()=>rpc('vt_models_snapshot'),saveDraft:(version,config,base)=>action('draft',version,config,base),publish:version=>action('publish',version),restore:version=>action('restore',version),discard:version=>action('discard',version)};
}
export const modelApi=createModelApi();
