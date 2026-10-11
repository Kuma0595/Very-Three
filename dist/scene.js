import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';

// 所有模型由几何体原创搭建，不依赖外部模型或网络资源。
export function createHome(stage, onOpen) {
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
  
  box(8.3,.12,7.3,'#d5b595',0,.12,0).name='floor-living';
  for(let j=0;j<18;j++){const z=-3.35+j*.39;box(8,.015,.012,'#ba977a',0,.19,z);for(let i=0;i<4;i++)box(.012,.015,.38,'#ba977a',-3.5+i*2+(j%2)*.8,.19,z+.19)}
  const livingBackWall=box(8.25,3.9,.18,'#e8c7c8',0,2.08,-3.56);
  const livingLeftWall=box(.18,3.9,7.3,'#c0c9c3',-4.05,2.08,0);
  // 门洞位置不铺踢脚线，避免形成横跨入口的矮栏。
  box(6.75,.15,.1,'#f5e8d9',.7,.28,-3.42);box(.1,.15,3.9,'#f5e8d9',-3.92,.28,-1.6);box(.1,.15,2.05,'#f5e8d9',-3.92,.28,2.625);
  box(8.4,.15,.25,'#c699a3',0,4.07,-3.56);box(.25,.15,7.3,'#a0afa7',-4.05,4.07,0);
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
    cylinder(.075,.08,.36,skin,style===0?-.37:-.29,.27,.03,g).rotation.z=-.18;cylinder(.075,.08,.36,skin,style===0?.37:.29,.27,.03,g).rotation.z=.18;
    ball(.08,skin,style===0?-.40:-.32,.1,.06,g);ball(.08,skin,style===0?.40:.32,.1,.06,g);
    for(const px of [-.13,.13]){const leg=round(style===2?.20:.14,.13,.48,style===2?'#454351':'#657087',px,.04,.25,.03,g);round(.17,.14,.25,'#f4e6d9',px,-.02,.50,.035,g)}
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
  const album=new THREE.Group();album.position.set(-3.91,2.4,2.65);album.rotation.y=Math.PI/2;house.add(album);
  box(1.6,1.4,.08,'#b08769',0,0,0,album);
  for(let i=0;i<3;i++){const frame=new THREE.Group();frame.position.set((i-1)*.46,i===1?.25:-.13,.075);frame.rotation.z=[.12,-.09,.1][i];album.add(frame);box(.44,.58,.028,'#fff7e6',0,0,0,frame);art(.36,.38,0,.045,.018,(ctx,w,h)=>{ctx.fillStyle=['#b2c8c5','#d0b8d2','#edc6a8'][i];ctx.fillRect(0,0,w,h);ctx.fillStyle='#fff1cb';ctx.beginPath();ctx.arc(370,130,55,0,7);ctx.fill();ctx.fillStyle=['#6f968d','#a282ae','#c38d71'][i];ctx.beginPath();ctx.moveTo(0,h);ctx.lineTo(0,390);ctx.quadraticCurveTo(200,200,320,410);ctx.lineTo(w,320);ctx.lineTo(w,h);ctx.fill()},frame)}
  // 矮柜、唱片、书与小植物。
  round(1.25,1.0,1.1,'#deb48e',-3.23,.73,2.35,.06);
  for(const x of [-3.52,-2.93])round(.5,.7,.08,'#eac49e',x,.75,2.94,.025);
  for(const x of [-3.50,-2.94])ball(.045,'#a57a59',x,.9,3.01);
  cylinder(.3,.3,.05,'#504653',-3.23,1.30,2.32);cylinder(.09,.09,.057,'#dca1b1',-3.23,1.308,2.32);
  for(let i=0;i<3;i++)box(.45,.055,.6,palette[i+2],-2.99,1.3+i*.06,2.7);
  function plant(x,y,z,size=1){const g=new THREE.Group();g.position.set(x,y,z);g.scale.setScalar(size);house.add(g);cylinder(.22,.16,.35,'#ddab8b',0,.175,0,g);cylinder(.19,.19,.015,'#685345',0,.36,0,g);cylinder(.025,.025,.75,'#6a977b',0,.69,0,g);for(let i=0;i<7;i++){const a=i*2.4;const leaf=ball(.16,i%2?'#91b29a':'#6f9a81',Math.cos(a)*.19,.49+i*.08,Math.sin(a)*.19,g);leaf.scale.set(.7,1.65,.65);leaf.rotation.z=Math.cos(a)*.8}return g}
  plant(-2.4,.21,.32,1.4);plant(2.3,.21,2.8,1.7);plant(3.57,1.55,-2.71,.52);
  // 落地灯与窗边的小猫。
  cylinder(.32,.32,.07,'#937b69',-2.72,.25,-2.08);cylinder(.035,.035,2.30,'#a58a70',-2.72,1.38,-2.08);
  const lampMat=new THREE.MeshStandardMaterial({color:'#ffe4a7',emissive:'#ffcc80',emissiveIntensity:.35,roughness:.9});cylinder(.31,.54,.58,lampMat,-2.72,2.7,-2.08);
  const lampLight=new THREE.PointLight('#ffbf7b',0,8,1.6);lampLight.position.set(-2.72,2.4,-1.9);scene.add(lampLight);
  const cat=new THREE.Group();cat.position.set(-2.6,.22,1.75);cat.rotation.y=.6;house.add(cat);
  const body=ball(.24,'#ead4b4',0,.2,0,cat);body.scale.set(1.55,.85,.9);ball(.18,'#ead4b4',.26,.32,0,cat);for(const z of [-.10,.1]){const ear=mesh(new THREE.ConeGeometry(.065,.13,3),'#ead4b4',.27,.50,z,cat);ear.rotation.x=z>0?.2:-.2;ball(.018,'#6b5b58',.415,.34,z*.75,cat)}const tail=mesh(new THREE.TorusGeometry(.20,.055,8,16,Math.PI*1.2),'#e3c8a5',-.3,.22,-.10,cat);tail.rotation.x=Math.PI/2;
  // 不遮挡模型的底部软阴影。
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({opacity:.10}));ground.rotation.x=-Math.PI/2;ground.name='shadow-ground';ground.position.y=-.52;ground.receiveShadow=true;scene.add(ground);
  const livingHotDefs=[{id:'memories',text:'我们的回忆',p:new THREE.Vector3(-3.5,3.35,2.65)},{id:'notes',text:'留一句话',p:new THREE.Vector3(2.0,3.75,-3.0)},{id:'people',text:'我们仨',p:new THREE.Vector3(.0,2.40,-1.8)},{id:'plans',text:'下一次见面',p:new THREE.Vector3(.35,1.3,1.3)}];
  let hotDefs=livingHotDefs;const hotEl=stage.querySelector('#hotspots');function mountHotspots(){hotEl.replaceChildren();hotDefs.forEach(h=>{const b=document.createElement('button');b.className='hotspot';b.textContent=h.text;b.onclick=()=>onOpen(h.id);hotEl.append(b);h.el=b})}mountHotspots();
  // 点击真实物件也能打开面板；拖动时不误触。
  const hits=[];function hit(id,x,y,z,w,h,d){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshBasicMaterial({visible:false}));m.position.set(x,y,z);m.userData.id=id;m.userData.room=house;house.add(m);hits.push(m)}
  hit('people',0,1.7,-2.05,3.8,1.2,.9);hit('notes',1.85,2.85,-3.25,2,1.25,.2);hit('memories',-3.83,2.4,2.65,.3,1.4,1.7);hit('plans',0,.95,.65,2.5,.3,1.6);hit('lamp',-2.72,2.7,-2.08,1,.7,1);
  // 三间独立的个人空间，共用相机和灯光；一次只渲染当前房间。
  const rooms=[],roomHotDefs=[],roomFrames=[[],[],[]];
  const themes=[{wall:'#c4bac7',side:'#d5c8c2',base:'#807081',quilt:'#77677f',wood:'#b39987'},
    {wall:'#ddc7ae',side:'#c8ccbd',base:'#9c8770',quilt:'#b5aa87',wood:'#c8a681'},
    {wall:'#d5b6d5',side:'#babddd',base:'#a078b4',quilt:'#b18bc4',wood:'#d1b0c9'}];
  function poster(w,h,x,y,z,index){box(w+.10,h+.10,.06,'#f2e6d5',x,y,z);art(w,h,x,y,z+.04,(ctx,W,H)=>{ctx.fillStyle=['#514352','#e4ccaa','#785590'][index];ctx.fillRect(0,0,W,H);ctx.textAlign='center';ctx.fillStyle=['#f4d19a','#806147','#f6c0df'][index];ctx.font='bold 72px sans-serif';ctx.fillText(['ROCK / PLAY','VINYL DAYS','K-POP / MOOD'][index],W/2,130);ctx.font='170px sans-serif';ctx.fillText(['ϟ','◎','✦'][index],W/2,350)})}
  function smallDesk(x,z,color){for(const dx of [-.83,.83])for(const dz of [-.35,.35])box(.075,1.15,.075,'#927b67',x+dx,.79,z+dz);round(2.1,.14,1.05,color,x,1.41,z,.04)}
  function chair(x,z,color){cylinder(.30,.3,.10,'#8c8092',x,.33,z);cylinder(.05,.05,.53,'#8c8092',x,.6,z);round(.72,.15,.66,color,x,.91,z,.05);round(.72,.7,.15,color,x,1.31,z+.29,.05)}
  function screen(x,y,z,color,width=1.0){round(width,.68,.09,'#554c68',x,y,z,.04);art(width-.10,.56,x,y,z+.052,(ctx,W,H)=>{ctx.fillStyle=color;ctx.fillRect(0,0,W,H);ctx.fillStyle='#f8e7ff';for(let r=0;r<5;r++){ctx.fillRect(50,70+r*65,180+(r%2)*100,13)}ctx.fillStyle='#bfddcd';ctx.fillRect(360,60,90,330)});box(.07,.22,.08,'#75697f',x,y-.44,z);box(.44,.04,.25,'#75697f',x,y-.53,z)}
  for(let i=0;i<3;i++){
    const t=themes[i];house=new THREE.Group();house.name='personal-room-'+i;house.visible=true;scene.add(house);rooms.push(house);
    box(8.3,.12,7.3,t.wood,0,.12,0).name='floor-room-'+i;
    for(let j=0;j<18;j++){box(8,.012,.013,'#a99380',0,.19,-3.35+j*.39)}
    box(8.25,3.9,.18,t.wall,0,2.08,-3.56);const leftWall=box(.18,3.9,7.3,t.side,-4.05,2.08,0);leftWall.name='room-left-wall';
    box(8.2,.14,.1,'#f4e6d2',0,.28,-3.42);box(.1,.14,7.2,'#f4e6d2',-3.93,.28,0);
    box(8.4,.15,.25,t.base,0,4.07,-3.56);box(.25,.15,7.3,t.base,-4.05,4.07,0);
    const roomWindow=window.clone(true);roomWindow.position.z=.1;house.add(roomWindow);
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
    const resident=avatars[i];resident.position.set(2.30,1.15,-1.96);resident.rotation.y=-.2;house.add(resident);
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
      round(1.05,.12,.64,'#80634f',-1.55,1.40,-2.75,.035);cylinder(.25,.25,.035,'#38343a',-1.62,1.49,-2.75);cylinder(.072,.072,.038,'#c39b70',-1.62,1.492,-2.75);
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
    hit('room'+i,2.3,1.8,-1.96,.75,1.0,.7);
    roomHotDefs.push([{id:'room'+i,text:['Piggy · 摇滚与电玩','4010 · 黑胶聆听室','Joey · 亚文化与 K-pop'][i],p:new THREE.Vector3(2.3,2.2,-1.4)},{id:'frames'+i,text:'相框 · 上传照片',p:new THREE.Vector3(1.78,3.67,-3.10)},{id:'notes',text:'给家里留句话',p:new THREE.Vector3(.3,.95,1.75)}]);
  }
  // 客厅居中：北侧 Piggy、西侧 4010、东侧 Joey，南侧玄关。
  const layout=[new THREE.Vector3(0,0,-7.3),new THREE.Vector3(-8.3,0,0),new THREE.Vector3(8.3,0,0)];
  livingRoom.name='living-room';livingRoom.position.set(0,0,0);
  rooms.forEach((room,i)=>{room.position.copy(layout[i]);room.visible=true});
  const building=new THREE.Group();building.name='shared-foundation';scene.add(building);
  // 单一十字形地台；每个房间只有一层地板，避免共面引起深度闪烁。
  const outline=[[-4.15,-10.95],[4.15,-10.95],[4.15,-3.65],[12.45,-3.65],[12.45,3.65],[4.15,3.65],[2,3.65],[2,5.5],[-2,5.5],[-2,3.65],[-4.15,3.65],[-12.45,3.65],[-12.45,-3.65],[-4.15,-3.65]];
  const footprint=new THREE.Shape();outline.forEach(([x,z],i)=>i?footprint.lineTo(x,z):footprint.moveTo(x,z));footprint.closePath();
  const baseGeometry=new THREE.ExtrudeGeometry(footprint,{depth:.48,bevelEnabled:false,steps:1});baseGeometry.rotateX(Math.PI/2);
  mesh(baseGeometry,'#b89cbd',0,.08,0,building).name='foundation-slab';
  box(4,.12,1.85,'#d0b397',0,.12,4.575,building).name='floor-entry';
  round(1.4,.025,.75,'#88b8a0',0,.20,4.55,.02,building);
  art(1.2,.25,0,.215,4.5,(ctx,W,H)=>{ctx.fillStyle='#88b8a0';ctx.fillRect(0,0,W,H);ctx.fillStyle='#fff3df';ctx.font='bold 95px sans-serif';ctx.textAlign='center';ctx.fillText('WELCOME',W/2,300)},building).rotation.x=-Math.PI/2;
  // 内墙保留门洞，让房间通过同一片地板连起来。
  function doorway(group,wall,axis,center,color,label,id){
    group.remove(wall);const half=axis==='x'?4.125:3.65,width=1.2,opening=2.45;
    const leftEnd=center-width/2,rightStart=center+width/2;
    if(axis==='x'){
      box(leftEnd+half,3.9,.18,color,(-half+leftEnd)/2,2.08,-3.56,group);
      box(half-rightStart,3.9,.18,color,(rightStart+half)/2,2.08,-3.56,group);
      box(width,4.03-opening,.18,color,center,(4.03+opening)/2,-3.56,group);
    }else{
      box(.18,3.9,leftEnd+half,color,-4.05,2.08,(-half+leftEnd)/2,group);
      box(.18,3.9,half-rightStart,color,-4.05,2.08,(rightStart+half)/2,group);
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
  doorway(livingRoom,livingBackWall,'x',-3.2,'#e8c7c8','Piggy','focus0');
  doorway(livingRoom,livingLeftWall,'z',.95,'#c0c9c3','4010','focus1');
  doorway(rooms[2],rooms[2].getObjectByName('room-left-wall'),'z',2.25,themes[2].side,'Joey','focus2');
  // 每间房自己的床头灯，不再移动同一盏灯来模拟切换。
  lampLight.position.add(livingRoom.position);const homeLights=[lampLight];
  rooms.forEach(room=>{const light=new THREE.PointLight('#ffbf7b',0,8,1.6);light.position.copy(room.position).add(new THREE.Vector3(3.48,1.4,-2.72));scene.add(light);homeLights.push(light)});
  livingHotDefs.forEach(h=>h.root=livingRoom);roomHotDefs.forEach((defs,i)=>defs.forEach(h=>h.root=rooms[i]));
  const overviewHotDefs=[{id:'focus-1',text:'我们的客厅',root:livingRoom,p:new THREE.Vector3(0,4.5,0)},...rooms.map((root,i)=>({id:'focus'+i,text:['Piggy','4010','Joey'][i]+'的房间',root,p:new THREE.Vector3(0,4.5,0)}))];
  hotDefs=overviewHotDefs;mountHotspots();scene.updateMatrixWorld(true);

  house=livingRoom;

  const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();let down=null;
  renderer.domElement.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY,t:performance.now()}});
  renderer.domElement.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down.x,e.clientY-down.y)>8||performance.now()-down.t>650)return;const r=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);const h=ray.intersectObjects(hits.filter(m=>m.userData.room.visible))[0];if(h)onOpen(h.object.userData.id);down=null});
  renderer.domElement.addEventListener('pointercancel',()=>{down=null});
  let night=false,lit=false,tween=null,currentView=-2;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  function viewFor(index){
    const bounds=new THREE.Box3();
    if(index===-2){[livingRoom,...rooms,building].forEach(root=>bounds.union(new THREE.Box3().setFromObject(root)))}
    else bounds.setFromObject(index===-1?livingRoom:rooms[index]);
    const target=bounds.getCenter(new THREE.Vector3());
    const direction=(index===-2?new THREE.Vector3(1,1.8,1.75):new THREE.Vector3(9,12,14)).normalize();
    const right=new THREE.Vector3(direction.z,0,-direction.x).normalize(),up=new THREE.Vector3().crossVectors(direction,right).normalize();
    const tangent=Math.tan(THREE.MathUtils.degToRad(camera.fov/2));let distance=12;
    for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
      const v=new THREE.Vector3(x,y,z).sub(target),depth=v.dot(direction);
      distance=Math.max(distance,depth+Math.abs(v.dot(right))/(tangent*camera.aspect*.83),depth+Math.abs(v.dot(up))/(tangent*.83));
    }
    return {target,position:target.clone().addScaledVector(direction,distance)};
  }
  function resize(){const w=stage.clientWidth,h=stage.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();const view=viewFor(currentView);camera.position.copy(view.position);controls.target.copy(view.target);tween=null;controls.update()}
  new ResizeObserver(resize).observe(stage);resize();
  controls.addEventListener('start',()=>{tween=null});
  function frame(time){
    requestAnimationFrame(frame);
    if(tween){const p=Math.min((time-tween.start)/tween.duration,1),s=1-Math.pow(1-p,3);camera.position.lerpVectors(tween.from,tween.to,s);controls.target.lerpVectors(tween.targetFrom,tween.targetTo,s);if(p===1)tween=null}
    controls.update();renderer.render(scene,camera);
    hotDefs.forEach(h=>{const point=h.root.localToWorld(h.p.clone()),p=point.project(camera);h.el.style.left=((p.x*.5+.5)*stage.clientWidth)+'px';h.el.style.top=((-p.y*.5+.5)*stage.clientHeight)+'px';const visible=p.z<1&&Math.abs(p.x)<.96&&Math.abs(p.y)<.96;h.el.style.opacity=Number(visible);h.el.style.pointerEvents=visible?'auto':'none'});
  }
  requestAnimationFrame(frame);
  function move(to,target){
    if(reduced){camera.position.copy(to);controls.target.copy(target);controls.update()}
    else tween={from:camera.position.clone(),to,targetFrom:controls.target.clone(),targetTo:target.clone(),start:performance.now(),duration:900};
  }
  return {async setRoomPhoto(room,slot,src){
    const frame=roomFrames[room]?.[slot];if(!frame)throw new Error('相框不存在');
    const revision=++frame.revision;
    if(!src){frame.placeholder();return}
    // 版本号避免快速替换图片时旧图片覆盖新图片。
    const img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(new Error('图片读取失败'));img.src=src});
    if(frame.revision!==revision)return;
    const side=Math.min(img.width,img.height);frame.ctx.clearRect(0,0,512,512);
    frame.ctx.drawImage(img,(img.width-side)/2,(img.height-side)/2,side,side,0,0,512,512);
    frame.photo.material.map.needsUpdate=true;
  },setRoom(index){
    if(![-2,-1,0,1,2].includes(index))return;
    currentView=index;hotDefs=index===-2?overviewHotDefs:index===-1?livingHotDefs:roomHotDefs[index];mountHotspots();down=null;
    const view=viewFor(index);move(view.position,view.target);
  },setNight(value){night=value;ambient.intensity=night?.9:2.7;sun.intensity=night?.55:4.3;fill.intensity=night?1.7:1.5;fill.color.set(night?'#9783ef':'#bfb8ed');renderer.toneMappingExposure=night?1.1:1.35;homeLights.forEach(light=>light.intensity=night||lit?6:0);lampMat.emissiveIntensity=night||lit?1:.35;sky.material.color.set(night?'#9d90c4':'#ffffff')},setLamp(value){lit=value;homeLights.forEach(light=>light.intensity=night||lit?6:0);lampMat.emissiveIntensity=night||lit?1:.35},zoom(factor){const delta=camera.position.clone().sub(controls.target);delta.setLength(THREE.MathUtils.clamp(delta.length()*factor,9,85));move(controls.target.clone().add(delta),controls.target.clone())},reset(){currentView=-2;hotDefs=overviewHotDefs;mountHotspots();const view=viewFor(-2);move(view.position,view.target)},renderer};
}
