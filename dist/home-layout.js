// 按 Tiny L 形庭院屋的格点比例建模：一格为 .85，坐标同时用于地板、门洞和寻路。
export const LAYOUT_REVISION=2;
export const cell=(x,y)=>({x:(x-24)*.85,z:(y-16)*.85});
export function region(x0,y0,x1,y1){const a=cell(x0,y0),b=cell(x1,y1);return {minX:a.x,maxX:b.x,minZ:a.z,maxZ:b.z};}
export const BEDROOM_REGIONS=[region(5.5,3.5,17.5,11.5),region(17.5,3.5,30.5,11.5),region(5.5,19.5,17.5,29.5)];
export const ROOM_ORIGINS=BEDROOM_REGIONS.map(p=>({x:p.minX+6.05,z:p.minZ+3.65}));
export const ROOM_PLANS=BEDROOM_REGIONS.map((p,i)=>({minX:-6.05,maxX:p.maxX-ROOM_ORIGINS[i].x,minZ:-3.65,maxZ:p.maxZ-ROOM_ORIGINS[i].z}));
export const COMMON_REGIONS=[region(5.5,11.5,31.5,19.5),region(31.5,11.5,42.5,14.5),region(17.5,19.5,24.5,29.5)];
export const DOORS=[cell(12,11.5),cell(24,11.5),cell(17.5,24),cell(28,19.5),cell(24.5,24),cell(21,29.5)];
export const ROOM_EXITS=[{x:-.525,z:2.35},{x:-.525,z:2.35},{x:3.35,z:.175}];
export const ROOM_SPAWNS=[{x:-.525,z:1.2},{x:-.525,z:1.2},{x:1.2,z:1.0}];
export const COMMON_ACCESS=[cell(22,17),cell(12,12.5),cell(24,12.5),cell(36,12.5),cell(37,14),cell(21,20.5),cell(28,18.5),cell(23,24),cell(21,28.5)];
// 格点中的家具中心与参考版一致；尺寸、旋转是现有模型的装配参数。
export const FURNITURE_PLACEMENTS={
 'r0-bed':[7.3,5.7,.78,0],'r0-bedside':[9.3,4.8,.8,0],'r0-gaming-zone':[14.5,5.2,.8,3],'r0-desk-chair':[14.5,7.2,.85,1],
 'r0-guitar-amp':[7.4,9.1,.72,0],'r0-plant-right':[16,9.8,.7,0],'r0-room-rug':[11.6,8.8,1,0],'r0-bed-bench':[10.3,5.3,.7,0],'r0-piggy-lounge-zone':[15,9.7,.65,0],
 'r1-bed':[19.4,5.7,.78,0],'r1-bedside':[21.4,4.8,.8,0],'r1-listening-zone':[27.4,5.1,.8,3],
 'r1-reading-chair':[27.6,9.2,.8,2],'r1-reading-table':[25.8,9.2,.8,0],'r1-plant-left':[19.1,9.6,.7,0],'r1-plant-right':[29,9.7,.65,0],
 'r1-bed-bench':[23.2,5.0,.7,0],'r1-reading-lamp':[29,7.5,.75,0],'r1-reading-rug':[24.5,8.7,.7,0],'r1-room-rug':[24.5,8.7,1,0],'r1-reading-books':[22,5.8,.7,0],
 'r2-bed':[11.5,21.7,1,0],'r2-bedside':[8.9,20.8,.7,0],'r2-room-rug':[11.6,26,1,0],'r2-album-zone':[11.7,20.9,.72,3],
 'r2-dressing-mirror':[6.8,26,.7,1],'r2-dressing-stool':[9.6,27.9,.8,0],'r2-dressing-zone':[9.2,27.8,.6,0],
 'r2-plant-right':[15.9,27.6,.7,0],'r2-bed-bench':[12.5,28,.65,0],'r2-zakery-chair':[14.4,25.8,.8,0],
 'r3-living-sofa':[16.6,13.1,.78,0],'r3-living-table':[17.5,16.2,.8,0],'r3-living-rug':[17.2,16.0,.9,0],
 'r3-living-lamp':[20.5,13.2,.8,0],'r3-living-record-cabinet':[10,13,.9,0],'r3-living-desk':[7.3,13.1,.72,1],
 'r3-plant-left':[6.9,17.8,.7,0],'r3-plant-right':[29.7,12.7,.65,0],'r3-cat-bed':[11.5,18,.75,0],'r3-cat-toy':[12.7,17.7,1,0],
 'r3-dog-bed':[22.7,13.1,.75,0],'r3-activity-rug':[21,25.2,.7,0],
 'r3-dining-table':[28,16.8,.75,0],'r3-dining-chair-west':[25.8,16.8,.8,0],'r3-dining-chair-east':[30.1,16.8,.8,0],
 'r3-dining-chair-north':[28,15.1,.8,0],'r3-dining-chair-south':[28,18.3,.8,0],'r3-collection-cabinet':[19.1,21,.8,1],
};
// 旧配置在读取时做可重复的无损坐标迁移；不写云端、不删物件，保存时带版本避免重复换算。
export function migrateLayoutConfig(room,value={}){
 const config=structuredClone(value??{});if(config.layoutRevision>=LAYOUT_REVISION)return config;
 const map=p=>{
  if(!Number.isFinite(p.x)||!Number.isFinite(p.z))return {...p};
  if(room===3){const a=COMMON_REGIONS[0];return {...p,x:a.minX+(p.x+16.25)/30.6*(a.maxX-a.minX),z:p.type&&['wallArt','clock','wallShelf','pegboard'].includes(p.type)?-3.70:a.minZ+(p.z-2.05)/10.1*(a.maxZ-a.minZ)};}
  const a=ROOM_PLANS[room];if(!a)return {...p};return {...p,x:a.minX+(p.x+6.05)/10.2*(a.maxX-a.minX),z:a.minZ+(p.z+3.65)/12.6*(a.maxZ-a.minZ)};
 };
 if(Array.isArray(config.items))config.items=config.items.map(map);
 if(config.furniture)config.furniture=Object.fromEntries(Object.entries(config.furniture).map(([id,p])=>[id,map(p)]));
 config.layoutRevision=LAYOUT_REVISION;return config;
}
