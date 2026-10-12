import assert from 'node:assert/strict';
import {createNavigator} from '../dist/navigation.js';

const floors=[{minX:-3,maxX:0,minZ:-3,maxZ:3,room:0},{minX:0,maxX:3,minZ:-3,maxZ:3,room:1}];
const walls=[{minX:-.1,maxX:.1,minZ:-3,maxZ:-.7},{minX:-.1,maxX:.1,minZ:.7,maxZ:3}];
const furniture={minX:-2.3,maxX:-1.1,minZ:-.7,maxZ:.6};
const nav=createNavigator(floors,[...walls,furniture]);
assert(nav.canStand({x:0,z:0}),'可通过连续地板与门洞');
assert(!nav.canStand({x:-1.7,z:0}),'不能进入家具');
assert(!nav.canStand({x:2.9,z:0}),'人物身体不能越过地台边缘');
const start={x:-2,z:-2},goal={x:2,z:2},path=nav.findPath(start,goal);
assert(path?.length,'能跨门洞到另一间房');
let current=start;
for(const target of path){
 while(Math.hypot(target.x-current.x,target.z-current.z)>.01){
  const dx=target.x-current.x,dz=target.z-current.z,d=Math.hypot(dx,dz),step=Math.min(.04,d);
  const next=nav.move(current,dx/d*step,dz/d*step);
  assert(nav.canStand(next));assert(Math.hypot(next.x-current.x,next.z-current.z)>.001,'路线不能卡住');current=next;
 }
 current=target;
}
assert(Math.hypot(current.x-goal.x,current.z-goal.z)<.02);
const stopped=nav.move({x:2,z:0},10,0);assert(nav.canStand(stopped));assert(stopped.x<2.61);
const closed=createNavigator(floors,[{minX:-.1,maxX:.1,minZ:-3,maxZ:3}]);
assert.equal(closed.findPath(start,goal),null,'没有门洞时不能穿墙');
assert.equal(nav.findPath(start,{x:9,z:9}),null,'不能走到远离地板的点');
console.log('PASS: floor seams, door routes, furniture, body clearance, edge stop, no tunneling or wall crossing');
