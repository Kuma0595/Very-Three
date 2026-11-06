import {cell,region} from './home-layout.js?v=2';
// 厨房在北侧，洗浴在东侧下方；中间留出两格宽横向通道。
export function buildUtilityRooms({THREE,parent,box,round,cylinder,mesh,art}){
 const g=new THREE.Group();g.name='kitchen-and-bath';parent.add(g);
 const b=(w,h,d,c,x,y,z)=>box(w,h,d,c,x,y,z,g),r=(w,h,d,c,x,y,z,radius=.05)=>round(w,h,d,c,x,y,z,radius,g);
 const floor=(name,coords,color)=>{const p=region(...coords);b(p.maxX-p.minX,.12,p.maxZ-p.minZ,color,(p.minX+p.maxX)/2,.12,(p.minZ+p.maxZ)/2).name=name;};
 floor('floor-kitchen',[30.5,3.5,42.5,11.5],'#dfd3af');floor('floor-bath',[31.5,14.5,42.5,19.5],'#b8cfc3');
 function wall(x0,y0,x1,y1,height=1.15){const a=cell(x0,y0),c=cell(x1,y1);b(x0===x1?.16:Math.abs(c.x-a.x),height,y0===y1?.16:Math.abs(c.z-a.z),'#d0c7ac',(a.x+c.x)/2,.2+height/2,(a.z+c.z)/2);}
 wall(30.5,3.5,42.5,3.5,3.9);wall(30.5,3.5,30.5,11.5,3.9);
 wall(30.5,11.5,35,11.5);wall(37,11.5,42.5,11.5);
 wall(42.5,3.5,42.5,8);wall(42.5,10,42.5,19.5);
 wall(31.5,14.5,36,14.5);wall(38,14.5,42.5,14.5);wall(31.5,14.5,31.5,19.5);
 for(let x=32;x<42;x++)for(let y=15;y<19;y++){const p=cell(x,y);b(.81,.012,.81,(x+y)%2?'#dce7d8':'#c9dcd0',p.x,.19,p.z);}
 // 家具位置与像素版一致：冰箱、水槽、灶台沿北墙，咖啡车靠右侧后门。
 let p=cell(32,5);r(1.35,2.4,1.15,'#d6dfd0',p.x,1.4,p.z,.1);r(.04,.45,.06,'#8a9786',p.x+.45,1.95,p.z+.62,.01);
 for(const x of [35,38]){p=cell(x,5);r(1.8,1.05,1.25,'#b89570',p.x,.75,p.z);r(1.91,.1,1.36,'#f1e8d4',p.x,1.34,p.z,.04);for(const dx of [-.43,.43])r(.76,.8,.04,'#d1b28a',p.x+dx,.77,p.z+.66,.02);}
 p=cell(35,5);r(1.13,.04,.76,'#8ba29c',p.x,1.42,p.z,.08);r(.88,.02,.53,'#c4d7ce',p.x,1.45,p.z,.06);mesh(new THREE.TorusGeometry(.17,.025,8,20,Math.PI),'#889d95',p.x,1.67,p.z-.4,g);
 p=cell(38,5);r(1.4,.04,.9,'#48554f',p.x,1.41,p.z,.025);for(const dx of [-.34,.34])for(const dz of [-.24,.24])cylinder(.16,.16,.02,'#8d9991',p.x+dx,1.45,p.z+dz,g);
 p=cell(39,9.5);r(1.7,.85,.8,'#b59970',p.x,.68,p.z);r(1.8,.1,.9,'#e8d8bb',p.x,1.16,p.z);r(.55,.55,.48,'#65766d',p.x,1.48,p.z,.07);
 p=cell(35.8,3.7);r(3.2,1.35,.08,'#f5ebd5',p.x,2.8,p.z);r(2.95,1.12,.04,'#bed4cf',p.x,2.8,p.z+.06);b(.06,1.1,.06,'#f5ebd5',p.x,2.8,p.z+.1);
 p=cell(40,16.4);r(2.1,.75,1.25,'#f2ecdc',p.x,.62,p.z,.19);r(1.8,.1,.94,'#a8c5bc',p.x,1.01,p.z,.13);
 p=cell(35,16.1);r(1.45,1.0,1.2,'#ece9db',p.x,.72,p.z,.08);mesh(new THREE.TorusGeometry(.34,.055,12,28),'#8caaa0',p.x,.76,p.z+.64,g);mesh(new THREE.CircleGeometry(.28,28),'#6f8d8b',p.x,.76,p.z+.65,g);
 p=cell(32.6,15.7);r(.68,.8,.52,'#e8e5d5',p.x,.72,p.z-.23,.06);const bowl=cylinder(.34,.24,.43,'#f4eee0',p.x,.49,p.z+.23,g);bowl.scale.z=1.25;
 p=cell(37.7,15.1);b(.07,1.25,.07,'#9a947a',p.x,.84,p.z);r(.65,.6,.07,'#e4dec5',p.x,1.18,p.z+.04,.03);
 return g;
}
