// 玩法与绘制分离：以秒推进，不受设备帧率影响。
export function createArcade(random=Math.random){
 let elapsed=0,spawn=0,score=0,ended=false,x=.5,items=[];
 return {move(value){x=Math.max(.08,Math.min(.92,value))},get state(){return {elapsed,remaining:Math.max(0,60-elapsed),score,ended,x,items}},step(dt){
  if(ended)return;dt=Math.max(0,Math.min(dt,.05));elapsed=Math.min(60,elapsed+dt);spawn-=dt;
  if(spawn<=0){spawn+=.62;items.push({x:.07+random()*.86,y:-.06,speed:.27+random()*.12})}
  for(const item of items){const before=item.y;item.y+=item.speed*dt;if(before<=.86&&item.y>=.86&&Math.abs(item.x-x)<.09){score+=10;item.caught=true}}
  items=items.filter(item=>!item.caught&&item.y<1.08);if(elapsed>=60)ended=true;
 }};
}
