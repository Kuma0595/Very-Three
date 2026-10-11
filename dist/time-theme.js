// 使用设备本地时间：22:00（含）至次日 07:00（不含）为黑夜。
export function isNightTime(date=new Date()){
 const hour=date.getHours();return hour>=22||hour<7;
}
// 计算下一次边界；每次重新读取本机时间，兼容跨天与夏令时。
export function millisecondsUntilThemeBoundary(date=new Date()){
 const next=new Date(date);
 if(date.getHours()<7)next.setHours(7,0,0,0);
 else if(date.getHours()<22)next.setHours(22,0,0,0);
 else{next.setDate(next.getDate()+1);next.setHours(7,0,0,0)}
 return Math.max(50,next.getTime()-date.getTime());
}
