import * as THREE from './vendor/three.module.js';

// 共用圆润基础体型，保留旧关节名称和坐卧原点；四位住户只改变造型细节。
export function createCharacter({ball,cylinder,mesh,art},shirt,skin,hair,index){
  const g=new THREE.Group(),width=index===0?.55:index===2?.49:.46;
  // 圆角保持在指定尺寸内，连续法线消除挤出几何体的硬边和额外膨胀。
  function round(w,h,d,color,x,y,z,r,parent){
    const geometry=new THREE.BoxGeometry(w,h,d,8,8,8),positions=geometry.attributes.position,normals=geometry.attributes.normal;
    const radius=Math.min(r,w/2-.001,h/2-.001,d/2-.001),half=new THREE.Vector3(w/2-radius,h/2-radius,d/2-radius);
    const point=new THREE.Vector3(),core=new THREE.Vector3(),normal=new THREE.Vector3();
    for(let i=0;i<positions.count;i++){
      point.fromBufferAttribute(positions,i);core.copy(point).clamp(half.clone().negate(),half);
      normal.copy(point).sub(core).normalize();point.copy(core).addScaledVector(normal,radius);
      positions.setXYZ(i,point.x,point.y,point.z);normals.setXYZ(i,normal.x,normal.y,normal.z);
    }
    return mesh(geometry,color,x,y,z,parent);
  }
  const tag=(node,part)=>{node.userData.clothingPart=part;if(part==='top-print'&&node.material.map){node.material.transparent=true;node.material.depthWrite=false;}return node;};
  tag(round(width,.44,index===0?.36:.32,shirt,0,.35,.015,.10,g),'top');
  cylinder(.105,.12,.12,skin,0,.595,.02,g);
  const head=ball(.27,skin,0,.79,.025,g);head.scale.set(1,.98,.88);head.name='character-face';
  for(const sign of [-1,1]){
    const ear=ball(.055,skin,sign*.258,.765,.025,g);ear.scale.set(.65,1,.72);
    const arm=round(.145,.34,.16,skin,sign*(index===0?.32:.265),.29,.025,.065,g);arm.name=sign<0?'left-arm':'right-arm';arm.rotation.z=sign*.12;
    // 衣袖随手臂摆动，换装仍能统一染色。
    tag(round(.17,.15,.19,shirt,0,.095,0,.045,arm),'top');
    const hand=ball(.075,skin,sign*(index===0?.34:.285),.105,.035,g);hand.scale.set(.85,1,.82);hand.name=sign<0?'left-hand':'right-hand';
    const leg=round(.18,.48,.21,index===2?'#454351':'#657087',sign*.13,-.08,.02,.055,g);leg.name=sign<0?'left-leg':'right-leg';
    const shoe=round(.205,.145,.30,'#eee4d6',sign*.13,-.36,.105,.06,g);shoe.name=sign<0?'left-shoe':'right-shoe';
    round(.208,.035,.30,'#c7b7a4',0,-.055,0,.012,shoe);
    const eye=ball(.024,'#302e35',sign*.092,.79,.249,g);eye.scale.set(.82,1.20,.42);
    ball(.007,'#fff9ed',sign*.092-.005,.799,.259,g);
    const brow=round(.065,.014,.016,hair,sign*.092,.845,.24,.005,g);brow.rotation.z=sign*(index===2?-.10:.06);
    const cheek=ball(.036,'#dfab98',sign*.15,.727,.225,g);cheek.scale.set(1,.44,.18);
  }
  const nose=ball(.027,skin,0,.747,.266,g);nose.scale.set(.72,.85,.8);
  const smile=mesh(new THREE.TorusGeometry(.033,.006,6,16,Math.PI),'#986d62',0,.707,.252,g);smile.rotation.z=Math.PI;
  // 后脑、侧鬓和有方向的刘海分别塑形，避免一顶球壳扣在脸上。
  const back=ball(.275,hair,0,.79,-.065,g);back.scale.set(1,.95,.70);
  const crown=mesh(new THREE.SphereGeometry(.29,32,20,0,Math.PI*2,0,Math.PI*.5),hair,0,.84,.015,g);crown.scale.set(1,.82,.90);
  const fringeCount=index===2?5:4;
  for(let n=0;n<fringeCount;n++){
    const x=(n-(fringeCount-1)/2)*.085;
    const lock=ball(.10,hair,x,index===2?.91:.925+Math.abs(x)*.10,.20,g);
    lock.scale.set(index===2?.64:.85,index===2?.48:.85,.65);
    lock.rotation.z=index===0?-.40:index===1?.35:index===3?-.22:0;
  }
  for(const sign of [-1,1])round(.065,.17,.12,hair,sign*.238,.84,.04,.025,g);
  if(index===0){
    tag(art(.23,.23,0,.38,.222,(ctx,W,H)=>{ctx.fillStyle='#edc573';ctx.beginPath();ctx.moveTo(W*.6,H*.08);ctx.lineTo(W*.25,H*.55);ctx.lineTo(W*.51,H*.55);ctx.lineTo(W*.38,H*.95);ctx.lineTo(W*.8,H*.4);ctx.lineTo(W*.55,H*.4);ctx.closePath();ctx.fill()},g),'top-print');
  }else if(index===2){
    tag(art(.20,.19,0,.37,.183,(ctx,W,H)=>{ctx.fillStyle='#e8c4dd';ctx.font='380px sans-serif';ctx.textAlign='center';ctx.fillText('✦',W/2,H*.8)},g),'top-print');
    for(const sign of [-1,1])tag(round(.08,.34,.035,'#594e71',sign*.225,.35,.18,.015,g),'top-detail');
  }
  if(index===1){
    for(const sign of [-1,1])tag(mesh(new THREE.TorusGeometry(.063,.009,8,24),'#575049',sign*.092,.79,.277,g),'accessory');
    tag(round(.055,.013,.018,'#575049',0,.79,.28,.004,g),'accessory');
    tag(mesh(new THREE.TorusGeometry(.288,.023,8,28,Math.PI),'#625a50',0,.81,.015,g),'accessory');
    for(const sign of [-1,1]){const pad=cylinder(.078,.078,.06,'#a38d72',sign*.281,.79,.015,g);pad.rotation.z=Math.PI/2;tag(pad,'accessory');}
  }
  if(index===3)tag(round(.17,.035,.02,'#d6e3cf',.08,.40,.182,.01,g),'top-print');
  return g;
}
