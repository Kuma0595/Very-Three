import assert from 'node:assert/strict';
import {createRoomMusic} from '../dist/room-music.js';
const voices=[];
const param=()=>({value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}});
const node=()=>({connect(){},disconnect(){this.disconnected=true}});
globalThis.document={hidden:false};
globalThis.localStorage={getItem(){return null},setItem(){}};
class AudioContext{
 constructor(){this.currentTime=0;this.state='running';this.destination={};AudioContext.instance=this}
 async resume(){}
 createOscillator(){const voice={...node(),frequency:param(),start(){this.started=true},stop(t){if(t===undefined)this.cancelled=true}};voices.push(voice);return voice}
 createBiquadFilter(){return {...node(),frequency:param(),Q:param()}}
 createGain(){return {...node(),gain:param()}}
}
globalThis.AudioContext=AudioContext;
const music=createRoomMusic();
assert.equal(await music.meow(),true);assert.equal(voices.length,1);
assert.equal(await music.meow(),false);assert.equal(voices.length,1);
music.setMuted(true);assert.equal(voices[0].cancelled,true);assert.equal(voices[0].disconnected,true);
assert.equal(await music.meow(),false);
music.setMuted(false);AudioContext.instance.currentTime=2;
document.hidden=true;assert.equal(await music.meow(),false);document.hidden=false;
assert.equal(await music.meow(),true);music.stop();assert.equal(voices[1].cancelled,true);
AudioContext.instance.currentTime=4;
let resume;AudioContext.instance.resume=()=>new Promise(resolve=>{resume=resolve});
const pending=music.meow();music.setMuted(true);resume();assert.equal(await pending,false);assert.equal(voices.length,2);
console.log('PASS: meow, cooldown, shared mute, background suppression, active sound cleanup and pending-resume cancellation');
