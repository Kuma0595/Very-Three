import {region} from './home-layout.js?v=2';
// 仅用于镜头分区，不作为成员房间 ID 或保存数据的键。
export const UTILITY_VIEWS={
 '-4':{name:'厨房',floor:'floor-kitchen',bounds:region(30.5,3.5,42.5,11.5)},
 '-5':{name:'卫生间',floor:'floor-bath',bounds:region(31.5,14.5,42.5,19.5)},
};
export const FLOOR_VIEWS=Object.fromEntries(Object.entries(UTILITY_VIEWS).map(([id,view])=>[view.floor,Number(id)]));
export const VIEW_IDS=[-5,-4,-3,-2,-1,0,1,2];
