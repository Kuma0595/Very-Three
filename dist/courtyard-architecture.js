import {cell,region,COMMON_REGIONS} from './home-layout.js?v=2';
// 公共区按不相交的矩形铺地，长廊不是卧室或室外地面的一部分。
export function buildCommonArchitecture({THREE,box,round,art,parent,building}){
 for(const [i,p] of COMMON_REGIONS.entries()){
  const x=(p.minX+p.maxX)/2,z=(p.minZ+p.maxZ)/2,w=p.maxX-p.minX,d=p.maxZ-p.minZ;
  box(w,.12,d,'#d5b595',x,.12,z,parent).name='floor-living-'+i;
  for(let line=p.minZ+.25;line<p.maxZ;line+=.38)box(w-.12,.012,.013,'#b99c7e',x,.19,line,parent);
 }
 const slab=(x0,y0,x1,y1)=>{const p=region(x0,y0,x1,y1);box(p.maxX-p.minX,.48,p.maxZ-p.minZ,'#a88d79',(p.minX+p.maxX)/2,-.16,(p.minZ+p.maxZ)/2,building)};
 slab(5.5,3.5,42.5,19.5);slab(5.5,19.5,24.5,29.5);
 function wall(x0,y0,x1,y1,height=1.15){const a=cell(x0,y0),b=cell(x1,y1),vertical=x0===x1;const wall=box(vertical?.15:Math.abs(b.x-a.x),height,vertical?Math.abs(b.z-a.z):.15,'#c5b69a',(a.x+b.x)/2,.2+height/2,(a.z+b.z)/2,parent);wall.userData.sharedWall=true;box(vertical?.19:Math.abs(b.x-a.x),.07,vertical?Math.abs(b.z-a.z):.19,'#eadfc7',(a.x+b.x)/2,.235+height,(a.z+b.z)/2,parent);}
 wall(5.5,11.5,5.5,19.5,3.9);
 // 客厅到露台、长廊到露台、长廊到花园各保留两格宽门洞。
 wall(24.5,19.5,27,19.5);wall(29,19.5,42.5,19.5);
 wall(24.5,19.5,24.5,23);wall(24.5,25,24.5,29.5);
 wall(17.5,29.5,20,29.5);wall(22,29.5,24.5,29.5);
 const shoes=cell(19,27.7);round(1.4,.58,.6,'#b18b67',shoes.x,.49,shoes.z,.04,parent);
 for(const dx of [-.38,.10])round(.26,.12,.30,'#e3dac7',shoes.x+dx,.85,shoes.z,.04,parent);
 const label=cell(21,26);art(2.0,.3,label.x,1.8,label.z,(ctx,W,H)=>{ctx.fillStyle='#f3e6ce';ctx.fillRect(0,0,W,H);ctx.fillStyle='#68735a';ctx.font='bold 100px sans-serif';ctx.textAlign='center';ctx.fillText('花园长廊',W/2,H*.65)},parent);
}
export function buildGardenGround({THREE,box,round,ball,cylinder,parent,registerFurniture}){
 const ground=(x0,y0,x1,y1)=>{const p=region(x0,y0,x1,y1);box(p.maxX-p.minX,.12,p.maxZ-p.minZ,'#9eaf83',(p.minX+p.maxX)/2,.12,(p.minZ+p.maxZ)/2,parent).name='floor-garden';box(p.maxX-p.minX,.38,p.maxZ-p.minZ,'#a18e71',(p.minX+p.maxX)/2,-.13,(p.minZ+p.maxZ)/2,parent)};
 ground(24.5,19.5,45,34);ground(3,29.5,24.5,34);ground(42.5,3.5,45,19.5);ground(3,3.5,5.5,29.5);
 const deck=region(24.5,19.5,31.5,24.5);round(deck.maxX-deck.minX,.04,deck.maxZ-deck.minZ,'#bd9f75',(deck.minX+deck.maxX)/2,.21,(deck.minZ+deck.maxZ)/2,.01,parent);
 for(let z=deck.minZ;z<deck.maxZ;z+=.20)box(deck.maxX-deck.minX-.1,.01,.013,'#997b55',(deck.minX+deck.maxX)/2,.237,z,parent);
 // 石板连接三处出口，池塘和菜地有真实碰撞，不能直接穿过。
 for(let x=21;x<=32;x++)for(let y=31;y<=32;y++){const p=cell(x,y);box(.79,.02,.79,'#d2c9a6',p.x,.205,p.z,parent)}
 for(let y=25;y<=30;y++)for(const x of [31,32]){const p=cell(x,y);box(.79,.02,.79,'#d2c9a6',p.x,.205,p.z,parent)}
 for(let y=29;y<=30;y++)for(const x of [21,22]){const p=cell(x,y);box(.79,.02,.79,'#d2c9a6',p.x,.205,p.z,parent)}
 const pond=cell(35.5,30),shape=new THREE.Shape();shape.absellipse(0,0,2.05,1.55,0,Math.PI*2,false,0);
 const water=new THREE.Mesh(new THREE.ShapeGeometry(shape,32),new THREE.MeshStandardMaterial({color:'#79b8b8',roughness:.3}));water.rotation.x=-Math.PI/2;water.position.set(pond.x,.215,pond.z);parent.add(water);
 const obstacle=box(3.65,.5,2.65,'#79b8b8',pond.x,.1,pond.z,parent);obstacle.material=obstacle.material.clone();obstacle.material.colorWrite=false;obstacle.material.depthWrite=false;
 for(let i=0;i<18;i++){const a=i*Math.PI*2/18;const stone=ball(.24,'#c9c5a5',pond.x+Math.cos(a)*2.03,.25,pond.z+Math.sin(a)*1.53,parent);stone.scale.set(1,.45,.8)}
 const bench=cell(28,22.2),parts=[];
 const seat=round(2.65,.18,.65,'#b89262',bench.x,.63,bench.z,.05,parent);parts.push(seat,box(2.65,.65,.1,'#d0b386',bench.x,1.02,bench.z-.3,parent));
 for(const dx of [-1,1])for(const dz of [-.22,.22])parts.push(box(.09,.42,.09,'#8d775f',bench.x+dx,.39,bench.z+dz,parent));
 registerFurniture(seat,'sit',[-.8,.8].map(x=>({dock:[x,.165,0],rotation:0})),parts);
 const picnic=cell(29.4,27);round(2.1,.13,1.2,'#b9976d',picnic.x,.97,picnic.z,.04,parent);for(const dx of [-.8,.8])box(.12,.72,.8,'#92714e',picnic.x+dx,.55,picnic.z,parent);
 for(const dz of [-.9,.9])round(2.1,.12,.36,'#b9976d',picnic.x,.55,picnic.z+dz,.03,parent);
 // 外围树篱作为明确的院落边界，保留长廊出口前的路径。
 for(let x=4;x<=44;x+=2.8){const p=cell(x,33.5);cylinder(.065,.065,.65,'#9a835e',p.x,.52,p.z,parent);const leaf=ball(.55,'#7b9567',p.x,.95,p.z,parent);leaf.scale.y=.8;}
 for(let y=5;y<30;y+=3)for(const x of [3.7,44.3]){const p=cell(x,y);cylinder(.08,.11,.8,'#917350',p.x,.6,p.z,parent);ball(.65,'#7d9566',p.x,1.25,p.z,parent);}
}
