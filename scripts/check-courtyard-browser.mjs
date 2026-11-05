import fs from 'node:fs';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
fs.mkdirSync(new URL('../output/playwright/',import.meta.url),{recursive:true});
const {chromium}=await import(process.env.VT_PLAYWRIGHT_MODULE??(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright/index.mjs':'playwright'));const {createDevServer}=await import('./dev.mjs');const root=new URL('../dist/',import.meta.url),server=createDevServer(fileURLToPath(root));await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:process.env.VT_CHROME,headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']}),page=await browser.newPage({viewport:{width:1440,height:1000},hasTouch:true,timezoneId:'Asia/Shanghai',reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.message)});page.on('console',m=>{if(m.type()==='error')console.log('CONSOLE',m.text().slice(0,200))});
page.on('requestfailed',r=>console.log('FAILED',r.url(),r.failure()));page.on('response',r=>{if(r.status()>=400)console.log('HTTP',r.status(),r.url())});
const cloud=`export const currentMember=()=>({id:0,user_id:'test'}),currentRoom=()=>0,loadCloud=async()=>({}),saveCloud=async()=>{},startCloudSync=()=>()=>{},cloudError=e=>e.message;
window.__outfitRows=JSON.parse(sessionStorage.getItem('wardrobe-test-rows')||'null')||[0,1,2].map(room_id=>({room_id,version:0,config:{items:[],colors:{}}}));window.__outfitCalls=[];
export const client={from(table){const q={select(){return q},order(){return q},eq(){return q},limit(){return q},async maybeSingle(){return{data:{config:{}},error:null}},then(a,b){return Promise.resolve({data:table==='vt_decor'?structuredClone(window.__outfitRows):table==='vt_common_decor'?[{id:1,config:{items:[],colors:{}},version:0}]:[],error:null}).then(a,b)}};return q;},async rpc(name,args){if(name!=='vt_save_decor')return{data:null,error:null};window.__outfitCalls.push(structuredClone(args));if(window.__outfitFail)return{error:{message:'其他设备已更新房间'}};const row=window.__outfitRows[0];if(row.version!==args.p_version)return{error:{message:'其他设备已更新房间'}};row.config=structuredClone(args.p_config);row.version++;sessionStorage.setItem('wardrobe-test-rows',JSON.stringify(window.__outfitRows));return{data:structuredClone(row),error:null}}};`;
try{await page.addInitScript(()=>{localStorage.setItem('very-three-music-muted','true');window.requestAnimationFrame=fn=>{window.__frame=fn;return 1;};window.cancelAnimationFrame=()=>{};window.__step=count=>{window.__time??=performance.now();window.__fastStep=true;for(let i=0;i<count;i++){window.__time+=50;window.__frame(window.__time);}window.__fastStep=false;window.__time+=50;window.__frame(window.__time);};});await page.route('**/cloud.js*',r=>r.fulfill({contentType:'text/javascript',body:cloud}));await page.route('**/access.js*',r=>r.fulfill({contentType:'text/javascript',body:"document.querySelector('#access-gate').remove();document.querySelector('#home-shell').hidden=false;await import('./app.js');"}));await page.route('**/scene.js*',r=>{let s=fs.readFileSync(new URL('scene.js',root),'utf8').replace('return {setPlayer(index)','const api={setPlayer(index)').replace('},renderer};','},renderer,scene,camera};globalThis.__home=api;return api;').replace('controls.update();renderer.render(inspectionScene??scene,camera);','controls.update();if(!globalThis.__fastStep)renderer.render(inspectionScene??scene,camera);');return r.fulfill({contentType:'text/javascript',body:s});});await page.goto('http://127.0.0.1:'+server.address().port+'/');await page.waitForFunction(()=>window.__home,undefined,{polling:100,timeout:15000});await page.waitForFunction(()=>document.querySelector('#loading')===null,{},{polling:100});assert.equal(await page.locator('#walk-toggle').count(),0);await page.evaluate(()=>{window.__home.setResidentsPaused(true);window.__step(1);});

await page.setViewportSize({width:1600,height:1100});
await page.locator('[data-room="-2"]').click();await page.evaluate(()=>window.__step(1));
await page.screenshot({path:'output/playwright/courtyard-overview.png',fullPage:true});
for(const room of [0,2,-1,-3]){
 await page.evaluate(room=>{window.__home.setRoom(room);window.__step(1)},room);
 await page.screenshot({path:'output/playwright/courtyard-room-'+room+'.png',fullPage:true});
}
for(let index=0;index<4;index++){
 const portrait=await page.evaluate(index=>window.__home.getOutfitPreview(index,window.__home.getOutfit(index)),index);
 fs.writeFileSync('output/playwright/character-'+index+'.png',Buffer.from(portrait.split(',')[1],'base64'));
}
await page.setViewportSize({width:393,height:844});await page.locator('[data-room="-2"]').click();await page.evaluate(()=>window.__step(1));
assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
await page.screenshot({path:'output/playwright/courtyard-mobile.png',fullPage:true});
await page.setViewportSize({width:1600,height:1100});
await page.locator('#wardrobe-open').click();await page.waitForFunction(()=>document.querySelector('.wardrobe-preview img')?.naturalWidth===384);
await page.screenshot({path:'output/playwright/character-new.png',fullPage:true});
const portrait=await page.locator('.wardrobe-preview img').getAttribute('src');fs.writeFileSync('output/playwright/character-portrait.png',Buffer.from(portrait.split(',')[1],'base64'));
assert.deepEqual(errors,[]);console.log('PASS: courtyard room and character visual captures');
}finally{await browser.close();server.shutdown();}
