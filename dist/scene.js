import {createDecorationSystem} from './decoration-scene.js?v=2';
import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { createNavigator } from './navigation.js?v=1';

// 所有模型由几何体原创搭建，不依赖外部模型或网络资源。
export function createHome(stage, onOpen, onWalkState=()=>{}) {
  const scene = new THREE.Scene();
  const renderer = new THREE.WebGLRenderer({antialias:true,alpha:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.35;
  stage.prepend(renderer.domElement);
  const camera=new THREE.PerspectiveCamera(35,1,.1,150);
  const controls=new OrbitControls(camera,renderer.domElement);
  controls.enableDamping=true;controls.dampingFactor=.07;controls.enablePan=false;
  controls.minDistance=9;controls.maxDistance=85;
  controls.minPolarAngle=.38;controls.maxPolarAngle=1.38;
  controls.minAzimuthAngle=-.3;controls.maxAzimuthAngle=1.65;
  const initial=new THREE.Vector3(25,31,34);
  camera.position.copy(initial);controls.target.set(0,1,0);controls.update();
  const ambient=new THREE.HemisphereLight('#fff3df','#9183a7',2.7);scene.add(ambient);
  const sun=new THREE.DirectionalLight('#fff0d0',4.3);sun.position.set(10,20,15);sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-22,right:22,top:22,bottom:-22,near:.5,far:65});sun.shadow.bias=-.0005;sun.shadow.normalBias=.03;scene.add(sun);
  const fill=new THREE.DirectionalLight('#bfb8ed',1.5);fill.position.set(-5,4,-2);scene.add(fill);
  let house=new THREE.Group();scene.add(house);const livingRoom=house;
  const materials=new Map();
  function mat(color){if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.82}));return materials.get(color)}
  function mesh(geo,color,x=0,y=0,z=0,parent=house){const m=new THREE.Mesh(geo,typeof color==='string'?mat(color):color);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
  function box(w,h,d,color,x,y,z,parent=house){return mesh(new THREE.BoxGeometry(w,h,d),color,x,y,z,parent)}
  function round(w,h,d,color,x,y,z,r=.08,parent=house){const s=new THREE.Shape(),a=-w/2,b=-h/2;const bevel=Math.min(r,w/5,h/5,d/5);s.moveTo(a+bevel,b);s.lineTo(a+w-bevel,b);s.quadraticCurveTo(a+w,b,a+w,b+bevel);s.lineTo(a+w,b+h-bevel);s.quadraticCurveTo(a+w,b+h,a+w-bevel,b+h);s.lineTo(a+bevel,b+h);s.quadraticCurveTo(a,b+h,a,b+h-bevel);s.lineTo(a,b+bevel);s.quadraticCurveTo(a,b,a+bevel,b);const geo=new THREE.ExtrudeGeometry(s,{depth:d-2*bevel,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:bevel,bevelThickness:bevel,curveSegments:5});geo.translate(0,0,-d/2+bevel);return mesh(geo,color,x,y,z,parent)}
  function cylinder(rt,rb,h,color,x,y,z,parent=house){return mesh(new THREE.CylinderGeometry(rt,rb,h,24),color,x,y,z,parent)}
  function ball(r,color,x,y,z,parent=house){return mesh(new THREE.SphereGeometry(r,24,16),color,x,y,z,parent)}
  function canvasTexture(draw,w=512,h=512){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t}
  function art(w,h,x,y,z,draw,parent=house){const t=canvasTexture(draw);const m=mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map:t,roughness:1,side:THREE.DoubleSide}),x,y,z,parent);return m}
  const palette=['#df7c80','#ecaa72','#edce7f','#88b8a0','#7eacd0','#af8fc2'];
  // 地台、木地板、两面墙：保留玩具屋的开放视角。
  
  livingRoom.userData.floorPlan={minX:-4.15,maxX:4.15,minZ:-3.65,maxZ:6.45};
  box(8.3,.12,10.1,'#d5b595',0,.12,1.4).name='floor-living';
  for(let j=0;j<25;j++){const z=-3.35+j*.39;box(8,.015,.012,'#ba977a',0,.19,z);for(let i=0;i<4;i++)box(.012,.015,.38,'#ba977a',-3.5+i*2+(j%2)*.8,.19,z+.19)}
  const livingBackWall=box(8.25,3.9,.18,'#e8c7c8',0,2.08,-3.56);
  const livingLeftWall=box(.18,3.9,10.1,'#c0c9c3',-4.05,2.08,1.4);
  // 门洞位置不铺踢脚线，避免形成横跨入口的矮栏。
  box(6.75,.15,.1,'#f5e8d9',.7,.28,-3.42);box(.1,.15,3.9,'#f5e8d9',-3.92,.28,-1.6);box(.1,.15,4.85,'#f5e8d9',-3.92,.28,3.975);
  box(8.4,.15,.25,'#c699a3',0,4.07,-3.56);box(.25,.15,10.1,'#a0afa7',-4.05,4.07,1.4);
  // 窗户嵌在左墙，窗外是一小片天空。
  const window=new THREE.Group();window.position.set(-3.935,2.4,-1.45);window.rotation.y=Math.PI/2;house.add(window);
  box(2.2,1.8,.1,'#fcf1da',0,0,0,window);
  const sky=art(1.96,1.56,0,0,.06,(ctx,w,h)=>{ctx.fillStyle='#aacdd9';ctx.fillRect(0,0,w,h);ctx.fillStyle='#f9e9b8';ctx.beginPath();ctx.arc(375,115,50,0,Math.PI*2);ctx.fill();ctx.fillStyle='#eef2ed';[[90,160],[145,155],[340,350],[395,344]].forEach(([x,y])=>{ctx.beginPath();ctx.ellipse(x,y,62,25,0,0,Math.PI*2);ctx.fill()});ctx.fillStyle='#8aafa1';ctx.beginPath();ctx.moveTo(0,h);ctx.lineTo(0,410);ctx.quadraticCurveTo(170,290,300,450);ctx.quadraticCurveTo(430,320,w,430);ctx.lineTo(w,h);ctx.fill()},window);
  box(.06,1.65,.08,'#f5e5ce',0,0,.13,window);box(2.05,.06,.08,'#f5e5ce',0,0,.13,window);box(2.55,.1,.45,'#f7e9d6',0,-.95,.13,window);
  for(const x of [-1.22,1.22]){round(.3,2.1,.18,'#e6ceac',x,-.07,.16,.045,window);for(let i=0;i<3;i++)cylinder(.035,.035,2.0,'#d4b992',x-.08+i*.08,-.07,.27,window)}
  // 彩虹挂旗和家的门牌。
  box(1.25,1.08,.08,'#9f755c',-1.65,2.65,-3.40);
  art(1.13,.94,-1.65,2.65,-3.345,(ctx,w,h)=>{palette.forEach((c,i)=>{ctx.fillStyle=c;ctx.fillRect(0,i*h/6,w,h/6+1)})});
  box(1.7,.61,.1,'#f8e8d0',-.5,3.18,-3.38);
  art(1.62,.53,-.5,3.18,-3.32,(ctx,w,h)=>{ctx.fillStyle='#faeedb';ctx.fillRect(0,0,w,h);ctx.fillStyle='#785c84';ctx.font='bold 72px sans-serif';ctx.textAlign='center';ctx.fillText('Very Three',w/2,255);ctx.font='38px sans-serif';ctx.fillText('有你的位置 ♡',w/2,360)});
  // 薄荷色三人沙发及靠枕。
  for(const x of [-1.8,1.8])for(const z of [-2.65,-1.6])cylinder(.09,.07,.35,'#865f4e',x,.37,z);
  round(4.2,.48,1.55,'#6f9f8a',0,.63,-2.16,.13);
  round(4.2,1.12,.4,'#91b5a0',0,1.23,-2.83,.13);
  for(const x of [-2.03,2.03])round(.36,.72,1.55,'#84aa96',x,.98,-2.15,.12);
  for(let i=0;i<3;i++)round(1.15,.22,1.1,'#b0cbb4',-1.25+i*1.25,.97,-2.01,.09);
  round(.53,.55,.2,'#e8baa6',-1.71,1.43,-2.57,.10).rotation.z=.2;
  const pillow=round(.57,.54,.24,'#f6e0bd',1.68,1.42,-2.55,.10);pillow.rotation.z=-.25;
  palette.forEach((c,i)=>{const m=box(.08,.40,.02,c,1.46+i*.08,1.42,-2.408);m.rotation.z=-.25});
  // 地毯织纹与彩虹色边缘。
  round(4.75,.035,3.2,'#f4dfc3',.1,.225,.25,.012);
  for(let i=0;i<6;i++)box(4.55,.006,.065,palette[i],.1,.247,-1.19+i*.074);
  for(let i=0;i<6;i++)box(4.55,.006,.065,palette[i],.1,.247,1.38+i*.074);
  for(let i=0;i<28;i++)for(const z of [-1.4,1.89])box(.023,.02,.16,'#f7e5c7',-2.18+i*.17,.23,z);
  // 椭圆茶几、三只杯子，以及一张手写便签。
  const table=new THREE.Group();table.position.set(0,0,.65);house.add(table);
  for(const x of [-.8,.8])for(const z of [-.33,.33])cylinder(.06,.08,.55,'#987054',x,.53,z,table);
  const top=cylinder(1.23,1.23,.15,'#e3b887',0,.86,0,table);top.scale.z=.64;
  function cup(x,z,color){cylinder(.115,.085,.18,color,x,1.04,z,table);cylinder(.092,.09,.008,'#7d513d',x,1.134,z,table);const h=mesh(new THREE.TorusGeometry(.075,.022,8,18),color,x+.11,1.04,z,table);h.rotation.y=0;}
  cup(-.64,-.17,'#d79095');cup(0,-.25,'#8ebbad');cup(.6,-.10,'#b298c7');
  box(.47,.035,.36,'#fff1b7',.3,.965,.28,table);
  const note=art(.43,.30,.3,.987,.28,(ctx,w,h)=>{ctx.fillStyle='#fff1b7';ctx.fillRect(0,0,w,h);ctx.fillStyle='#9b7d67';ctx.font='70px sans-serif';ctx.textAlign='center';ctx.fillText('回来坐坐',w/2,230);ctx.fillText('♡',w/2,370)},table);note.rotation.x=-Math.PI/2;
  // 三个原创小人：衣服、发型、肤色分别不同。
  const avatars=[];
  function person(x,shirt,skin,hair,style){const g=new THREE.Group();g.position.set(x,1.04,-2.03);house.add(g);avatars.push(g);
    round(style===0?.59:style===2?.56:.44,.45,style===0?.40:.30,shirt,0,.35,0,.07,g);
    if(style===0){const belly=ball(.25,shirt,0,.32,.04,g);belly.scale.set(1.20,.9,1);g.scale.set(1.08,1.02,1.05)}
    const leftArm=cylinder(.075,.08,.36,skin,style===0?-.37:-.29,.27,.03,g);leftArm.name='left-arm';leftArm.rotation.z=-.18;const rightArm=cylinder(.075,.08,.36,skin,style===0?.37:.29,.27,.03,g);rightArm.name='right-arm';rightArm.rotation.z=.18;
    ball(.08,skin,style===0?-.40:-.32,.1,.06,g).name='left-hand';ball(.08,skin,style===0?.40:.32,.1,.06,g).name='right-hand';
    for(const px of [-.13,.13]){const leg=round(style===2?.20:.14,style===2?.48:.13,style===2?.20:.48,style===2?'#454351':'#657087',px,style===2?-.08:.04,style===2?.02:.25,.03,g);leg.name=px<0?'left-leg':'right-leg';round(.17,.14,.25,'#f4e6d9',px,style===2?-.36:-.02,style===2?.10:.50,.035,g).name=px<0?'left-shoe':'right-shoe'}
    ball(.245,skin,0,.76,.03,g);const cap=mesh(new THREE.SphereGeometry(.254,24,16,0,Math.PI*2,0,Math.PI*(style===2?.43:.53)),hair,0,.79,.02,g);cap.rotation.x=-.2;
    ball(.06,skin,-.244,.74,.02,g);ball(.06,skin,.244,.74,.02,g);
    for(const px of [-.08,.08]){ball(.018,'#44333d',px,.76,.253,g);if(style!==2)ball(.036,'#dc9b8f',px*1.6,.695,.236,g)}
    const smile=mesh(new THREE.TorusGeometry(.045,.007,6,14,Math.PI), '#895853',0,.692,.266,g);smile.rotation.z=Math.PI;
    if(style===1){for(const px of [-.082,.082])mesh(new THREE.TorusGeometry(.06,.009,6,16),'#514951',px,.76,.27,g);box(.045,.014,.02,'#514951',0,.76,.28,g)}
    if(style===2){
      // Joey：低矮短寸轮廓与偏方的短刘海，不再保留丸子或蓬松圆发束。
      round(.33,.075,.13,hair,0,.91,.17,.02,g);
      for(const px of [-.12,-.04,.04,.12])box(.06,.06,.08,hair,px,.94,.045,g);
      for(const px of [-.22,.22])round(.12,.36,.31,'#6c5884',px,.36,.01,.02,g);
    }
    if(style===0){art(.23,.24,0,.38,.299,(ctx,W,H)=>{ctx.fillStyle='#383540';ctx.fillRect(0,0,W,H);ctx.fillStyle='#edc573';ctx.beginPath();ctx.moveTo(300,40);ctx.lineTo(120,290);ctx.lineTo(260,290);ctx.lineTo(195,460);ctx.lineTo(410,190);ctx.lineTo(270,190);ctx.closePath();ctx.fill()},g)}
    if(style===1){mesh(new THREE.TorusGeometry(.277,.025,8,24,Math.PI),'#565057',0,.78,.025,g);for(const x of [-.279,.279]){const pad=cylinder(.08,.08,.06,'#6e6560',x,.76,.02,g);pad.rotation.z=Math.PI/2}}
    if(style===2){art(.23,.22,0,.36,.164,(ctx,W,H)=>{ctx.fillStyle='#745277';ctx.fillRect(0,0,W,H);ctx.fillStyle='#ecb5d5';ctx.font='350px sans-serif';ctx.textAlign='center';ctx.fillText('✦',W/2,390)},g)}
    return g;
  }
  person(-1.24,'#383540','#e5b196','#49374a',0);person(0,'#bda77e','#b98365','#433a35',1);person(1.24,'#745277','#efc5a8','#665046',2);
  // 靠右的小书桌，电脑屏幕与Very Three的小物件。
  for(const x of [2.75,3.65])for(const z of [-2.7,-1.15])box(.075,1.18,.075,'#a98061',x,.82,z);
  round(1.25,.15,1.85,'#dfb58d',3.19,1.47,-1.98,.04);
  const monitor=new THREE.Group();monitor.position.set(3.2,1.83,-2.49);monitor.rotation.y=-.3;house.add(monitor);
  box(.07,.3,.09,'#78697f',0,-.1,0,monitor);round(.8,.58,.09,'#777080',0,.21,0,.04,monitor);
  art(.69,.46,0,.21,.053,(ctx,w,h)=>{ctx.fillStyle='#c6bedf';ctx.fillRect(0,0,w,h);ctx.fillStyle='#eee2f1';ctx.beginPath();ctx.arc(w/2,h/2,120,0,7);ctx.fill();ctx.fillStyle='#89659c';ctx.font='100px sans-serif';ctx.textAlign='center';ctx.fillText('♡',w/2,295)},monitor);
  box(.6,.027,.27,'#eee5e8',3.20,1.57,-1.95);
  cylinder(.15,.17,.16,'#b49acb',3.65,1.62,-1.37);for(let i=0;i<4;i++){const pen=cylinder(.018,.018,.29,palette[i],3.59+i*.04,1.82,-1.37);pen.rotation.z=(i-2)*.1}
  // 留言板、照片墙：都是可点击的实物。
  box(1.9,1.18,.12,'#aa805c',1.83,2.87,-3.38);
  box(1.74,1.02,.02,'#d9b58f',1.83,2.87,-3.30);
  for(let i=0;i<3;i++){const n=box(.43,.45,.025,['#ffe6a0','#cddfca','#d7bce8'][i],1.25+i*.57,2.89,-3.27);n.rotation.z=[.12,-.08,.15][i];ball(.025,'#d47e7b',1.25+i*.57,3.065,-3.244)}
  const album=new THREE.Group();album.position.set(-3.91,2.45,3.9);album.rotation.y=Math.PI/2;house.add(album);
  box(2.65,2.3,.08,'#b08769',0,0,0,album);
  const livingFrames=[];
  for(let i=0;i<4;i++){
    const frame=new THREE.Group();frame.position.set((i%2-.5)*1.23,i<2?.55:-.55,.075);frame.rotation.z=[.02,-.02][i%2];album.add(frame);
    box(1.08,1.08,.028,'#fff7e6',0,0,0,frame);
    const photo=art(.90,.90,0,.035,.018,()=>{},frame);photo.name='living-photo-'+i;
    const ctx=photo.material.map.image.getContext('2d');
    function placeholder(){ctx.fillStyle=['#b2c8c5','#d0b8d2','#edc6a8'][i%3];ctx.fillRect(0,0,512,512);ctx.fillStyle='#fff3df';ctx.font='140px sans-serif';ctx.textAlign='center';ctx.fillText('♡',256,310);photo.material.map.needsUpdate=true}
    placeholder();livingFrames.push({photo,ctx,placeholder,revision:0});
  }
  // 矮柜、唱片、书与小植物。
  round(1.25,1.0,1.1,'#deb48e',-3.23,.73,2.35,.06);
  for(const x of [-3.52,-2.93])round(.5,.7,.08,'#eac49e',x,.75,2.94,.025);
  for(const x of [-3.50,-2.94])ball(.045,'#a57a59',x,.9,3.01);
  cylinder(.3,.3,.05,'#504653',-3.23,1.30,2.32);cylinder(.09,.09,.057,'#dca1b1',-3.23,1.308,2.32);
  for(let i=0;i<3;i++)box(.45,.055,.6,palette[i+2],-2.99,1.3+i*.06,2.7);
  function plant(x,y,z,size=1){const g=new THREE.Group();g.position.set(x,y,z);g.scale.setScalar(size);house.add(g);cylinder(.22,.16,.35,'#ddab8b',0,.175,0,g);cylinder(.19,.19,.015,'#685345',0,.36,0,g);cylinder(.025,.025,.75,'#6a977b',0,.69,0,g);for(let i=0;i<7;i++){const a=i*2.4;const leaf=ball(.16,i%2?'#91b29a':'#6f9a81',Math.cos(a)*.19,.49+i*.08,Math.sin(a)*.19,g);leaf.scale.set(.7,1.65,.65);leaf.rotation.z=Math.cos(a)*.8}return g}
  plant(-1.7,.21,.32,1.4);plant(2.3,.21,2.8,1.7);plant(3.57,1.55,-2.71,.52);
  // 落地灯与窗边的小猫。
  cylinder(.32,.32,.07,'#937b69',-2.45,.25,-2.08);cylinder(.035,.035,2.30,'#a58a70',-2.45,1.38,-2.08);
  const lampMat=new THREE.MeshStandardMaterial({color:'#ffe4a7',emissive:'#ffcc80',emissiveIntensity:.35,roughness:.9});cylinder(.31,.54,.58,lampMat,-2.45,2.7,-2.08);
  const lampLight=new THREE.PointLight('#ffbf7b',0,8,1.6);lampLight.position.set(-2.45,2.4,-1.9);scene.add(lampLight);
  // 小猫与猫窝使用同一场景；四只脚、头和尾巴可独立活动。
  const cat=new THREE.Object3D();cat.name='home-cat';cat.scale.setScalar(.85);cat.position.set(-2.5,.22,4.8);scene.add(cat);
  const body=ball(.24,'#ead4b4',0,.23,0,cat);body.scale.set(1.55,.85,.9);
  const catHead=new THREE.Group();catHead.position.set(.26,.35,0);cat.add(catHead);
  ball(.18,'#ead4b4',0,0,0,catHead);
  const catEyes=[];for(const z of [-.10,.1]){
    const ear=mesh(new THREE.ConeGeometry(.065,.13,3),'#ead4b4',.01,.18,z,catHead);ear.rotation.x=z>0?.2:-.2;
    mesh(new THREE.ConeGeometry(.037,.08,3),'#dcb0ae',.025,.18,z,catHead);
    catEyes.push(ball(.018,'#6b5b58',.155,.02,z*.75,catHead));
  }
  ball(.021,'#c68d98',.178,-.035,0,catHead);
  const catFeet=[];for(const x of [-.22,.23])for(const z of [-.13,.13])catFeet.push(ball(.075,'#e3c8a5',x,.06,z,cat));
  const tail=mesh(new THREE.TorusGeometry(.20,.055,8,16,Math.PI*1.2),'#e3c8a5',-.3,.22,-.10,cat);tail.rotation.x=Math.PI/2;
  const collar=cylinder(.155,.155,.035,'#b3a0d0',.23,.32,0,cat);collar.rotation.z=Math.PI/2;ball(.035,'#e4ba68',.25,.18,0,cat);
  const bed=new THREE.Group();bed.name='cat-bed';bed.position.set(-2.5,.21,4.8);house.add(bed);
  const cushion=cylinder(.58,.61,.09,'#c0b0cd',0,.045,0,bed);cushion.scale.z=.8;
  const rim=mesh(new THREE.TorusGeometry(.51,.09,10,32),'#d9c9de',0,.09,0,bed);rim.rotation.x=Math.PI/2;rim.scale.y=.8;
  const toy=ball(.10,'#a1bfb2',-1.45,.32,4.3);toy.name='cat-toy';
  const heart=art(.34,.34,0,.95,0,ctx=>{ctx.fillStyle='#d28fa7';ctx.font='bold 360px sans-serif';ctx.textAlign='center';ctx.fillText('♥',256,390)},cat);heart.name='cat-heart';heart.material.transparent=true;heart.material.depthWrite=false;heart.visible=false;
  // 短腿小狗：奶油色胸口、垂耳和独立尾巴，与小猫共用地面寻路。
  const dog=new THREE.Object3D();dog.name='home-dog';dog.position.set(1.25,.22,5.5);dog.scale.setScalar(.85);scene.add(dog);
  const dogBody=ball(.29,'#c89262',0,.27,0,dog);dogBody.scale.set(1.35,.85,.8);
  const dogHead=new THREE.Group();dogHead.position.set(.29,.43,0);dog.add(dogHead);
  const skull=ball(.22,'#c89262',0,0,0,dogHead);skull.scale.set(1,1,.85);
  const muzzle=ball(.14,'#f4e4c9',.16,-.065,0,dogHead);muzzle.scale.set(1.1,.7,.9);
  ball(.042,'#51423d',.285,-.035,0,dogHead);
  const dogEyes=[];for(const z of [-.13,.13]){
    dogEyes.push(ball(.024,'#473b38',.135,.035,z,dogHead));
    const ear=ball(.12,'#946943',-.055,-.02,z*1.4,dogHead);ear.scale.set(.65,1.55,.55);ear.rotation.x=z>0?-.18:.18;
  }
  const chest=ball(.17,'#f4e4c9',.22,.24,0,dog);chest.scale.set(.5,1,.95);
  const dogFeet=[];for(const x of [-.22,.22])for(const z of [-.14,.14]){const foot=ball(.085,'#f4e4c9',x,.065,z,dog);foot.scale.y=1.25;dogFeet.push(foot)}
  const dogTail=new THREE.Group();dogTail.position.set(-.32,.32,0);dog.add(dogTail);
  const tuft=ball(.10,'#c89262',-.13,.07,0,dogTail);tuft.scale.set(1.6,.7,.7);
  const dogCollar=cylinder(.18,.18,.045,'#87b9b0',.24,.35,0,dog);dogCollar.rotation.z=Math.PI/2;ball(.038,'#e4ba68',.26,.21,0,dog);
  const dogBed=new THREE.Group();dogBed.name='dog-bed';dogBed.position.set(1.25,.21,5.5);house.add(dogBed);
  const dogCushion=cylinder(.62,.65,.08,'#8eaaa1',0,.04,0,dogBed);dogCushion.scale.z=.8;
  const dogRim=mesh(new THREE.TorusGeometry(.55,.075,10,32),'#bdd1c4',0,.075,0,dogBed);dogRim.rotation.x=Math.PI/2;dogRim.scale.y=.8;
  // 不遮挡模型的底部软阴影。
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({opacity:.10}));ground.rotation.x=-Math.PI/2;ground.name='shadow-ground';ground.position.y=-.52;ground.receiveShadow=true;scene.add(ground);
  const livingHotDefs=[{id:'dog-pet',text:'摸摸小狗',p:new THREE.Vector3(0,1.2,0)},{id:'cat-pet',text:'摸摸小猫',p:new THREE.Vector3(0,1.15,0)},{id:'memories',text:'我们的回忆',p:new THREE.Vector3(-3.5,3.85,3.9)},{id:'notes',text:'留一句话',p:new THREE.Vector3(2.0,3.75,-3.0)},{id:'people',text:'我们仨',p:new THREE.Vector3(.0,2.40,-1.8)},{id:'plans',text:'下一次见面',p:new THREE.Vector3(.35,1.3,1.3)}];
  let hotDefs=livingHotDefs;const hotEl=stage.querySelector('#hotspots');function mountHotspots(){hotEl.replaceChildren();hotDefs.forEach(h=>{const b=document.createElement('button');b.className='hotspot';b.textContent=h.text;b.onclick=()=>h.id==='cat-pet'?petCat():h.id==='dog-pet'?petDog():onOpen(h.id);hotEl.append(b);h.el=b})}mountHotspots();
  // 点击真实物件也能打开面板；拖动时不误触。
  const hits=[];function hit(id,x,y,z,w,h,d){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshBasicMaterial({visible:false}));m.position.set(x,y,z);m.userData.id=id;m.userData.room=house;house.add(m);hits.push(m)}
  const catHit=new THREE.Mesh(new THREE.BoxGeometry(.95,.75,.65),new THREE.MeshBasicMaterial({visible:false}));catHit.position.y=.3;catHit.userData={id:'cat-pet',room:livingRoom};cat.add(catHit);hits.push(catHit);
  const dogHit=new THREE.Mesh(new THREE.BoxGeometry(1.05,.85,.65),new THREE.MeshBasicMaterial({visible:false}));dogHit.position.y=.35;dogHit.userData={id:'dog-pet',room:livingRoom};dog.add(dogHit);hits.push(dogHit);
  hit('people',0,1.7,-2.05,3.8,1.2,.9);hit('notes',1.85,2.85,-3.25,2,1.25,.2);hit('memories',-3.83,2.45,3.9,.3,2.3,2.65);hit('plans',0,.95,.65,2.5,.3,1.6);hit('lamp',-2.45,2.7,-2.08,1,.7,1);
  // 三个卧室始终处于同一户型，家具分组用于定位和维护。
  const rooms=[],roomHotDefs=[],roomFrames=[[],[],[]],decorLights=[],animatedProps=[],residentPoses=[];
  // 扩建地面，家具保留原始比例；各房间向空闲方向扩展，保持连通和通道。
  const floorPlans=[
    {minX:-6.05,maxX:4.15,minZ:-3.65,maxZ:5.05},
    {minX:-4.15,maxX:4.15,minZ:-3.65,maxZ:6.65},
    {minX:-4.15,maxX:4.15,minZ:-3.65,maxZ:3.65,wing:{minX:-.45,maxX:4.15,minZ:3.65,maxZ:8.95}}
  ];
  function redistributeRoom(index){
    // 只平移功能区，绝不缩放床、玩偶或相框。
    house.children.forEach(child=>{
      if(child.userData.architecture||child.name==='room-window')return;
      const {x,z}=child.position;
      if(index===0){
        if(x<-3.5)child.position.x-=1.9;
        else if(x<-.3&&z<-1)child.position.x-=1.1;
        else if(x<-.8&&z>1)child.position.x-=.7;
      }else if(index===1&&z>.4&&x<.8){child.position.z+=2.1}
      else if(index===2){
        if(child.name==='resident-2'||(x>3.2&&z>-.6&&z<1.95)||(x>1&&x<1.65&&z>1&&z<1.8))child.position.z+=5.8;
        else if(x<1&&z>1){
          const bounds=new THREE.Box3().setFromObject(child),size=bounds.getSize(new THREE.Vector3());
          if(size.x>1.5&&size.z>1.5)return;
          child.position.x+=2.9;child.position.z+=4.8;
        }
      }
    });
    const pose=residentPoses.find(p=>p.room===index);pose.position.copy(pose.resident.position);
  }
  const themes=[{wall:'#77717f',side:'#b8adaf',base:'#514958',quilt:'#4d505f',wood:'#9b8475'},
    {wall:'#dec9ac',side:'#b6c3b2',base:'#836445',quilt:'#9aab90',wood:'#b28c66'},
    {wall:'#b5a6c8',side:'#929dbb',base:'#6c6088',quilt:'#8c73ac',wood:'#b7a1b9'}];
  function poster(w,h,x,y,z,index){box(w+.10,h+.10,.06,'#f2e6d5',x,y,z);art(w,h,x,y,z+.04,(ctx,W,H)=>{ctx.fillStyle=['#514352','#e4ccaa','#785590'][index];ctx.fillRect(0,0,W,H);ctx.textAlign='center';ctx.fillStyle=['#f4d19a','#806147','#f6c0df'][index];ctx.font='bold 72px sans-serif';ctx.fillText(['ROCK / PLAY','VINYL DAYS','K-POP / MOOD'][index],W/2,130);ctx.font='170px sans-serif';ctx.fillText(['ϟ','◎','✦'][index],W/2,350)})}
  function smallDesk(x,z,color){for(const dx of [-.83,.83])for(const dz of [-.35,.35])box(.075,1.15,.075,'#927b67',x+dx,.79,z+dz);round(2.1,.14,1.05,color,x,1.41,z,.04)}
  function chair(x,z,color){cylinder(.30,.3,.10,'#8c8092',x,.33,z);cylinder(.05,.05,.53,'#8c8092',x,.6,z);round(.72,.15,.66,color,x,.91,z,.05);round(.72,.7,.15,color,x,1.31,z+.29,.05)}
  function screen(x,y,z,color,width=1.0){round(width,.68,.09,'#554c68',x,y,z,.04);art(width-.10,.56,x,y,z+.052,(ctx,W,H)=>{ctx.fillStyle=color;ctx.fillRect(0,0,W,H);ctx.fillStyle='#f8e7ff';for(let r=0;r<5;r++){ctx.fillRect(50,70+r*65,180+(r%2)*100,13)}ctx.fillStyle='#bfddcd';ctx.fillRect(360,60,90,330)});box(.07,.22,.08,'#75697f',x,y-.44,z);box(.44,.04,.25,'#75697f',x,y-.53,z)}
  function glow(color,x,y,z,parent=house){
    const material=new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.65,roughness:.45});
    const strip=box(.035,.035,2.45,material,x,y,z,parent);strip.castShadow=false;
    const light=new THREE.PointLight(color,.35,4,2);light.position.set(x,y,z);parent.add(light);decorLights.push(light);
    return strip;
  }
  function magazine(x,y,z,color,title,parent=house){
    box(.40,.045,.53,color,x,y,z,parent);
    const cover=art(.36,.48,x,y+.026,z,(ctx,W,H)=>{ctx.fillStyle=color;ctx.fillRect(0,0,W,H);ctx.fillStyle='#fff3df';ctx.font='bold 72px sans-serif';ctx.textAlign='center';ctx.fillText(title,W/2,120);ctx.lineWidth=8;ctx.strokeStyle='#fff3df';ctx.strokeRect(65,180,380,230)},parent);cover.rotation.x=-Math.PI/2;
  }
  function dressRoom(i,resident){
    const t=themes[i];
    // 窗边织物与床尾毯，增加柔软材质和高低层次。
    for(const z of [-1.17,1.37]){
      for(let n=0;n<5;n++)round(.12,2.05,.12,['#76717f','#b8a17e','#847a9c'][i],-3.79,2.38,z+(n-2)*.065,.025);
      box(.06,.075,.55,t.base,-3.80,3.48,z);
    }
    round(1.2,.09,.95,['#ca9b83','#d7c4a4','#ada4c9'][i],2.45,1.145,-.50,.025);
    for(let n=0;n<7;n++)box(.012,.011,.85,t.base,1.94+n*.16,1.195,-.50);
    // 床头竖向饰板保留上方相框，不遮挡照片上传入口。
    for(let n=0;n<14;n++)box(.075,1.55,.04,t.base,.24+n*.235,1.12,-3.43);
    // 床边软垫小凳与置物层，右侧留出通过房门的空间。
    for(const x of [1.15,2.35])for(const z of [.05,.48])box(.055,.35,.055,t.base,x,.39,z);
    round(1.45,.18,.65,t.quilt,1.75,.66,.28,.06);
    magazine(1.98,.79,.25,['#665969','#9a805e','#74729a'][i],['PLAY','SIDE A','MOOD'][i]);
    if(i===0){
      resident.position.set(-1.6,1.0,-1.27);resident.rotation.y=Math.PI;
      const controller=new THREE.Group();controller.name='piggy-controller';controller.position.set(0,.20,.25);resident.add(controller);
      round(.43,.13,.22,'#e5ddd5',0,0,0,.03,controller);for(const x of [-.12,.12])ball(.032,'#6c597f',x,.075,0,controller);
      for(const side of [-1,1]){const hand=resident.getObjectByName(side<0?'left-hand':'right-hand');hand.position.set(side*.22,.24,.25);const arm=resident.getObjectByName(side<0?'left-arm':'right-arm');arm.position.set(side*.29,.31,.13);arm.rotation.x=-.9;arm.rotation.z=side*.3}
      // 演出海报、游戏收藏与主机展示形成摇滚电玩角。
      poster(1.30,.90,-2.26,2.95,-3.40,0);
      box(1.80,.11,.55,'#635365',-2.35,3.67,-3.04);
      for(let n=0;n<6;n++){box(.18,.34,.27,palette[(n+3)%6],-3.05+n*.23,3.90,-3.07);box(.09,.21,.01,'#efe6d3',-3.05+n*.23,3.90,-2.927)}
      const pcGlow=new THREE.MeshStandardMaterial({color:'#c79bdc',emissive:'#ae70d1',emissiveIntensity:.8});
      const indicator=box(.8,.025,.035,pcGlow,-1.64,1.75,-2.74);indicator.name='game-screen-pulse';animatedProps.push({kind:'screen',mesh:indicator});
      glow('#ba82e2',-2.99,1.1,-2.55);
      // 前侧懒人沙发与零食篮，不堵北侧通向客厅的门。
      const bean=ball(.66,'#59606c',.12,.64,2.25);bean.scale.set(1.25,.70,1.05);
      round(.55,.10,.55,'#d4a18c',.06,.99,2.35,.04);
      box(.60,.34,.45,'#bc9870',1.43,.39,2.70);for(let n=0;n<3;n++)round(.14,.31,.12,palette[n],1.24+n*.17,.62,2.70,.015);
      magazine(-.54,.25,1.20,'#7b5968','LIVE');
      // 线材用曲线收束在音箱边，作为生活细节。
      const cable=new THREE.CatmullRomCurve3([new THREE.Vector3(-2.6,.24,1.4),new THREE.Vector3(-2.5,.24,2.2),new THREE.Vector3(-1.7,.24,2.2),new THREE.Vector3(-1.5,.24,1.8)]);
      mesh(new THREE.TubeGeometry(cable,24,.012,5,false),'#473e4b');
    }else if(i===1){
      resident.position.set(-1.78,.83,1.11);resident.rotation.y=Math.PI+.20;for(const side of [-1,1]){resident.getObjectByName(side<0?'left-hand':'right-hand').position.set(side*.23,.24,.29);const arm=resident.getObjectByName(side<0?'left-arm':'right-arm');arm.position.set(side*.27,.31,.16);arm.rotation.x=-1.05;}
      const sleeve=new THREE.Group();sleeve.name='resident-record-sleeve';sleeve.position.set(0,.22,.29);resident.add(sleeve);
      box(.48,.48,.035,'#937657',0,.10,0,sleeve);art(.41,.41,0,.10,.022,(ctx,W,H)=>{ctx.fillStyle='#d5bc95';ctx.fillRect(0,0,W,H);ctx.fillStyle='#766650';ctx.font='bold 64px sans-serif';ctx.textAlign='center';ctx.fillText('SIDE A',W/2,150);ctx.beginPath();ctx.arc(256,320,105,0,Math.PI*2);ctx.fill()},sleeve);
      // 温暖胡桃木墙架、唱片分类与窗边落地灯。
      box(2.42,.12,.42,'#836445',-1.73,3.65,-3.15);
      for(let n=0;n<9;n++)box(.14,.26,.22,['#7d6d58','#bda782','#7b9080'][n%3],-2.73+n*.24,3.83,-3.15);
      for(let n=0;n<9;n++)box(.09,1.34,.04,'#a17d59',-3.24+n*.36,1.05,-3.43);
      cylinder(.30,.30,.05,'#836445',-2.97,.25,.96);cylinder(.027,.027,2.43,'#836445',-2.97,1.46,.96);cylinder(.28,.49,.55,lampMat,-2.97,2.67,.96);
      // 曲线阅读地毯与书堆，留住慢节奏的听音氛围。
      const rug=cylinder(1.15,1.15,.022,'#d4c5a5',-1.47,.26,1.18);rug.scale.z=1.22;
      for(let n=0;n<4;n++)box(.44,.055,.58,['#b9a181','#738b7e','#cfb591','#8c7867'][n],.52,.27+n*.055,2.36);
      magazine(-.27,.86,1.30,'#8c785f','ANALOG');
      cylinder(.12,.10,.17,'#efe0c7',.03,.91,1.35);cylinder(.09,.09,.01,'#78593d',.03,1.0,1.35);
      glow('#efc17d',-.44,1.45,-2.68);
    }else{
      resident.position.set(2.64,.62,1.03);resident.rotation.y=Math.PI/2;
      // 金属网格拼贴板，用原创几何海报避免依赖外部艺人照片。
      box(1.70,1.0,.055,'#5c5876',-2.02,3.07,-3.38);
      for(let n=0;n<7;n++)box(.012,.88,.025,'#b4a2c9',-2.76+n*.245,3.07,-3.34);
      for(let n=0;n<4;n++)box(1.55,.012,.025,'#b4a2c9',-2.02,2.65+n*.27,-3.34);
      for(let n=0;n<3;n++){const card=box(.35,.43,.04,['#e0a4bf','#9daed1','#d0ba9c'][n],-2.57+n*.55,3.08,-3.30);card.rotation.z=[.12,-.1,.07][n]}
      box(2.12,.10,.43,'#6d6686',-1.97,3.77,-3.04);
      for(let n=0;n<3;n++){cylinder(.085,.08,.22,palette[n+3],-2.56+n*.48,3.93,-3.05);ball(.10,'#eee2dc',-2.56+n*.48,4.12,-3.05)}
      glow('#c38edc',-2.96,1.96,-3.06);glow('#83bcd9',3.45,2.15,.68);
      // 镜边圆灯、首饰托盘、杂志与鞋盒组成换装空间。
      for(const y of [.72,1.25,1.78,2.31,2.84])ball(.043,lampMat,3.35,y,.15);
      round(.62,.05,.38,'#a490ba',1.32,.53,1.40,.015);mesh(new THREE.TorusGeometry(.08,.014,8,16),'#d6be82',1.24,.58,1.4).rotation.x=Math.PI/2;
      for(let n=0;n<2;n++){box(.67,.28,.42,['#817494','#c3a8bd'][n],-.70,.38+n*.29,2.68);box(.70,.045,.44,'#ece0de',-.70,.54+n*.29,2.68)}
      magazine(.34,.27,2.0,'#907b9f','ZINE');magazine(.68,.32,2.12,'#7286aa','SEOUL');
      // 宽松外套放在镜前玩偶身上，手抬起整理衣袖。
      resident.getObjectByName('right-hand').position.set(.22,.40,.23);resident.getObjectByName('right-arm').rotation.x=-1.5;resident.getObjectByName('right-arm').position.set(.28,.38,.09);
    }
    residentPoses.push({resident,room:i,position:resident.position.clone(),rotation:resident.rotation.y});
  }
  for(let i=0;i<3;i++){
    const t=themes[i],plan=floorPlans[i],width=plan.maxX-plan.minX,depth=plan.maxZ-plan.minZ,cx=(plan.minX+plan.maxX)/2,cz=(plan.minZ+plan.maxZ)/2;
    house=new THREE.Group();house.name='personal-room-'+i;house.userData.floorPlan=plan;house.visible=true;scene.add(house);rooms.push(house);
    const grain=canvasTexture((ctx,W,H)=>{ctx.fillStyle='#f3e9dc';ctx.fillRect(0,0,W,H);for(let n=0;n<70;n++){ctx.strokeStyle=n%3?'#c7b5a0':'#dfd0bd';ctx.lineWidth=n%4===0?2:1;ctx.beginPath();ctx.moveTo(0,n*H/70);ctx.bezierCurveTo(W*.35,n*H/70+3,W*.65,n*H/70-3,W,n*H/70);ctx.stroke()}},256,256);
    grain.wrapS=grain.wrapT=THREE.RepeatWrapping;grain.repeat.set(2,5);
    const floorMaterial=new THREE.MeshStandardMaterial({color:t.wood,map:grain,roughness:.74});
    box(width,.12,depth,floorMaterial,cx,.12,cz).name='floor-room-'+i;
    for(let z=plan.minZ+.3;z<plan.maxZ-.1;z+=.39)box(width-.3,.012,.013,'#a99380',cx,.19,z);
    box(width-.05,3.9,.18,t.wall,cx,2.08,-3.56).name='room-back-wall';const leftWall=box(.18,3.9,depth,t.side,plan.minX+.1,2.08,cz);leftWall.name='room-left-wall';
    box(width-.1,.14,.1,'#f4e6d2',cx,.28,-3.42);box(.1,.14,depth-.1,'#f4e6d2',plan.minX+.22,.28,cz).name='room-left-trim';
    box(width+.1,.15,.25,t.base,cx,4.07,-3.56);box(.25,.15,depth,t.base,plan.minX+.1,4.07,cz);
    if(plan.wing){
      const wing=plan.wing,wx=(wing.minX+wing.maxX)/2,wz=(wing.minZ+wing.maxZ)/2;
      box(wing.maxX-wing.minX,.12,wing.maxZ-wing.minZ,floorMaterial,wx,.12,wz).name='floor-room-2-wing';
      for(let z=wing.minZ+.2;z<wing.maxZ-.1;z+=.39)box(wing.maxX-wing.minX-.2,.012,.013,'#a99380',wx,.19,z);
      // 换装翼采用低隔断，保留可见性和左侧通道。
      box(.10,.65,wing.maxZ-wing.minZ,t.base,wing.maxX-.07,.50,wz);
      box(.045,.04,wing.maxZ-wing.minZ,'#cfbfdc',wing.maxX-.14,.84,wz);
    }
    house.children.forEach(child=>child.userData.architecture=true);
    const roomWindow=window.clone(true);roomWindow.name='room-window';roomWindow.position.set(plan.minX+.215,2.4,.1);house.add(roomWindow);
    // 每间卧室都有床、两只枕头、床头柜和自己的灯。
    for(const x of [.5,2.9])for(const z of [-2.8,-.6])cylinder(.07,.07,.31,'#8c6a55',x,.34,z);
    round(3.0,.45,2.95,t.wood,1.7,.59,-1.72,.08);round(3.05,1.1,.18,t.base,1.7,1.14,-3.13,.08);
    round(2.91,.22,2.78,'#f6ecdc',1.7,.91,-1.72,.10);round(2.90,.11,1.9,t.quilt,1.7,1.075,-1.22,.04);
    for(const x of [1.04,2.30])round(1.12,.20,.62,'#fff1dc',x,1.10,-2.7,.075);
    for(let n=0;n<6;n++)box(.10,.012,1.9,palette[n],.42+n*.12,1.14,-1.22);
    round(.75,.66,.68,t.wood,3.48,.56,-2.72,.05);box(.61,.025,.50,'#f3dfc8',3.48,.91,-2.72);ball(.035,'#a58268',3.48,.64,-2.36);
    cylinder(.13,.13,.04,'#a78267',3.48,.95,-2.72);cylinder(.025,.025,.34,'#a78267',3.48,1.12,-2.72);cylinder(.15,.26,.28,lampMat,3.48,1.40,-2.72);
    round(3.5,.025,2.6,i===1?'#aba2c5':'#ead8bd',.3,.23,1.08,.008);
    // 每个房间三个真实相框，每格各自持有可更新的 CanvasTexture。
    for(let slot=0;slot<3;slot++){
      const x=.43+slot*1.34,y=2.78,z=-3.36;
      round(1.12,1.18,.10,['#a88f7b','#ad906a','#a47bb5'][i],x,y,z,.025);
      box(1.02,1.08,.025,'#fff4e4',x,y,z+.059);
      const photo=art(.87,.87,x,y+.045,z+.08,()=>{});photo.name=`room-photo-${i}-${slot}`;
      const canvas=photo.material.map.image,ctx=canvas.getContext('2d');
      function placeholder(){ctx.fillStyle=['#d6c4c6','#dfcdb3','#d3badf'][i];ctx.fillRect(0,0,512,512);ctx.fillStyle=['#8c727c','#947a58','#9773a4'][i];ctx.textAlign='center';ctx.font='130px sans-serif';ctx.fillText('＋',256,250);ctx.font='36px sans-serif';ctx.fillText('放一张自己的照片',256,350);photo.material.map.needsUpdate=true}
      placeholder();roomFrames[i].push({photo,ctx,placeholder,revision:0});
      hit(`frame${i}-${slot}`,x,y,z+.10,1.1,1.18,.15);
    }
    // 彩虹以生活装饰出现，三间房间都有一条彩虹挂饰。
    palette.forEach((c,n)=>box(.18,.19,.04,c,-.14+n*.19,3.54,-3.41));
    const resident=avatars[i];resident.name='resident-'+i;house.add(resident);
    if(i===0){
      // Piggy：摇滚和游戏共享一个房间，暖灰紫里放一点舞台色。
      smallDesk(-1.64,-2.48,t.wood);screen(-1.64,2.05,-2.81,'#65576f',1.55);chair(-1.6,-1.27,'#625766');
      box(.92,.035,.29,'#413a4b',-1.7,1.51,-2.20);palette.forEach((c,n)=>box(.10,.008,.20,c,-2+n*.12,1.533,-2.2));
      round(.43,.85,.48,'#413a4b',-2.85,.70,-2.45,.05);for(let n=0;n<2;n++)mesh(new THREE.TorusGeometry(.12,.018,8,18),palette[n+3],-2.85,.53+n*.31,-2.20);
      round(.44,.10,.24,'#ece1de',-1.00,1.54,-2.18,.03);ball(.038,'#64536f',-1.12,1.61,-2.18);ball(.025,'#64536f',-.88,1.61,-2.18);
      // 电吉他由双圆琴身、琴颈、琴头和琴弦构成。
      const guitar=new THREE.Group();guitar.position.set(-2.70,.24,1.45);guitar.rotation.z=-.12;house.add(guitar);
      const lower=ball(.32,'#a55263',0,.45,0,guitar);lower.scale.set(1.0,1.04,.3);const upper=ball(.24,'#a55263',0,.86,0,guitar);upper.scale.set(1,1,.3);
      round(.17,1.04,.08,'#775b4a',0,1.34,0,.02,guitar);round(.22,.28,.09,'#ceaf86',.02,1.97,0,.02,guitar);
      round(.30,.40,.028,'#efe0c8',.04,.63,.105,.014,guitar);box(.22,.055,.03,'#584b51',0,.53,.139,guitar);
      for(let n=0;n<4;n++){box(.007,1.32,.012,'#c8c2bb',-.046+n*.03,1.16,.064,guitar);ball(.025,'#c9c4bb',n%2?-.13:.15,1.89+Math.floor(n/2)*.11,0,guitar)}
      round(.86,.76,.54,'#494149',-1.52,.60,1.66,.04);box(.74,.53,.02,'#786a69',-1.52,.58,1.94);for(let n=0;n<7;n++)box(.71,.012,.026,'#574d55',-1.52,.35+n*.066,1.96);
      box(.48,.04,.03,'#ddc5a3',-1.52,.91,1.955);for(const x of [-1.65,-1.4])ball(.025,'#d1b89a',x,.91,1.99);
      plant(3.20,.21,2.45,1.05);
    }else if(i===1){
      // 4010：黑胶柜、唱片机、左右音箱，房间是温暖的聆听空间。
      round(2.24,1.05,.84,t.wood,-1.60,.77,-2.75,.06);
      for(const x of [-2.22,-1.0]){box(.94,.71,.04,'#8b735d',x,.78,-2.31);for(let n=0;n<8;n++)box(.074,.56,.37,palette[(n+2)%6],x-.36+n*.095,.78,-2.38)}
      round(1.05,.12,.64,'#80634f',-1.55,1.40,-2.75,.035);const vinyl=cylinder(.25,.25,.035,'#38343a',-1.62,1.49,-2.75);vinyl.name='spinning-vinyl';animatedProps.push({kind:'vinyl',mesh:vinyl});box(.022,.002,.09,'#f5d5a1',.10,.019,0,vinyl);cylinder(.072,.072,.038,'#c39b70',-1.62,1.492,-2.75);
      const arm=box(.36,.026,.026,'#d6c5b2',-1.24,1.54,-2.78);arm.rotation.y=-.5;ball(.026,'#e8d7c0',-1.06,1.54,-2.68);
      for(const x of [-3.16,-.03]){round(.58,1.36,.55,'#654e40',x,.95,-2.75,.04);for(const y of [.76,1.35]){const speaker=cylinder(y>.9?.11:.20,y>.9?.11:.20,.02,'#3e3838',x,y,-2.46);speaker.rotation.x=Math.PI/2;const ring=mesh(new THREE.TorusGeometry(y>.9?.105:.19,.012,8,24),'#b19470',x,y,-2.44)}}
      // 展示的唱片为原创封套，避免虚构具体歌手与专辑。
      for(let n=0;n<3;n++){box(.68,.74,.055,['#817382','#b29172','#739586'][n],-2.9+n*.82,2.83,-3.39);const record=cylinder(.19,.19,.022,'#3d373e',-2.9+n*.82,2.88,-3.34);record.rotation.x=Math.PI/2;const label=cylinder(.059,.059,.026,palette[n+2],-2.9+n*.82,2.88,-3.322);label.rotation.x=Math.PI/2}
      round(1.13,.33,1.1,'#c2ad8d',-1.78,.62,1.11,.10);round(1.13,.87,.22,'#b5a17f',-1.78,1.08,1.58,.09);for(const x of [-2.38,-1.18])round(.17,.48,1.06,'#b5a17f',x,.85,1.11,.04);
      cylinder(.43,.43,.09,t.wood,-.25,.78,1.30);cylinder(.055,.08,.50,'#92745b',-.25,.49,1.30);box(.30,.035,.37,'#dfc4a3',-.25,.85,1.30);
      plant(-3.12,.21,2.57,1.35);plant(3.10,.21,2.47,1.05);
    }else{
      // Joey：亚文化拼贴、专辑陈列和穿衣镜，粉紫也可以很有锋芒。
      box(1.9,.10,.65,'#b68fb3',-1.94,1.10,-3.03);box(1.9,.10,.65,'#b68fb3',-1.94,2.00,-3.03);
      for(let n=0;n<6;n++){const albumColor=['#836693','#dd9fbe','#7496bd','#bd829e','#bbafd3','#515066'][n];box(.24,.43,.36,albumColor,-2.64+n*.28,1.36,-3.0);ball(.035,'#f0d9ea',-2.64+n*.28,1.42,-2.80)}
      for(let n=0;n<3;n++){box(.45,.58,.06,['#d996bb','#7e91bb','#686078'][n],-2.54+n*.60,2.34,-2.89);art(.36,.43,-2.54+n*.60,2.34,-2.85,(ctx,W,H)=>{ctx.fillStyle=['#d996bb','#7e91bb','#686078'][n];ctx.fillRect(0,0,W,H);ctx.fillStyle='#fff0ed';ctx.font='270px sans-serif';ctx.textAlign='center';ctx.fillText(['✦','♡','★'][n],W/2,365)})}
      // 穿衣镜用柔和图案材质表达，不使用高成本实时反射。
      const mirror=new THREE.Group();mirror.position.set(3.45,1.78,.7);mirror.rotation.y=-Math.PI/2;house.add(mirror);
      for(const x of [-.45,.45]){box(.06,.35,.06,'#897394',x,-1.43,0,mirror);box(.09,.06,.55,'#897394',x,-1.57,0,mirror)}
      round(1.18,2.61,.1,'#a582b5',0,0,0,.08,mirror);art(1.04,2.43,0,0,.065,(ctx,W,H)=>{const grad=ctx.createLinearGradient(0,0,W,H);grad.addColorStop(0,'#d3dce4');grad.addColorStop(1,'#b8bdd9');ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);ctx.strokeStyle='#efedf8';ctx.lineWidth=20;ctx.beginPath();ctx.moveTo(90,330);ctx.lineTo(330,100);ctx.moveTo(180,430);ctx.lineTo(415,210);ctx.stroke()},mirror);
      // 衣架上的宽松外套和随身小包。
      for(const x of [-1.85,-.3])cylinder(.035,.035,1.8,'#897394',x,1.14,1.52);const rack=cylinder(.035,.035,1.62,'#897394',-1.07,2.02,1.52);rack.rotation.z=Math.PI/2;
      for(let n=0;n<2;n++){const x=-1.46+n*.64;round(.48,.72,.18,['#59536d','#d69bbd'][n],x,1.48,1.52,.035);for(const dx of [-.3,.3]){const sleeve=round(.18,.49,.17,['#59536d','#d69bbd'][n],x+dx,1.57,1.52,.03);sleeve.rotation.z=dx>0?.3:-.3}}
      round(.33,.35,.16,'#755c87',-.22,1.16,1.76,.05);mesh(new THREE.TorusGeometry(.12,.012,6,18,Math.PI),'#ba9cc6',-.22,1.4,1.76);
      round(.65,.12,.62,'#ae8ebd',1.32,.44,1.40,.05);for(let n=0;n<4;n++)box(.035,.30,.035,'#836b91',1.05+(n%2)*.54,.24,1.14+Math.floor(n/2)*.52);
      plant(3.12,.21,2.45,1.2);
    }
    dressRoom(i,resident);
    redistributeRoom(i);
    hit('room'+i,resident.position.x,resident.position.y+.45,resident.position.z,.85,1.15,.85);
    roomHotDefs.push([{id:'room'+i,text:['Piggy · 摇滚与电玩','4010 · 黑胶聆听室','Joey · 亚文化与 K-pop'][i],p:resident.position.clone().add(new THREE.Vector3(0,1.30,.2))},{id:'frames'+i,text:'相框 · 上传照片',p:new THREE.Vector3(1.78,3.67,-3.10)},{id:'notes',text:'给家里留句话',p:new THREE.Vector3(.3,.95,1.75)}]);
  }
  // 三个人共同生活的痕迹：外套、杂志和一盘零食。
  house=livingRoom;
  // 客厅前侧只铺一块活动毯，保留放游戏桌、礼物柜与行走的空间。
  round(5.0,.025,1.7,'#c2ccbb',0,.23,4.7,.008);
  round(.72,.035,.68,'#847291',1.20,1.47,-2.72,.015);
  for(let n=0;n<3;n++)box(.045,.02,.50,'#c1aacf',.95+n*.12,1.50,-2.70);
  magazine(-.22,.99,.76,'#927482','OUR DAYS',table);
  cylinder(.23,.23,.035,'#ead7b5',-.67,.98,.35,table);for(let n=0;n<5;n++)ball(.045,'#c69262',-.82+(n%3)*.12,1.02,.27+Math.floor(n/3)*.13,table);
  // 客厅居中：北侧庭院、西侧 4010、东侧 Joey，南侧 Piggy。
  const layout=[new THREE.Vector3(0,0,11.95),new THREE.Vector3(-8.3,0,0),new THREE.Vector3(8.3,0,0)];
  livingRoom.name='living-room';livingRoom.position.set(0,0,0);
  rooms.forEach((room,i)=>{room.position.copy(layout[i]);room.visible=true});
  const building=new THREE.Group();building.name='shared-foundation';scene.add(building);
  // 单一十字形地台；每个房间只有一层地板，避免共面引起深度闪烁。
  const outline=[[-5,-11.65],[3,-11.65],[3,-3.65],[12.45,-3.65],[12.45,8.95],[7.85,8.95],[7.85,3.65],[4.15,3.65],[4.15,6.45],[2,6.45],[2,8.3],[4.15,8.3],[4.15,17],[-6.05,17],[-6.05,8.3],[-2,8.3],[-2,6.45],[-4.15,6.45],[-4.15,6.65],[-12.45,6.65],[-12.45,-3.65],[-5,-3.65]];
  const footprint=new THREE.Shape();outline.forEach(([x,z],i)=>i?footprint.lineTo(x,z):footprint.moveTo(x,z));footprint.closePath();
  const baseGeometry=new THREE.ExtrudeGeometry(footprint,{depth:.48,bevelEnabled:false,steps:1});baseGeometry.rotateX(Math.PI/2);
  mesh(baseGeometry,'#b89cbd',0,.08,0,building).name='foundation-slab';
  box(4,.12,1.85,'#d0b397',0,.12,7.375,building).name='floor-entry';
  round(1.4,.025,.75,'#88b8a0',0,.20,7.35,.02,building);
  art(1.2,.25,0,.215,7.3,(ctx,W,H)=>{ctx.fillStyle='#88b8a0';ctx.fillRect(0,0,W,H);ctx.fillStyle='#fff3df';ctx.font='bold 95px sans-serif';ctx.textAlign='center';ctx.fillText('WELCOME',W/2,300)},building).rotation.x=-Math.PI/2;
  // 内墙保留门洞，让房间通过同一片地板连起来。
  function doorway(group,wall,axis,center,color,label,id){
    group.remove(wall);const half=axis==='x'?4.125:3.65,width=1.2,opening=2.45;
    const leftEnd=center-width/2,rightStart=center+width/2;
    const range=group.userData.floorPlan,min=axis==='z'?range.minZ:-half,max=axis==='z'?range.maxZ:half;
    const trim=group.getObjectByName('room-left-trim');if(axis==='z'&&trim){group.remove(trim);box(.1,.14,leftEnd+half,'#f4e6d2',-3.93,.28,(-half+leftEnd)/2,group);box(.1,.14,half-rightStart,'#f4e6d2',-3.93,.28,(rightStart+half)/2,group);}
    if(axis==='x'){
      box(leftEnd+half,3.9,.18,color,(-half+leftEnd)/2,2.08,-3.56,group);
      box(half-rightStart,3.9,.18,color,(rightStart+half)/2,2.08,-3.56,group);
      box(width,4.03-opening,.18,color,center,(4.03+opening)/2,-3.56,group);
    }else{
      box(.18,3.9,leftEnd-min,color,-4.05,2.08,(min+leftEnd)/2,group);
      box(.18,3.9,max-rightStart,color,-4.05,2.08,(rightStart+max)/2,group);
      box(.18,4.03-opening,width,color,-4.05,(4.03+opening)/2,center,group);
    }
    const door=new THREE.Group();door.name='door-'+label;group.add(door);
    if(axis==='x')door.position.set(center,0,-3.43);else{door.position.set(-3.91,0,center);door.rotation.y=Math.PI/2}
    for(const x of [-.65,.65])box(.09,2.45,.12,'#f2dfc7',x,1.36,0,door);
    box(1.4,.09,.12,'#f2dfc7',0,2.63,0,door);box(1.38,.04,.35,'#e9d3b6',0,.20,0,door);
    box(1.2,.32,.06,'#fff2de',0,2.92,0,door);
    art(1.14,.27,0,2.92,.034,(ctx,W,H)=>{ctx.fillStyle='#fff2de';ctx.fillRect(0,0,W,H);ctx.fillStyle='#705773';ctx.font='bold 92px sans-serif';ctx.textAlign='center';ctx.fillText(label,W/2,290)},door);
    const target=mesh(new THREE.BoxGeometry(1.42,2.9,.18),new THREE.MeshBasicMaterial({visible:false}),0,1.55,.05,door);target.userData={id,room:group};hits.push(target);
  }
  doorway(livingRoom,livingBackWall,'x',-3.2,'#e8c7c8','庭院','focus-3');
  doorway(livingRoom,livingLeftWall,'z',.95,'#c0c9c3','4010','focus1');
  doorway(rooms[2],rooms[2].getObjectByName('room-left-wall'),'z',2.25,themes[2].side,'Joey','focus2');
  doorway(rooms[0],rooms[0].getObjectByName('room-back-wall'),'x',-.8,themes[0].wall,'Piggy','focus0');
  // 移除门口横跨的踢脚线，保留两边。
  const trim=rooms[0].children.find(o=>o.isMesh&&Math.abs(o.position.z+3.42)<.001&&o.position.y===.28&&o.geometry.parameters?.width>5);
  if(trim){rooms[0].remove(trim);for(const [x,w] of [[-3.725,4.65],[1.975,4.35]])box(w,.14,.1,'#f4e6d2',x,.28,-3.42,rooms[0]);}
  // 每间房自己的床头灯，不再移动同一盏灯来模拟切换。
  lampLight.position.add(livingRoom.position);const homeLights=[lampLight];
  rooms.forEach(room=>{const light=new THREE.PointLight('#ffbf7b',0,8,1.6);light.position.copy(room.position).add(new THREE.Vector3(3.48,1.4,-2.72));scene.add(light);homeLights.push(light)});
  livingHotDefs.forEach(h=>h.root=h.id==='cat-pet'?cat:h.id==='dog-pet'?dog:livingRoom);roomHotDefs.forEach((defs,i)=>defs.forEach(h=>h.root=rooms[i]));
  // 北侧庭院经客厅门洞相接，草坪保持与室内相同地面高度。
  const garden=new THREE.Object3D();garden.name='garden';garden.position.set(-1,0,4.65);garden.rotation.y=Math.PI;scene.add(garden);
  box(8,.48,8,'#a7a287',0,-.16,12.3,garden);
  box(8,.12,8,'#91ad88',0,.12,12.3,garden).name='floor-garden';
  for(let i=0;i<7;i++)round(1.3,.025,.7,i%2?'#d7c9b3':'#cabcaa',0,.205,8.8+i,.10,garden);
  for(const x of [-3.85,3.85]){box(.09,.12,8,'#ccb79b',x,.55,12.3,garden);for(let i=0;i<9;i++)box(.12,.75,.12,'#e1ccae',x,.56,8.5+i*.94,garden)}
  box(7.8,.12,.09,'#ccb79b',0,.55,16.15,garden);for(let i=0;i<11;i++)box(.12,.75,.12,'#e1ccae',-3.7+i*.74,.56,16.15,garden);
  const gardenCrops=[],gardenHotDefs=[];
  for(let room=0;room<3;room++){
    const x=(room-1)*2.7;
    round(1.5,.4,1.6,'#ac8061',x,.4,13.65,.07,garden);box(1.3,.035,1.4,'#675143',x,.61,13.65,garden);
    art(1.05,.3,x,.65,14.48,ctx=>{ctx.fillStyle='#f6ebd5';ctx.fillRect(0,0,512,512);ctx.fillStyle='#6c5849';ctx.font='bold 110px sans-serif';ctx.textAlign='center';ctx.fillText(['Piggy','4010','Joey'][room],256,300)},garden);
    for(let slot=0;slot<3;slot++){const crop=new THREE.Group();crop.name='garden-plants';crop.position.set(x+(slot-1)*.43,.63,13.65);garden.add(crop);gardenCrops.push({room,slot,crop,key:null})}
    const m=new THREE.Mesh(new THREE.BoxGeometry(1.5,1.6,1.6),new THREE.MeshBasicMaterial({visible:false}));m.position.set(x,1,13.65);m.userData={id:'garden'+room,room:garden};garden.add(m);hits.push(m);
    gardenHotDefs.push({id:'garden'+room,text:['Piggy','4010','Joey'][room]+'的花圃',root:garden,p:new THREE.Vector3(x,2.4,13.65)});
  }
  for(const x of [-3.3,3.3]){cylinder(.07,.07,1.7,'#8c7966',x,1.06,10.2,garden);const bulb=ball(.16,'#ffe5b4',x,1.98,10.2,garden);bulb.material.emissive.set('#ffcc87');bulb.material.emissiveIntensity=.9;const light=new THREE.PointLight('#ffd49d',0,7,1.7);light.position.set(x,2,10.2);garden.add(light);decorLights.push(light)}
  round(1.8,.18,.65,'#bc9a77',-2.4,.63,10.5,.06,garden);box(1.8,.65,.10,'#c9ad8d',-2.4,1.02,10.2,garden);for(const x of [-3,-1.8])for(const z of [10.28,10.7])box(.09,.42,.09,'#8d775f',x,.39,z,garden);
  function setGardenPlants(plants){
    for(const frame of gardenCrops){const plant=plants.find(p=>p.room_id===frame.room&&p.slot===frame.slot),stage=plant?.stage??-1,key=(plant?.species??'empty')+stage;if(frame.key===key)continue;frame.key=key;
      frame.crop.traverse(o=>{if(o.isMesh){o.geometry.dispose()}});frame.crop.clear();if(stage<0)continue;
      const seed=ball(.05,'#c4a17b',0,.035,0,frame.crop);if(stage===0)continue;seed.visible=false;
      const height=[0,.22,.55,.95][stage];cylinder(.025,.035,height,'#658b61',0,height/2,0,frame.crop);
      for(let i=0;i<(stage===1?2:stage===2?4:6);i++){const side=i%2?1:-1,leaf=ball(.105,plant.species==='mint'?'#87b997':'#7da26d',side*.09,.13+i*.10,0,frame.crop);leaf.scale.set(1.5,.4,.7);leaf.rotation.z=side*.45}
      if(stage===3&&plant.species==='sunflower'){ball(.12,'#72583b',0,height,0,frame.crop);for(let i=0;i<10;i++){const a=i*Math.PI/5,petal=ball(.10,'#ecc45c',Math.cos(a)*.19,height+Math.sin(a)*.19,.015,frame.crop);petal.scale.z=.4}}
      if(stage===3&&plant.species==='hydrangea')for(let i=0;i<13;i++){const a=i*2.4;ball(.09,i%2?'#a78aca':'#c4addf',Math.cos(a)*.17,height+Math.sin(i)*.1,Math.sin(a)*.17,frame.crop)}
      if(stage===3&&plant.species==='mint')for(let i=0;i<5;i++)ball(.035,'#d5c5e1',0,height+i*.05,0,frame.crop);
    }
  }
  const overviewHotDefs=[{id:'focus-3',text:'我们的庭院',root:garden,p:new THREE.Vector3(0,3,11.8)},{id:'focus-1',text:'我们的客厅',root:livingRoom,p:new THREE.Vector3(0,4.5,0)},...rooms.map((root,i)=>({id:'focus'+i,text:['Piggy','4010','Joey'][i]+'的房间',root,p:new THREE.Vector3(0,4.5,0)}))];
  hotDefs=overviewHotDefs;mountHotspots();scene.updateMatrixWorld(true);

  house=livingRoom;

  let walker=null,navigator=null,catNavigator=null,walkPath=[],lastFrameTime=null,lastWalking=false;
  const walkInput=new THREE.Vector2();
  const walkRing=new THREE.Mesh(new THREE.RingGeometry(.33,.40,28),new THREE.MeshBasicMaterial({color:'#b28acc',transparent:true,opacity:.8,depthWrite:false}));
  const destination=new THREE.Mesh(new THREE.RingGeometry(.13,.20,24),new THREE.MeshBasicMaterial({color:'#796195',transparent:true,opacity:.7,depthWrite:false}));
  for(const marker of [walkRing,destination]){marker.rotation.x=-Math.PI/2;marker.position.y=.285;marker.visible=false;scene.add(marker)}
  let floorMeshes=[];
  function prepareNavigation(){
    if(navigator)return;
    scene.updateMatrixWorld(true);const floors=[],obstacles=[],catObstacles=[];
    scene.traverse(object=>{
      if(!object.isMesh)return;
      if(object.name.startsWith('floor-')){
        const b=new THREE.Box3().setFromObject(object);floorMeshes.push(object);
        floors.push({minX:b.min.x,maxX:b.max.x,minZ:b.min.z,maxZ:b.max.z,room:object.name==='floor-garden'?-3:object.name.startsWith('floor-room-')?Number(object.name[11]):-1});return;
      }
      if(object.material.visible===false)return;
      for(let parent=object;parent;parent=parent.parent)if(!parent.visible||parent.name.startsWith('resident-')||parent.name==='home-cat'||parent.name==='home-dog'||parent.name==='garden-plants')return;
      const b=new THREE.Box3().setFromObject(object);if(b.isEmpty()||b.max.y<.35||b.min.y>1.55)return;
      const obstacle={minX:b.min.x,maxX:b.max.x,minZ:b.min.z,maxZ:b.max.z};obstacles.push(obstacle);
      let inBed=false;for(let parent=object;parent;parent=parent.parent)if(parent.name==='cat-bed'||parent.name==='dog-bed')inBed=true;
      if(!inBed)catObstacles.push(obstacle);
    });
    navigator=createNavigator(floors,obstacles);
    catNavigator=createNavigator(floors,catObstacles,{radius:.43,step:.25});
  }
  let catMode='sleep',catTimer=12,catPath=[],catFollow=0,catRepath=0,catReady=false,catPetCooldown=0;
  function catRoute(point){const path=catNavigator.findPath(cat.position,point);catPath=path??[];return Boolean(path?.length)}
  function petCat(){
    if(catPetCooldown>0)return false;
    prepareNavigation();catMode='pet';catTimer=2.8;catPath=[];catPetCooldown=1.2;
    heart.visible=true;onOpen('cat-pet');return true;
  }
  function updateCat(time,dt){
    prepareNavigation();
    if(!catReady){const p=catNavigator.canStand(cat.position)?cat.position:catNavigator.nearest(cat.position);if(p){cat.position.x=p.x;cat.position.z=p.z}catReady=true}
    catTimer-=dt;catPetCooldown=Math.max(0,catPetCooldown-dt);catRepath-=dt;
    if(catMode==='pet'&&catTimer<=0){heart.visible=false;catFollow=walker?18:0;catMode=walker?'follow':'idle';catTimer=4}
    if(catMode!=='pet'){
      if(walker&&lastWalking&&catMode!=='follow'&&catMode!=='sleep'&&cat.position.distanceTo(walker.actor.position)<2.5){catMode='follow';catFollow=18}
      if(catMode==='follow'){
        catFollow-=dt;
        if(!walker||catFollow<=0){catMode='idle';catTimer=4;catPath=[]}
        else if(catRepath<=0){catRepath=.8;const p=walker.actor.position;if(Math.hypot(p.x-cat.position.x,p.z-cat.position.z)>1.1)catRoute(p);else catPath=[]}
      }else if(catTimer<=0&&!catPath.length){
        if(catMode==='return'){catMode='sleep';catTimer=night?35:14}
        else if(catMode==='sleep'){catMode='idle';catTimer=4}
        else if(night||Math.random()<.35){catMode='return';if(!catRoute(bed.position)){catMode='idle';catTimer=6}}
        else{catMode='roam';catTimer=6;const targets=[{x:0,z:4.7},{x:-1.45,z:4.3},{x:1.1,z:3.8},{x:-3.2,z:-.5}];catRoute(targets[Math.floor(Math.random()*targets.length)])}
      }
    }
    let moving=false;
    if(catPath.length&&catMode!=='pet'){
      const target=catPath[0],x=target.x-cat.position.x,z=target.z-cat.position.z,d=Math.hypot(x,z);
      if(d<.01){cat.position.x=target.x;cat.position.z=target.z;catPath.shift()}
      else{const step=Math.min(d,dt*1.25),next=catNavigator.move(cat.position,x/d*step,z/d*step);moving=Math.hypot(next.x-cat.position.x,next.z-cat.position.z)>.0001;cat.position.x=next.x;cat.position.z=next.z;if(moving)cat.rotation.y=Math.atan2(-z,x);else{catPath=[];catTimer=2}}
    }
    const sleep=catMode==='sleep';cat.position.y=.22;body.scale.y=sleep?.65:.85;
    catEyes.forEach(eye=>eye.scale.y=sleep?.16:1);
    catHead.rotation.z=catMode==='pet'?-.25:sleep?.12:0;
    catFeet.forEach((foot,i)=>foot.position.y=.06+(moving&&!reduced?Math.sin(time*.014+i*Math.PI)*.025:0));
    tail.rotation.z=!reduced&&!sleep?Math.sin(time*.003)*.18:0;
    if(!reduced){body.scale.z=.9+Math.sin(time*.002)*.025;if(catMode==='pet')heart.position.y=.95+Math.sin(time*.005)*.04}
    heart.quaternion.copy(cat.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(camera.quaternion));
  }
  let dogMode='rest',dogTimer=10,dogPath=[],dogReady=false,dogPetCooldown=0;
  function petDog(){if(dogPetCooldown>0)return false;dogMode='pet';dogTimer=3;dogPath=[];dogPetCooldown=1;onOpen('dog-pet');return true}
  function updateDog(time,dt){
    if(!dogReady){const p=catNavigator.canStand(dog.position)?dog.position:catNavigator.nearest(dog.position);if(p){dog.position.x=p.x;dog.position.z=p.z}dogReady=true}
    dogTimer-=dt;dogPetCooldown=Math.max(0,dogPetCooldown-dt);
    if(dogTimer<=0&&!dogPath.length){
      if(dogMode==='return'){dogMode='rest';dogTimer=night?24:10}
      else if(dogMode==='rest'||dogMode==='pet'){dogMode='idle';dogTimer=4}
      else{const returning=dogMode==='roam'||(night&&Math.random()<.65);dogMode=returning?'return':'roam';dogTimer=5;
        const targets=[{x:0,z:4.7},{x:1.1,z:3.8},{x:-.75,z:5.5}];dogPath=catNavigator.findPath(dog.position,returning?dogBed.position:targets[Math.floor(Math.random()*targets.length)])??[];
        if(!dogPath.length){dogMode='idle';dogTimer=5}
      }
    }
    let moving=false;
    if(dogPath.length){const p=dogPath[0],x=p.x-dog.position.x,z=p.z-dog.position.z,d=Math.hypot(x,z);
      if(d<.01){dog.position.x=p.x;dog.position.z=p.z;dogPath.shift()}
      else{const step=Math.min(d,dt*1.1),next=catNavigator.move(dog.position,x/d*step,z/d*step);moving=Math.hypot(next.x-dog.position.x,next.z-dog.position.z)>.0001;dog.position.x=next.x;dog.position.z=next.z;if(moving)dog.rotation.y=Math.atan2(-z,x);else{dogPath=[];dogMode='idle';dogTimer=4}}
    }
    const rest=dogMode==='rest';dogBody.scale.y=rest?.65:.85;dogEyes.forEach(eye=>eye.scale.y=rest?.2:1);dogHead.rotation.z=dogMode==='pet'?-.2:rest?.12:0;
    dogFeet.forEach((foot,i)=>foot.position.y=.065+(moving&&!reduced?Math.sin(time*.013+i*Math.PI)*.025:0));
    dogTail.rotation.y=!reduced&&!rest?Math.sin(time*(dogMode==='pet'?.018:.006))*(dogMode==='pet'?.7:.25):0;
  }
  function walkState(){return {active:Boolean(walker),room:walker?navigator.roomAt(walker.actor.position):-1,moving:lastWalking}}
  function cancelWalk(){walkPath=[];walkInput.set(0,0);destination.visible=false;lastWalking=false;if(walker)onWalkState(walkState())}
  function stopWalking(){
    if(walker){walker.source.visible=true;scene.remove(walker.actor);walker.ownedGeometry.forEach(geometry=>geometry.dispose());walker=null}
    cancelWalk();walkRing.visible=false;onWalkState(walkState());
  }
  function startWalking(index){
    if(![0,1,2].includes(index))return false;
    stopWalking();prepareNavigation();
    const spawn=[[-.9,3.7],[1.1,2.8],[-1.2,2.3]][index];
    const point=navigator.nearest({x:spawn[0]+rooms[index].position.x,z:spawn[1]+rooms[index].position.z});if(!point)return false;
    const source=avatars[index],actor=source.clone(true),ownedGeometry=[];actor.name='walking-resident';
    for(const name of ['piggy-controller','resident-record-sleeve']){const prop=actor.getObjectByName(name);if(prop)prop.parent.remove(prop)}
    for(const side of ['left','right']){
      const x=side==='left'?-.13:.13,leg=actor.getObjectByName(side+'-leg'),shoe=actor.getObjectByName(side+'-shoe');
      leg.geometry=new THREE.BoxGeometry(index===2?.20:.14,.48,.20);ownedGeometry.push(leg.geometry);leg.position.set(x,-.08,.02);leg.rotation.set(0,0,0);shoe.position.set(x,-.36,.10);shoe.rotation.set(0,0,0);
      const arm=actor.getObjectByName(side+'-arm'),hand=actor.getObjectByName(side+'-hand'),sign=side==='left'?-1:1;
      arm.position.set(sign*(index===0?.28:.25),.27,.03);arm.rotation.set(0,0,sign*.18);hand.position.set(sign*.29,.1,.06);
    }
    actor.position.set(point.x,.63,point.z);actor.rotation.set(0,Math.PI,0);source.visible=false;scene.add(actor);
    walker={source,actor,ownedGeometry,index,room:navigator.roomAt(point)};walkRing.visible=true;walkRing.position.set(point.x,.285,point.z);onWalkState(walkState());return true;
  }
  function walkTo(point){
    if(!walker)return false;const path=navigator.findPath(walker.actor.position,point);if(!path?.length)return false;
    walkPath=path;walkInput.set(0,0);const last=path.at(-1);destination.position.set(last.x,.285,last.z);destination.visible=true;return true;
  }
  function updateWalking(time,dt){
    if(!walker)return;const actor=walker.actor,start=actor.position.clone();let dx=0,dz=0;
    if(walkInput.lengthSq()>0){
      const forward=camera.position.clone().sub(controls.target);forward.y=0;forward.normalize();const right=new THREE.Vector3(forward.z,0,-forward.x);
      const direction=right.multiplyScalar(walkInput.x).addScaledVector(forward,walkInput.y).normalize();dx=direction.x*dt*2.6;dz=direction.z*dt*2.6;
    }else if(walkPath.length){
      const target=walkPath[0],x=target.x-actor.position.x,z=target.z-actor.position.z,d=Math.hypot(x,z);
      if(d<.01){actor.position.x=target.x;actor.position.z=target.z;walkPath.shift()}else{const distance=Math.min(d,dt*2.6);dx=x/d*distance;dz=z/d*distance}
    }
    const next=navigator.move(actor.position,dx,dz);actor.position.x=next.x;actor.position.z=next.z;
    const moving=Math.hypot(next.x-start.x,next.z-start.z)>.001;
    if(moving)actor.rotation.y=Math.atan2(next.x-start.x,next.z-start.z);
    else if((dx||dz)&&walkPath.length)walkPath=[];
    if(!walkPath.length)destination.visible=false;
    const swing=moving&&!reduced?Math.sin(time*.012)*.28:0;actor.position.y=.63+(moving&&!reduced?Math.abs(Math.sin(time*.012))*.015:0);
    for(const side of ['left','right']){const sign=side==='left'?1:-1;actor.getObjectByName(side+'-leg').rotation.x=swing*sign;actor.getObjectByName(side+'-shoe').position.z=.10+swing*sign*.15;actor.getObjectByName(side+'-arm').rotation.x=-swing*sign}
    walkRing.position.set(next.x,.285,next.z);
    const room=navigator.roomAt(next);if(room!==walker.room||moving!==lastWalking){walker.room=room;lastWalking=moving;onWalkState(walkState())}
  }
  const decoration=createDecorationSystem({rooms,scene,box,ball,cylinder,round,stopWalking,invalidate(){navigator=null;catNavigator=null;floorMeshes=[];walkPath=[];catPath=[];dogPath=[];}});
  const decorPreviewCache=new Map();
  // 复用主场景的模型与渲染器生成缩略图，不额外创建 WebGL 上下文。
  function getDecorPreviews(color){
    if(decorPreviewCache.has(color))return decorPreviewCache.get(color);
    const result={},size=192,target=new THREE.WebGLRenderTarget(size,size),previous=renderer.getRenderTarget();
    target.texture.colorSpace=THREE.SRGBColorSpace;
    const previewScene=new THREE.Scene();previewScene.background=new THREE.Color('#eee5dc');
    previewScene.add(new THREE.HemisphereLight('#fff7e9','#a497b4',3));const light=new THREE.DirectionalLight('#fff3dc',3);light.position.set(3,5,4);previewScene.add(light);
    const previewCamera=new THREE.PerspectiveCamera(35,1,.01,20);
    try{for(const type of ['plant','lamp','stool','table','cushion','rug']){
      const model=decoration.createPreviewModel({id:'preview',type,color,rotation:0});previewScene.add(model);
      const bounds=new THREE.Box3().setFromObject(model),center=bounds.getCenter(new THREE.Vector3()),extent=bounds.getSize(new THREE.Vector3());
      const distance=Math.max(extent.x,extent.y,extent.z,.6)*2.5;previewCamera.position.copy(center).add(new THREE.Vector3(1,1.1,1.5).normalize().multiplyScalar(distance));previewCamera.lookAt(center);
      renderer.setRenderTarget(target);renderer.render(previewScene,previewCamera);
      const pixels=new Uint8Array(size*size*4);renderer.readRenderTargetPixels(target,0,0,size,size,pixels);
      const canvas=document.createElement('canvas');canvas.width=canvas.height=size;const ctx=canvas.getContext('2d'),data=ctx.createImageData(size,size);
      for(let y=0;y<size;y++)data.data.set(pixels.subarray((size-1-y)*size*4,(size-y)*size*4),y*size*4);
      ctx.putImageData(data,0,0);result[type]=canvas.toDataURL('image/png');previewScene.remove(model);model.traverse(o=>{if(o.isMesh)o.geometry.dispose()});
    }}finally{renderer.setRenderTarget(previous);target.dispose()}
    decorPreviewCache.set(color,result);return result;
  }
  const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();let down=null,multiGesture=false;const activePointers=new Set();
  renderer.domElement.addEventListener('pointerdown',e=>{activePointers.add(e.pointerId);if(activePointers.size>1){multiGesture=true;down=null}else if(!multiGesture)down={id:e.pointerId,x:e.clientX,y:e.clientY,t:performance.now()}});
  renderer.domElement.addEventListener('pointerup',e=>{
    activePointers.delete(e.pointerId);const tap=down;down=null;const valid=!multiGesture&&tap?.id===e.pointerId;if(!activePointers.size)multiGesture=false;
    if(!valid||Math.hypot(e.clientX-tap.x,e.clientY-tap.y)>8||performance.now()-tap.t>650)return;
    const r=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);if(decoration.tap(ray))return;
    const h=ray.intersectObjects(hits.filter(m=>m.userData.room.visible&&(!walker||m.userData.id!=='room'+walker.index)))[0];
    if(h?.object===catHit)petCat();else if(h?.object===dogHit)petDog();else if(h)onOpen(h.object.userData.id);else if(walker){const floor=ray.intersectObjects(floorMeshes)[0];if(floor&&!walkTo(floor.point))onWalkState({...walkState(),blocked:true})}
  });
  renderer.domElement.addEventListener('pointercancel',e=>{activePointers.delete(e.pointerId);down=null;if(!activePointers.size)multiGesture=false});
  let night=false,lit=false,tween=null,currentView=-2;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  function viewFor(index){
    const bounds=new THREE.Box3();
    if(index===-2){[livingRoom,...rooms,building,garden].forEach(root=>bounds.union(new THREE.Box3().setFromObject(root)))}
    else{bounds.setFromObject(index===-3?garden:index===-1?livingRoom:rooms[index]);if(index===-1)bounds.union(new THREE.Box3().setFromObject(building.getObjectByName('floor-entry')))}
    const target=bounds.getCenter(new THREE.Vector3());
    const direction=(index===-2?new THREE.Vector3(1,1.8,1.75):new THREE.Vector3(7,9,12)).normalize();
    const right=new THREE.Vector3(direction.z,0,-direction.x).normalize(),up=new THREE.Vector3().crossVectors(direction,right).normalize();
    const tangent=Math.tan(THREE.MathUtils.degToRad(camera.fov/2)),padding=index===-2?.83:.88;let distance=12;
    for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
      const v=new THREE.Vector3(x,y,z).sub(target),depth=v.dot(direction);
      distance=Math.max(distance,depth+Math.abs(v.dot(right))/(tangent*camera.aspect*padding),depth+Math.abs(v.dot(up))/(tangent*padding));
    }
    return {target,position:target.clone().addScaledVector(direction,distance)};
  }
  function resize(){const w=stage.clientWidth,h=stage.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();const view=viewFor(currentView);camera.position.copy(view.position);controls.target.copy(view.target);tween=null;controls.update()}
  new ResizeObserver(resize).observe(stage);resize();
  controls.addEventListener('start',()=>{tween=null});
  function frame(time){
    requestAnimationFrame(frame);
    const dt=lastFrameTime===null?0:Math.min(.05,Math.max(0,(time-lastFrameTime)/1000));lastFrameTime=time;if(!decoration.editing){updateWalking(time,dt);updateCat(time,dt);updateDog(time,dt);}
    if(tween){const p=Math.min((time-tween.start)/tween.duration,1),s=1-Math.pow(1-p,3);camera.position.lerpVectors(tween.from,tween.to,s);controls.target.lerpVectors(tween.targetFrom,tween.targetTo,s);if(p===1)tween=null}
    if(!reduced&&!decoration.editing){
      const seconds=time*.001;
      residentPoses.forEach(({resident,room,position,rotation})=>{
        if(walker?.source===resident)return;
        // 只在当前房间或全景播放轻微日常动作，保留稳定的点击位置。
        const moving=currentView===-2||currentView===room;
        resident.position.y=position.y+(moving?Math.sin(seconds*(room===0?2.8:1.4)+room)*.012:0);
        resident.rotation.y=rotation+(moving?Math.sin(seconds*(room===2?.8:1.1)+room)*.045:0);
        if(room===0){const hand=resident.getObjectByName('right-hand');hand.position.y=.24+(moving?Math.sin(seconds*6)*.018:0)}
        if(room===2){const hand=resident.getObjectByName('right-hand');hand.position.y=.40+(moving?Math.sin(seconds*1.7)*.055:0)}
      });
      animatedProps.forEach(({kind,mesh})=>{if(kind==='vinyl')mesh.rotation.y=seconds*1.7;else mesh.material.emissiveIntensity=.55+Math.sin(seconds*2)*.20});
    }
    controls.update();renderer.render(scene,camera);
    hotDefs.forEach(h=>{const point=h.root.localToWorld(h.p.clone()),p=point.project(camera);h.el.style.left=((p.x*.5+.5)*stage.clientWidth)+'px';h.el.style.top=((-p.y*.5+.5)*stage.clientHeight)+'px';const visible=p.z<1&&Math.abs(p.x)<.96&&Math.abs(p.y)<.96;h.el.style.opacity=Number(visible);h.el.style.pointerEvents=visible?'auto':'none'});
  }
  requestAnimationFrame(frame);
  function move(to,target){
    if(reduced){camera.position.copy(to);controls.target.copy(target);controls.update()}
    else tween={from:camera.position.clone(),to,targetFrom:controls.target.clone(),targetTo:target.clone(),start:performance.now(),duration:900};
  }
  async function updatePhotoFrame(frame,src){
    if(!frame)throw new Error('相框不存在');
    const revision=++frame.revision;
    if(!src){frame.placeholder();return}
    // 版本号避免快速替换图片时旧图片覆盖新图片。
    const img=new Image();
    // 签名图片来自 Supabase，必须先启用 CORS，否则 Canvas 无法用于 WebGL。
    img.crossOrigin='anonymous';
    await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(new Error('图片读取失败'));img.src=src});
    if(frame.revision!==revision)return;
    // 重置画布，清除旧贴图和曾被跨域图片污染的画布状态。
    const canvas=frame.photo.material.map.image;canvas.width=512;canvas.height=512;
    const side=Math.min(img.width,img.height);
    try{
      frame.ctx.drawImage(img,(img.width-side)/2,(img.height-side)/2,side,side,0,0,512,512);
      // 在渲染前验证画布可读取，让错误进入加载重试而不是中断整帧渲染。
      frame.ctx.getImageData(0,0,1,1);
    }catch(error){
      canvas.width=512;canvas.height=512;frame.placeholder();throw error;
    }
    frame.photo.material.map.needsUpdate=true;
  }
  return {getDecorPreviews,setDecorRoom:decoration.setRoom,setDecorationEditor:decoration.setEditor,canPlaceDecor:decoration.canPlace,setGardenPlants,petDog,getDogState:()=>({mode:dogMode,position:dog.position.clone()}),petCat,getCatState:()=>({mode:catMode,position:cat.position.clone()}),startWalking,stopWalking,walkTo,cancelWalk,getWalkState:walkState,setWalkInput(x,y){if(!walker)return;walkInput.set(x,y);walkPath=[];destination.visible=false},setRoomPhoto(room,slot,src){return updatePhotoFrame(roomFrames[room]?.[slot],src)},setLivingPhoto(slot,src){return updatePhotoFrame(livingFrames[slot],src)},setRoom(index){
    if(![-3,-2,-1,0,1,2].includes(index))return;
    currentView=index;hotDefs=index===-3?gardenHotDefs:index===-2?overviewHotDefs:index===-1?livingHotDefs:roomHotDefs[index];mountHotspots();down=null;
    const view=viewFor(index);move(view.position,view.target);
  },setNight(value){night=value;ambient.intensity=night?.9:2.7;sun.intensity=night?.55:4.3;fill.intensity=night?1.7:1.5;fill.color.set(night?'#9783ef':'#bfb8ed');renderer.toneMappingExposure=night?1.1:1.35;homeLights.forEach(light=>light.intensity=night||lit?6:0);decorLights.forEach(light=>light.intensity=night?1.6:.35);lampMat.emissiveIntensity=night||lit?1:.35;sky.material.color.set(night?'#9d90c4':'#ffffff')},setLamp(value){lit=value;homeLights.forEach(light=>light.intensity=night||lit?6:0);decorLights.forEach(light=>light.intensity=night?1.6:.35);lampMat.emissiveIntensity=night||lit?1:.35},zoom(factor){const delta=camera.position.clone().sub(controls.target);delta.setLength(THREE.MathUtils.clamp(delta.length()*factor,9,85));move(controls.target.clone().add(delta),controls.target.clone())},reset(){currentView=-2;hotDefs=overviewHotDefs;mountHotspots();const view=viewFor(-2);move(view.position,view.target)},renderer};
}
