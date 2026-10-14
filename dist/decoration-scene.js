import * as THREE from './vendor/three.module.js';
import {createNavigator} from './navigation.js?v=2';
export const DECOR_ITEMS={
 plant:{name:'盆栽',w:.65,d:.65,page:0,desc:'陶盆与层叠叶片'},lamp:{name:'落地灯',w:.65,d:.65,page:0,desc:'有褶纹的暖光灯罩'},stool:{name:'小凳子',w:.7,d:.7,page:0,desc:'木腿与横撑的小凳'},table:{name:'边桌',w:.85,d:.85,page:0,desc:'双层木边桌'},cushion:{name:'坐垫',w:.8,d:.8,page:0,desc:'有滚边与纽扣的软垫'},rug:{name:'小地毯',w:1.4,d:1,page:0,desc:'条纹与流苏地毯'},
 arcade:{name:'迷你街机',w:.85,d:.85,page:1,desc:'像素游戏屏与摇杆'},turntable:{name:'黑胶听音柜',w:1.1,d:.8,page:1,desc:'唱针、黑胶与唱片槽'},guitarstand:{name:'电吉他架',w:.75,d:.65,page:1,desc:'琴弦、拾音器与琴架'},speaker:{name:'复古音箱',w:.7,d:.65,page:1,desc:'木壳与双单元音箱'},neon:{name:'彩虹灯牌',w:1.1,d:.55,page:1,desc:'桌架上的六色彩虹'},recordrack:{name:'专辑收藏架',w:1.1,d:.7,page:1,desc:'彩色封套与收藏小物'},
 terrarium:{name:'玻璃生态瓶',w:.85,d:.85,page:2,desc:'瓶中的苔藓与小蘑菇'},aquarium:{name:'小鱼缸',w:1.15,d:.75,page:2,desc:'水草、气泡与两条小鱼'},catTower:{name:'猫咪爬架',w:.95,d:.85,page:2,desc:'猫窝、抓柱与悬挂玩具'},teaCart:{name:'下午茶推车',w:1.15,d:.8,page:2,desc:'茶壶、双杯与小蛋糕'},flowerstand:{name:'阶梯花架',w:1.15,d:.85,page:2,desc:'三盆不同形态的花草'},telescope:{name:'观星望远镜',w:1.1,d:1.1,page:2,desc:'镜筒、镜头与三脚架'}
};
export const DECOR_PAGES=['日常小物','兴趣收藏','慢生活角落'];
export const DECOR_COLORS=['#dfc2bd','#c6d7c5','#c8bfdc','#e6d2aa','#a6becd','#9e806a'];
export function createDecorationSystem({rooms,scene,box,ball,cylinder,round,invalidate,stopWalking}){
 const groups=rooms.map(room=>{const g=new THREE.Group();g.name='custom-decoration';room.add(g);return g}),keys=['','',''];
 let editor=-1,callback=()=>{},preview=null;
 const defaults=rooms.map(room=>{
  const surfaces={wall:[],floor:[],rug:[]};room.children.forEach(o=>{if(!o.isMesh)return;
   if(o.name.startsWith('floor-room'))surfaces.floor.push(o);
   else if(o.position.y===2.08)surfaces.wall.push(o);
   else if(o.geometry.parameters?.depth>2&&o.position.y>.19&&o.position.y<.26)surfaces.rug.push(o);
  });for(const objects of Object.values(surfaces))for(const o of objects){o.material=o.material.clone();o.userData.defaultColor=o.material.color.getHexString()}
  return surfaces;
 });
 function model(item,parent){
  const g=new THREE.Group();g.userData.decorId=item.id;g.userData.decorType=item.type;parent.add(g);g.position.set(item.x??0,.20,item.z??0);g.rotation.y=(item.rotation??0)*Math.PI/2;
  const color=item.color??'#b6c7a0';
  function shape(geometry,material,x,y,z){const o=new THREE.Mesh(geometry,material);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;g.add(o);o.userData.ownedMaterial=true;return o}
  function hoop(radius,tube,c,x,y,z){return shape(new THREE.TorusGeometry(radius,tube,8,24),new THREE.MeshStandardMaterial({color:c,roughness:.65}),x,y,z)}
  function rod(a,b,r,c){const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),delta=bv.clone().sub(av);const o=cylinder(r,r,delta.length(),c,...av.clone().add(bv).multiplyScalar(.5).toArray(),g);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return o}
  function panel(w,h,x,y,z,draw){const canvas=document.createElement('canvas');canvas.width=canvas.height=256;draw(canvas.getContext('2d'));const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;const material=new THREE.MeshStandardMaterial({map:texture,roughness:.7});const o=shape(new THREE.PlaneGeometry(w,h),material,x,y,z);o.userData.ownedMaterial=true;return o}
  function glass(geo,x,y,z,tint='#d0e7dc',opacity=.18){const o=shape(geo,new THREE.MeshStandardMaterial({color:tint,transparent:true,opacity,roughness:.12,depthWrite:false,side:THREE.DoubleSide}),x,y,z);o.userData.ownedMaterial=true;return o}
  function bloom(x,y,z,c){cylinder(.025,.025,.27,'#66896b',x,y-.13,z,g);ball(.055,'#e2b45a',x,y,z,g);for(let n=0;n<6;n++){const a=n*Math.PI/3;const petal=ball(.055,c,x+Math.cos(a)*.07,y+Math.sin(a)*.07,z+.015,g);petal.scale.z=.45}}
  function pot(x,y,z,r,c){cylinder(r,r*.75,.2,c,x,y+.1,z,g);cylinder(r*.9,r*.9,.015,'#665041',x,y+.21,z,g);hoop(r,.012,c,x,y+.2,z).rotation.x=Math.PI/2}

  if(item.type==='plant'){cylinder(.20,.15,.32,'#ba8b72',0,.16,0,g);cylinder(.02,.025,.55,'#748663',0,.55,0,g);for(let i=0;i<5;i++){const leaf=ball(.14,color,Math.sin(i*2)*.16,.4+i*.1,Math.cos(i*2)*.16,g);leaf.scale.y=.45}}
  if(item.type==='lamp'){cylinder(.23,.23,.06,'#8b756b',0,.03,0,g);cylinder(.025,.025,1.1,'#8b756b',0,.6,0,g);cylinder(.18,.3,.32,color,0,1.25,0,g)}
  if(item.type==='stool'||item.type==='table'){const w=item.type==='table'?.8:.65;round(w,.12,w,color,0,.57,0,.035,g);for(const x of [-w*.32,w*.32])for(const z of [-w*.32,w*.32])box(.07,.5,.07,'#9c8068',x,.26,z,g)}
  if(item.type==='cushion')round(.75,.18,.75,color,0,.12,0,.055,g);
  if(item.type==='rug')round(1.4,.022,1,color,0,.026,0,.008,g);
  // 细节也应用在原有六件物品上。
  if(item.type==='plant'){cylinder(.185,.185,.015,'#64513c',0,.326,0,g);hoop(.195,.013,'#d5ad8f',0,.31,0).rotation.x=Math.PI/2}
  if(item.type==='lamp'){for(let n=0;n<16;n++){const a=n*Math.PI/8;rod([Math.cos(a)*.18,1.41,Math.sin(a)*.18],[Math.cos(a)*.30,1.09,Math.sin(a)*.30],.007,'#ead8bd')}ball(.05,'#ffe7b4',0,1.06,0,g)}
  if(item.type==='stool'){rod([-.2,.21,-.2],[.2,.21,-.2],.018,'#b79473');rod([-.2,.21,.2],[.2,.21,.2],.018,'#b79473')}
  if(item.type==='table'){round(.7,.05,.7,'#c9a585',0,.23,0,.015,g);box(.22,.025,.3,'#eee0c3',-.12,.615,.05,g)}
  if(item.type==='cushion'){for(const z of [-.34,.34])box(.64,.014,.018,'#f4e5d4',0,.14,z,g);for(const x of [-.34,.34])box(.018,.014,.64,'#f4e5d4',x,.14,0,g);ball(.03,'#dac4b0',0,.22,0,g)}
  if(item.type==='rug'){for(let i=0;i<3;i++)box(1.28,.008,.035,['#f3dfb9','#b9c9bc','#b99bc5'][i],0,.041,-.37+i*.07,g);for(let i=0;i<11;i++)for(const z of [-.48,.48])box(.018,.012,.075,'#efe2ce',-.6+i*.12,.03,z,g)}
  if(item.type==='arcade'){
   round(.76,.78,.7,'#574958',0,.4,0,.045,g);round(.76,.48,.40,color,0,1.01,-.13,.025,g);box(.70,.15,.36,'#8d729d',0,1.33,-.13,g);box(.56,.34,.03,'#282a43',0,1.01,.085,g);
   panel(.52,.29,0,1.01,.104,ctx=>{ctx.fillStyle='#24243b';ctx.fillRect(0,0,256,256);for(let n=0;n<20;n++){ctx.fillStyle=n%2?'#97c6b1':'#eac88d';ctx.fillRect((n*47)%240,(n*73)%210,6,6)}ctx.fillStyle='#b1abd6';for(let n=0;n<5;n++)ctx.fillRect(100+n*10,145-Math.abs(n-2)*10,9,12);ctx.fillStyle='#e7b4c3';ctx.fillRect(36,50,30,10);ctx.fillRect(200,70,20,10)});
   const deck=box(.67,.08,.3,'#aa8eaf',0,.79,.24,g);cylinder(.015,.015,.10,'#3d3344',-.16,.88,.26,g);ball(.04,'#e49fae',-.16,.94,.26,g);for(let n=0;n<3;n++)cylinder(.035,.035,.015,['#e8be76','#a3c6b2','#d299ad'][n],.07+n*.08,.845,.27,g);box(.19,.07,.02,'#373042',0,.33,.36,g);
  }
  if(item.type==='turntable'){
   round(1,.55,.7,'#9e785d',0,.32,0,.025,g);round(1.04,.1,.72,'#c5a27e',0,.66,0,.02,g);cylinder(.24,.24,.025,'#36313c',-.17,.726,0,g);for(const r of [.13,.18,.22])hoop(r,.004,'#5e5361',-.17,.743,0).rotation.x=Math.PI/2;cylinder(.055,.055,.027,color,-.17,.746,0,g);rod([.35,.77,-.23],[.34,.77,.05],.012,'#d9c6b1');rod([.34,.77,.05],[.06,.77,.16],.012,'#d9c6b1');box(.06,.035,.08,'#4c404c',.06,.75,.16,g);
   box(.90,.025,.59,'#b39475',0,.25,0,g);for(let n=0;n<7;n++){const sleeve=box(.035,.20,.27,['#b5bdd5','#dbadba','#bbc9ac'][n%3],-.37+n*.065,.39,.17,g);sleeve.rotation.z=.08}box(.28,.17,.02,'#5d505b',.3,.4,.36,g);
  }
  if(item.type==='guitarstand'){
   cylinder(.25,.25,.04,'#5d5159',0,.02,0,g);rod([0,.04,-.08],[0,.9,-.08],.02,'#5d5159');
   const body=ball(.22,color,0,.39,.02,g);body.scale.set(1,.95,.32);const waist=ball(.15,color,.04,.56,.02,g);waist.scale.set(.8,1,.45);round(.07,.55,.04,'#ad8762',.03,.89,.02,.01,g);round(.10,.16,.055,'#816253',.03,1.22,.02,.015,g);box(.10,.12,.02,'#eee2c8',.01,.48,.096,g);box(.12,.03,.02,'#413744',0,.33,.10,g);for(let n=0;n<6;n++){rod([.005+n*.009,.33,.117],[.005+n*.009,1.27,.06],.002,'#cfc2b1');box(.026,.016,.04,'#c4b49e',n%2?-.037:.097,1.17+Math.floor(n/2)*.04,.02,g)}
  }
  if(item.type==='speaker'){
   round(.62,1.05,.5,'#a78164',0,.56,0,.035,g);round(.53,.96,.025,'#45424b',0,.56,.265,.016,g);for(const [r,y] of [[.17,.39],[.10,.83]]){cylinder(r,r,.018,'#625c66',0,y,.29,g).rotation.x=Math.PI/2;hoop(r,.014,'#ae9c8d',0,y,.305);ball(r*.35,'#39343e',0,y,.31,g).scale.z=.25}for(const x of [-.22,.22])for(const y of [.15,.97])ball(.014,'#d1bca1',x,y,.29,g);
  }
  if(item.type==='neon'){
   round(1.02,.08,.45,'#9d8473',0,.04,0,.02,g);rod([-.38,.08,0],[-.38,.38,0],.018,'#ac947e');rod([.38,.08,0],[.38,.38,0],.018,'#ac947e');
   for(let n=0;n<6;n++){const c=['#d68d98','#e5ad81','#e8ca85','#91b8a3','#88b3ce','#b39dcb'][n],material=new THREE.MeshStandardMaterial({color:c,emissive:c,emissiveIntensity:.55,roughness:.4});const arc=shape(new THREE.TorusGeometry(.44-n*.046,.016,8,32,Math.PI),material,0,.38,0);arc.userData.ownedMaterial=true}for(const x of [-.37,.37])for(let n=0;n<3;n++)ball(.06,'#efe4d4',x+(n-1)*.045,.37,0,g);
  }
  if(item.type==='recordrack'){
   for(const x of [-.48,.48])box(.065,.85,.58,'#ae8b6e',x,.44,0,g);for(const y of [.08,.48,.86])round(1,.055,.62,'#c6a383',0,y,0,.015,g);for(let n=0;n<7;n++){const c=['#b59ccb','#a4bfab','#dfbd8a','#bd9da6'][n%4];box(.042,.30,.29,c,-.37+n*.095,.65,.09,g);box(.030,.02,.31,'#eedfce',-.37+n*.095,.73,.09,g)}
   for(let n=0;n<3;n++){box(.23,.28,.035,['#b39cc8','#e0bb8e','#9dbab0'][n],-.3+n*.3,.24,.23,g);ball(.055,'#f0dfc1',-.3+n*.3,.24,.258,g).scale.z=.15}
  }
  if(item.type==='terrarium'){
   round(.75,.28,.75,'#aa8768',0,.14,0,.035,g);cylinder(.25,.25,.10,'#84715b',0,.34,0,g);for(let n=0;n<7;n++){const a=n*2.4;ball(.075,'#8ba77a',Math.cos(a)*.13,.4,Math.sin(a)*.13,g)}for(const x of [-.09,.10]){cylinder(.015,.015,.13,'#e9d6b1',x,.48,0,g);const cap=ball(.07,x<0?'#c49c85':'#bd91a5',x,.55,0,g);cap.scale.y=.45;ball(.012,'#f7e9cd',x+.025,.578,.035,g)}glass(new THREE.SphereGeometry(.31,24,16),0,.60,0);cylinder(.12,.12,.055,'#b6936f',0,.88,0,g);
  }
  if(item.type==='aquarium'){
   round(1.08,.30,.66,'#ac8b6a',0,.16,0,.025,g);box(1.04,.045,.62,'#d4b993',0,.36,0,g);box(.92,.035,.51,'#c9bd99',0,.405,0,g);glass(new THREE.BoxGeometry(1,.62,.57),0,.72,0,'#b4d3d1',.13);glass(new THREE.BoxGeometry(.95,.45,.53),0,.68,0,'#78b4bf',.13);box(1.04,.055,.62,'#5d6464',0,1.04,0,g);
   for(let n=0;n<6;n++){const x=-.35+n*.035;rod([x,.43,-.12],[x+Math.sin(n)*.07,.65+n*.03,-.12],.012,'#739977')}for(const [index,[x,y,z,c]] of [[.18,.68,.12,'#e2b574'],[-.12,.83,.09,'#dca2b2']].entries()){
    const fishGroup=new THREE.Group();fishGroup.userData.fishIndex=index;g.add(fishGroup);
    const fish=ball(.065,c,x,y,z,g);fish.scale.set(1.7,.6,.4);const tail=shape(new THREE.ConeGeometry(.045,.075,3),new THREE.MeshStandardMaterial({color:c}),x-.13,y,z);tail.rotation.z=-Math.PI/2;
    const eye=ball(.009,'#42454b',x+.065,y+.007,z+.027,g);fishGroup.add(fish,tail,eye);
   }for(let n=0;n<5;n++)ball(.014,'#d8eeee',.33,.5+n*.085,.04,g);
  }
  if(item.type==='catTower'){
   round(.84,.08,.76,color,0,.04,0,.025,g);cylinder(.065,.065,.88,'#b6a181',-.23,.50,-.16,g);for(let n=0;n<16;n++)hoop(.066,.006,'#dfc9a9',-.23,.15+n*.045,-.16).rotation.x=Math.PI/2;round(.55,.08,.5,'#ded0ba',-.18,.97,-.10,.035,g);round(.46,.38,.43,color,.20,.30,.12,.055,g);cylinder(.13,.13,.015,'#645562',.20,.30,.344,g).rotation.x=Math.PI/2;rod([-.32,.96,.07],[-.32,.69,.07],.005,'#a79075');ball(.055,'#d6a3b4',-.32,.66,.07,g);
  }
  if(item.type==='teaCart'){
   for(const y of [.18,.7])round(1,.075,.64,'#c9a581',0,y,0,.025,g);for(const x of [-.43,.43])for(const z of [-.25,.25]){rod([x,.1,z],[x,.77,z],.018,'#9d7e65');const wheel=cylinder(.055,.055,.035,'#665b64',x,.07,z,g);wheel.rotation.x=Math.PI/2}rod([.44,.75,-.25],[.44,.87,-.25],.015,'#9d7e65');rod([.44,.87,-.25],[.44,.87,.25],.015,'#9d7e65');
   const teapot=ball(.11,color,-.20,.87,-.05,g);teapot.scale.y=.8;cylinder(.065,.07,.025,'#ede1c8',-.2,.97,-.05,g);ball(.018,'#aa8c73',-.2,.997,-.05,g);rod([-.13,.86,-.05],[-.01,.94,-.05],.025,color);hoop(.07,.013,color,-.32,.87,-.05);for(const x of [.1,.30]){cylinder(.055,.045,.075,'#f0e2c9',x,.79,.13,g);cylinder(.043,.043,.006,'#825f43',x,.83,.13,g);hoop(.03,.01,'#f0e2c9',x+.055,.795,.13)}cylinder(.12,.12,.018,'#e8d8bb',.16,.754,-.14,g);cylinder(.075,.075,.085,'#bc9376',.16,.81,-.14,g);cylinder(.08,.08,.018,'#eed7ba',.16,.86,-.14,g);ball(.023,'#c98692',.16,.893,-.14,g);for(let n=0;n<3;n++)box(.26,.035,.3,['#a6bdac','#c2a9ce','#d5b68c'][n],-.15,.24+n*.04,.06,g);
  }
  if(item.type==='flowerstand'){
   for(const [x,y,z] of [[-.33,.20,.20],[0,.40,0],[.33,.62,-.20]]){round(.31,.045,.34,'#b89a79',x,y,z,.012,g);for(const dz of [-.13,.13])box(.035,y,.035,'#997a63',x,y/2,z+dz,g);pot(x,y+.02,z,.105,['#d0ad95','#c2abc9','#a5bca8'][Math.round((x+.33)/.33)]);if(x<0)bloom(x,y+.45,z,'#d6a0ae');else if(x>0)bloom(x,y+.49,z,'#e2c578');else for(let n=0;n<4;n++){const leaf=ball(.07,'#8ba77c',x+Math.sin(n*2)*.07,y+.32+n*.05,z,g);leaf.scale.y=.5}}
  }
  if(item.type==='telescope'){
   for(let n=0;n<3;n++){const a=n*Math.PI*2/3;rod([Math.cos(a)*.42,.02,Math.sin(a)*.42],[0,.70,0],.023,'#b5a995');ball(.035,'#655b62',Math.cos(a)*.42,.035,Math.sin(a)*.42,g)}cylinder(.065,.065,.15,'#7c6a7c',0,.72,0,g);
   const tube=rod([-.30,.85,0],[.30,1.05,0],.11,color);const lens=cylinder(.11,.11,.025,'#80a5b9',.31,1.055,0,g);lens.quaternion.copy(tube.quaternion);const rim=cylinder(.125,.125,.045,'#756879',.27,1.04,0,g);rim.quaternion.copy(tube.quaternion);rod([-.32,.84,0],[-.4,.81,0],.04,'#554958');rod([0,.75,.02],[.12,.75,.16],.016,'#756879');ball(.03,'#a694ad',.12,.75,.16,g);
  }
  return g;
 }
 function dispose(g){g.traverse(o=>{if(o.isMesh){o.geometry.dispose();if(o.userData.previewMaterial||o.userData.ownedMaterial){o.material.map?.dispose();o.material.dispose()}}});g.clear()}
 function setRoom(room,config={}){
  if(!rooms[room])return;const key=JSON.stringify(config);if(keys[room]===key)return;keys[room]=key;
  for(const [surface,objects] of Object.entries(defaults[room]))for(const o of objects)o.material.color.set(config.colors?.[surface]??'#'+o.userData.defaultColor);
  dispose(groups[room]);for(const item of config.items??[])if(DECOR_ITEMS[item.type])model(item,groups[room]);invalidate();
 }
 function obstacles(room,exclude){const result=[],root=rooms[room];scene.updateMatrixWorld(true);root.traverse(o=>{
  if(!o.isMesh||o.name.startsWith('floor-')||o.material.visible===false)return;
  for(let p=o;p&&p!==root;p=p.parent)if(p.name==='decor-preview'||p.name.startsWith('resident-')||p.userData.decorId===exclude)return;
  const b=new THREE.Box3().setFromObject(o);if(b.max.y<.35||b.min.y>1.55)return;
  result.push({minX:b.min.x-root.position.x,maxX:b.max.x-root.position.x,minZ:b.min.z-root.position.z,maxZ:b.max.z-root.position.z});
 });return result}
 function canPlace(room,item){
  const spec=DECOR_ITEMS[item.type];if(!spec||!Number.isFinite(item.x)||!Number.isFinite(item.z))return false;
  const p=rooms[room].userData.floorPlan,w=(item.rotation%2?spec.d:spec.w)/2+.08,d=(item.rotation%2?spec.w:spec.d)/2+.08;
  const regions=[p,...(p.wing?[p.wing]:[])];if(!regions.some(r=>item.x-w>=r.minX+.25&&item.x+w<=r.maxX-.25&&item.z-d>=r.minZ+.25&&item.z+d<=r.maxZ-.25))return false;
  // 始终给门洞和日常人物起点留出空间。
  const spawn=[{x:-.9,z:3.7},{x:1.1,z:2.8},{x:-1.2,z:2.3}][room],exit=[{x:-.9,z:8},{x:.5,z:8},{x:-2.2,z:8}][room];
  if([spawn,exit].some(q=>Math.abs(q.x-item.x)<w+.65&&Math.abs(q.z-item.z)<d+.65))return false;
  const obs=obstacles(room,item.id),rect={minX:item.x-w,maxX:item.x+w,minZ:item.z-d,maxZ:item.z+d};
  if(obs.some(r=>rect.minX<r.maxX&&rect.maxX>r.minX&&rect.minZ<r.maxZ&&rect.maxZ>r.minZ))return false;
  if(item.type==='rug')return true;
  const nav=createNavigator(regions,obs.concat(rect));return Boolean(nav.findPath(spawn,exit));
 }
 function clearPreview(){if(preview){dispose(preview);preview.parent.remove(preview);preview=null}}
 function setEditor(room,item,onChange=()=>{}){clearPreview();editor=room;callback=onChange;stopWalking();if(room<0)return;
  if(item){preview=model(item,rooms[room]);preview.name='decor-preview';preview.userData.item=structuredClone(item);preview.visible=Number.isFinite(item.x)&&Number.isFinite(item.z);preview.traverse(o=>{if(o.isMesh){const source=o.material;o.material=source.clone();if(o.userData.ownedMaterial)source.dispose();o.userData.previewMaterial=true;o.material.transparent=true;o.material.opacity=.55;o.material.color.set(canPlace(room,item)?'#9fc4a4':'#dc8b90')}})}
 }
 function tap(ray){if(editor<0)return false;
  const selected=ray.intersectObjects(groups[editor].children,true)[0];
  if(!preview&&selected){let o=selected.object;while(!o.userData.decorId&&o.parent)o=o.parent;callback({selected:o.userData.decorId});return true}
  if(preview){const hits=ray.intersectObjects(rooms[editor].children.filter(o=>o.name.startsWith('floor-room')));if(hits[0]){
   const p=rooms[editor].worldToLocal(hits[0].point.clone()),item={...preview.userData.item,x:Math.round(p.x*4)/4,z:Math.round(p.z*4)/4};const valid=canPlace(editor,item);callback({item,valid});
  }}return true;
 }
 function interaction(ray){
  const hit=ray.intersectObjects(groups.flatMap(g=>g.children),true)[0];if(!hit)return null;
  let object=hit.object;while(!object.userData.decorId&&object.parent)object=object.parent;
  if(!['arcade','aquarium','telescope'].includes(object.userData.decorType))return null;
  return {distance:hit.distance,type:object.userData.decorType,room:groups.findIndex(g=>object.parent===g)};
 }
 function setAquariumColors(rows){
  for(let room=0;room<groups.length;room++){const colors=rows.find(r=>r.room_id===room)?.fish_colors;if(!colors)continue;
   groups[room].traverse(o=>{const index=o.userData.fishIndex;if(index===undefined||o.userData.fishColor===colors[index])return;o.userData.fishColor=colors[index];
    for(const mesh of o.children.slice(0,2)){if(mesh.userData.ownedMaterial)mesh.material.dispose();mesh.material=mesh.material.clone();mesh.material.color.set(colors[index]);mesh.userData.ownedMaterial=true}
   });
  }
 }
 function animate(time,reduced){if(reduced||editor>=0)return;for(const group of groups)group.traverse(o=>{if(o.userData.fishIndex!==undefined){const phase=o.userData.fishIndex*2.6;o.position.x=Math.sin(time*.001+phase)*.035;o.position.y=Math.sin(time*.0013+phase)*.012}})}
 return {interaction,animate,setAquariumColors,createPreviewModel:item=>model(item,new THREE.Group()),setRoom,setEditor,canPlace,tap,get editing(){return editor>=0}};
}
