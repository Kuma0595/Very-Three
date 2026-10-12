// 三段原创合成短曲，不使用外部录音。每次进房播放一次，15 秒后结束。
export const ROOM_TRACKS=[
  {title:'下一局开场',style:'摇滚 × 8-bit',bpm:128},
  {title:'唱针落下',style:'黑胶 × 复古流行',bpm:96},
  {title:'霓虹练习室',style:'K-pop × 电子舞曲',bpm:120}
];
export const TRACK_SECONDS=15;
const frequency=midi=>440*2**((midi-69)/12);

export function createRoomMusic(onState=()=>{}){
  let context=null,active=null,revision=0,room=-2,muted=false;
  try{muted=localStorage.getItem('very-three-music-muted')==='true'}catch{}
  const publish=state=>onState({state,room,muted,track:ROOM_TRACKS[room]??null});
  function stop(){
    revision++;
    if(active){
      clearTimeout(active.timer);
      // 停止所有已排期的声源，快速切房也不会叠加或留下尾音。
      for(const source of active.sources){try{source.stop()}catch{}}
      for(const node of active.nodes){try{node.disconnect()}catch{}}
      active=null;
    }
  }
  function compose(index){
    const track=ROOM_TRACKS[index],beat=60/track.bpm;
    const begin=context.currentTime+.04,end=begin+TRACK_SECONDS;
    const sources=[],nodes=[];
    const master=context.createGain(),limiter=context.createDynamicsCompressor();
    master.gain.setValueAtTime(0,begin);
    master.gain.linearRampToValueAtTime(.48,begin+.12);
    master.gain.setValueAtTime(.48,end-.65);
    master.gain.linearRampToValueAtTime(0,end);
    limiter.threshold.value=-16;limiter.ratio.value=6;
    master.connect(limiter);limiter.connect(context.destination);nodes.push(master,limiter);
    const noise=context.createBuffer(1,context.sampleRate,context.sampleRate);
    let seed=173+index;
    const samples=noise.getChannelData(0);
    for(let i=0;i<samples.length;i++){seed=(1664525*seed+1013904223)>>>0;samples[i]=seed/2147483648-1}
    function tone(midi,time,duration,volume=.12,type='triangle',cutoff=2500){
      if(time>=TRACK_SECONDS-.12)return;
      const at=begin+time,until=Math.min(end,at+duration);
      const oscillator=context.createOscillator(),gain=context.createGain(),filter=context.createBiquadFilter();
      oscillator.type=type;oscillator.frequency.value=frequency(midi);
      filter.type='lowpass';filter.frequency.value=cutoff;
      gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(volume,at+.008);
      gain.gain.exponentialRampToValueAtTime(.0001,until);
      oscillator.connect(filter);filter.connect(gain);gain.connect(master);
      oscillator.start(at);oscillator.stop(until);sources.push(oscillator);nodes.push(oscillator,filter,gain);
    }
    function percussion(kind,time){
      if(time>=TRACK_SECONDS-.2)return;
      const at=begin+time;
      if(kind==='kick'){
        const oscillator=context.createOscillator(),gain=context.createGain();
        oscillator.frequency.setValueAtTime(140,at);oscillator.frequency.exponentialRampToValueAtTime(42,at+.13);
        gain.gain.setValueAtTime(.5,at);gain.gain.exponentialRampToValueAtTime(.0001,at+.2);
        oscillator.connect(gain);gain.connect(master);oscillator.start(at);oscillator.stop(at+.21);
        sources.push(oscillator);nodes.push(oscillator,gain);
      }else{
        const source=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain();
        source.buffer=noise;filter.type='highpass';filter.frequency.value=kind==='hat'?6500:1600;
        const length=kind==='hat'?.055:.15;
        gain.gain.setValueAtTime(kind==='hat'?.065:.19,at);gain.gain.exponentialRampToValueAtTime(.0001,at+length);
        source.connect(filter);filter.connect(gain);gain.connect(master);source.start(at);source.stop(at+length);
        sources.push(source);nodes.push(source,filter,gain);
      }
    }
    const chords=index===0?[40,43,38,45]:index===1?[48,45,53,55]:[45,53,48,55];
    const melodies=index===0?[76,76,79,83,79,76,74,71,76,79,83,86,83,79,74,76]:index===1?[72,76,79,76,69,72,76,72,77,81,84,81,79,76,74,71]:[81,84,88,84,81,79,76,79,84,88,89,88,84,81,79,76];
    for(let n=0;n*beat<TRACK_SECONDS-.25;n++){
      const t=n*beat,root=chords[Math.floor(n/4)%4];
      percussion(n%2===0?'kick':'snare',t);
      percussion('hat',t);percussion('hat',t+beat/2);
      tone(root,t,beat*.8,index===0?.17:.13,'triangle',600);
      if(index===0){
        // 电吉他式锯齿强力和弦配合方波电玩旋律。
        for(const interval of [0,7,12])tone(root+12+interval,t,beat*.32,.075,'sawtooth',1900);
        tone(melodies[n%16],t+beat/2,beat*.36,.07,'square',3200);
      }else if(index===1){
        // 柔和电钢琴和弦与切分旋律，配低音量唱片底噪。
        if(n%4===0)for(const interval of [12,16,19,23])tone(root+interval,t,beat*3.5,.07,'triangle',1600);
        tone(melodies[n%16],t+(n%2?.12:0),beat*.65,.11,'sine',2300);
      }else{
        // 明亮合成器琶音、四拍律动与短促旋律。
        if(n%2===1)percussion('kick',t+beat*.75);
        for(let j=0;j<4;j++)tone(root+24+[0,7,12,7][j],t+j*beat/4,beat*.2,.06,'sawtooth',4000);
        tone(melodies[n%16],t,beat*.55,.09,'triangle',5000);
      }
    }
    if(index===1){
      const crackle=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain();
      crackle.buffer=noise;crackle.loop=true;filter.type='lowpass';filter.frequency.value=900;gain.gain.value=.012;
      crackle.connect(filter);filter.connect(gain);gain.connect(master);crackle.start(begin);crackle.stop(end);
      sources.push(crackle);nodes.push(crackle,filter,gain);
    }
    return {sources,nodes,end,timer:null};
  }
  async function play(index){
    stop();room=index;
    if(!ROOM_TRACKS[index]){publish('idle');return}
    if(muted){publish('muted');return}
    const request=revision;
    try{
      const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;
      if(!Audio){publish('unavailable');return}
      context??=new Audio();
      await context.resume();
      // resume 可能等待系统音频授权，旧房间的请求不能继续播放。
      if(request!==revision||muted)return;
      if(context.state!=='running'){publish('blocked');return}
      active=compose(index);publish('playing');
      active.timer=setTimeout(()=>{
        if(request!==revision)return;
        stop();publish('ended');
      },Math.ceil((active.end-context.currentTime)*1000));
    }catch{
      if(request===revision){stop();publish('blocked')}
    }
  }
  return {
    play,
    setMuted(value){muted=Boolean(value);try{localStorage.setItem('very-three-music-muted',String(muted))}catch{};if(muted){stop();publish(room<0?'idle':'muted')}else void play(room)},
    get muted(){return muted},
    stop(){stop();publish(room<0?'idle':muted?'muted':'ended')}
  };
}
