// 无浏览器依赖的投影标签回归；真实布局另由 check-player-browser 验证。
import fs from 'node:fs';
import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../dist/scene.js',import.meta.url),'utf8');
const start=source.indexOf('    hotDefs.forEach(h=>{',source.indexOf('function frame(time)'));
const end=source.indexOf('\n  }\n  frameId=',start);
assert(start>0&&end>start,'能定位实际每帧标签更新代码');
const update=new Function('hotDefs','camera','stage',source.slice(start,end));
const points=[{x:0,y:0,z:.5},{x:1e20,y:2e20,z:.5},{x:0,y:0,z:1.1},{x:0,y:0,z:-2},{x:NaN,y:0,z:0},{x:0,y:Infinity,z:0}];
const labels=points.map(point=>({p:{clone:()=>point},root:{localToWorld:p=>({project:()=>p})},el:{hidden:false,style:{left:'10px',top:'20px'}}}));
update(labels,{}, {clientWidth:393,clientHeight:400});
assert.equal(labels[0].el.hidden,false);
assert.equal(labels[0].el.style.left,'196.5px');
for(const label of labels.slice(1)){
  assert.equal(label.el.hidden,true);
  assert.equal(label.el.style.left,'10px','离屏投影不写入溢出坐标');
  assert.equal(label.el.style.pointerEvents,'none');
}
points[1].x=.5;points[1].y=0;
update(labels,{}, {clientWidth:393,clientHeight:400});
assert.equal(labels[1].el.hidden,false,'回到视野后恢复标签');
assert.equal(labels[1].el.style.pointerEvents,'auto');
const css=fs.readFileSync(new URL('../dist/style.css',import.meta.url),'utf8');
assert(css.includes('.hotspot[hidden]{display:none!important}'));
assert(css.includes('#hotspots{overflow:hidden;contain:layout paint}'));
assert(css.includes('grid-template-columns:repeat(4,minmax(0,1fr))'));
assert(css.includes('grid-template-columns:repeat(3,minmax(0,1fr))'));
assert(css.includes('.home-shell main #stage{grid-area:stage;position:relative;inset:auto;'));
const html=fs.readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
assert(html.includes('width=device-width, initial-scale=1, viewport-fit=cover'));
assert(html.includes('style.css?v=39-mobile-fit'));
assert(html.includes('access.js?v=39-mobile-fit'));
console.log('PASS: 离屏/非有限/相机外投影不撑宽、可见标签恢复、手机布局与缓存版本约束');
