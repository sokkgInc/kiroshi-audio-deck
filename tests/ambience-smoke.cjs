'use strict';
// Kiroshi Audio Deck: dependency-free behavioural tests against the real deployed JS.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const root='updates/payload/ambience/';
const app=fs.readFileSync(root+'app.js','utf8');
const atlas=fs.readFileSync(root+'scene-expansion.js','utf8');
const html=fs.readFileSync(root+'index.html','utf8');
const checks=[];
function verify(name,fn){try{fn();checks.push({name,ok:true});console.log('PASS '+name)}
  catch(error){checks.push({name,ok:false,error:error.message});console.error('FAIL '+name+': '+error.stack)}}
function run(saved={}){
  const nodes=new Map(),events={},history=[],storage={...saved};
  function element(id){
    return {id,textContent:'',innerHTML:'',value:'',style:{},hidden:false,dataset:{},
      addEventListener(type,cb){events[id+':'+type]=cb},
      setAttribute(){},before(){},after(){},click(){},close(){},showModal(){},
      classList:{toggle(){},add(){},remove(){}},
      querySelector(q){return get(id+':'+q)},querySelectorAll(){return []}};
  }
  function get(id){if(!nodes.has(id))nodes.set(id,element(id));return nodes.get(id)}
  const document={body:{dataset:{}},querySelector:get,getElementById:get,createElement:element,querySelectorAll(){return []}};
  const localStorage={getItem:k=>storage[k]||null,setItem:(k,v)=>{storage[k]=String(v)}};
  const player={state:-1,volume:28,video:null,ready:false,
    getPlayerState(){return this.state},setVolume(v){this.volume=v},getVolume(){return this.volume},
    getDuration(){return 3600},getVideoData(){return {video_id:this.video}},
    loadVideoById(x){this.video=x.videoId;history.push(['load',x.videoId,x.startSeconds]);this.state=1},
    cueVideoById(id){this.video=id;history.push(['cue',id]);this.state=5},
    cuePlaylist(x){history.push(['cuePlaylist',x.list]);this.state=5},
    loadPlaylist(x){history.push(['loadPlaylist',x.list]);this.state=1},
    seekTo(v){history.push(['seek',v])},pauseVideo(){history.push(['pause']);this.state=2},
    stopVideo(){history.push(['stop']);this.state=-1},playVideo(){history.push(['play']);this.state=1}};
  const YT={PlayerState:{UNSTARTED:-1,ENDED:0,PLAYING:1,PAUSED:2,CUED:5},Player:class{constructor(id,o){YT.events=o.events;return player}}};
  const window={parent:{},location:{origin:'http://127.0.0.1:48721'},addEventListener(){}};
  const timers=new Map();let nextTimer=1;
  const context=vm.createContext({URL,document,localStorage,YT,window,console,
    navigator:{clipboard:{writeText:async()=>{}}},
    setInterval:(fn)=>{const n=nextTimer++;timers.set(n,fn);return n},
    clearInterval:(id)=>timers.delete(id),
    setTimeout:()=>0});
  vm.runInContext(app,context,{filename:'ambience/app.js'});
  vm.runInContext(atlas,context,{filename:'ambience/scene-expansion.js'});
  window.onYouTubeIframeAPIReady();
  YT.events.onReady({target:player});
  const value=expr=>vm.runInContext(expr,context);
  return {context,document,storage,history,player,YT,value,
    select:(id,autoplay=true)=>value('selectPreset(presets.find(p=>p.id==='+JSON.stringify(id)+'),'+Boolean(autoplay)+')'),
    fire:(event)=>YT.events.onStateChange({data:event}),error:(code)=>YT.events.onError({data:code}),
    onClick:(id)=>get(id).onclick?.(),
    runTimers:()=>{for(const fn of Array.from(timers.values()))fn()}};
}
verify('HTML imports app, expansion, deck mode and YouTube API',()=>{
  for(const file of ['app.js','scene-expansion.js','deck-pages.js','youtube.com/iframe_api'])
    assert(html.includes(file),file+' is missing');
});
const t=run();
const presets=t.value('presets');
verify('No duplicate scene IDs',()=>{
  const ids=presets.map(x=>x.id);assert.equal(new Set(ids).size,ids.length);
});
verify('Every built-in scene has a valid YouTube source',()=>{
  const ids=[];
  for(const p of presets){
    const urls=t.value('sourcePool('+JSON.stringify(p.id)+')');
    assert(urls.length>0,p.id+' has no sources');
    for(const u of urls){
      const v=new URL(u);assert(['www.youtube.com','youtu.be','youtube.com'].includes(v.hostname),u);
      const id=v.hostname==='youtu.be'?v.pathname.slice(1):v.searchParams.get('v');
      assert(/^[A-Za-z0-9_-]{11}$/.test(id||''),p.id+': '+u);ids.push(id);
    }
  }
  const unique=[...new Set(ids)];
  console.log('AUDIT '+presets.length+' scenes, '+ids.length+' assignments, '+unique.length+' unique video IDs');
  fs.writeFileSync('/tmp/kiroshi-video-sources.json',JSON.stringify({scene_count:presets.length,source_count:ids.length,unique_ids:unique,by_scene:Object.fromEntries(presets.map(p=>[p.id,t.value('sourcePool('+JSON.stringify(p.id)+')')]))},null,2));
});
verify('Free roam has three separate mixes in SOUNDTRACK',()=>{
  const scene=presets.find(x=>x.id==='freeroam');assert(scene);assert.equal(scene.category,'score');
  const urls=t.value('sourcePool("freeroam")');
  assert.equal(urls.length,3);assert.equal(new Set(urls).size,3);
});
verify('Original Club source remains; music-only secondary link removed',()=>{
  const club=t.value('sourcePool("club")');
  assert.equal(club.length,1);
  assert(club[0].includes('HOMt0qKIoYc'));
});
verify('All scenes can be selected; play requests use a real source',()=>{
  for(const p of presets){
    const before=t.history.length;
    t.select(p.id,true);
    assert.equal(t.value('current.id'),p.id,p.id);
    assert(t.history.slice(before).some(a=>['load','loadPlaylist'].includes(a[0])),p.id+' failed to start playback');
  }
});
verify('Free roam starts at zero, rather than a random offset',()=>{
  t.select('freeroam',true);let latest=t.history.filter(x=>x[0]==='load').at(-1);
  assert(latest);assert.equal(latest[2],0);
  const before=t.history.filter(x=>x[0]==='seek').length;
  t.fire(1);assert.equal(t.history.filter(x=>x[0]==='seek').length,before);
});
verify('Free roam automatically advances to a different video on end',()=>{
  t.select('freeroam',true);const prior=t.player.video;
  t.player.state=0;t.fire(0);
  assert.notEqual(t.player.video,prior);
  assert.equal(t.history.filter(x=>x[0]==='load').at(-1)[2],0);
});
verify('Normal scenes do not auto-advance when their videos end',()=>{
  t.select('club',false);const prior=t.history.length;t.player.state=0;t.fire(0);
  assert.equal(t.history.length,prior);
});
verify('Unavailable source falls back to another source where available',()=>{
  t.select('freeroam',true);const id=t.player.video;
  t.error(100);assert.notEqual(t.player.video,id);
});
verify('Saved custom links survive initialization and remain in the scene pool',()=>{
  const custom='https://www.youtube.com/watch?v=mglVOJDhhbU';
  const q=run({nightCityAmbianceAdditionalUrlsV4:JSON.stringify({night:[custom]})});
  assert(q.value('sourcePool("night")').includes(custom));
  assert.equal(q.storage.nightCityAmbianceAdditionalUrlsV4,JSON.stringify({night:[custom]}));
});
const failures=checks.filter(x=>!x.ok);
console.log('RESULT '+(checks.length-failures.length)+'/'+checks.length+' passing');
if(failures.length)process.exitCode=1;
