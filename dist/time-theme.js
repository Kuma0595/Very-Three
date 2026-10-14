// 自动模式按设备本地时间作息：07:00–20:00 白天，其余时间为夜晚。
export function watchHomeTime(onChange,{clock=()=>new Date(),interval=60000}={}){
 const isDark=()=>{const hour=clock().getHours();return hour<7||hour>=20};let previous=isDark();
 const timer=setInterval(()=>{const next=isDark();if(next!==previous){previous=next;onChange(next)}},interval);
 return {isDark,dispose(){clearInterval(timer)}};
}
