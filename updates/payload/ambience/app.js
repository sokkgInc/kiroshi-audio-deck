const presets = [
  { id:'night', name:'NIGHT STREETS', code:'AMBIENCE: NIGHT_STREETS_RAIN', hint:'RAIN / NEON / TRAFFIC' },
  { id:'apartment', name:'APARTMENT', code:'AMBIENCE: APARTMENT_QUIET', hint:'HOME / LOW HUM' },
  { id:'club', name:'CLUB', code:'AMBIENCE: CLUB_AFTERLIFE', hint:'BASS / CROWD / LIGHTS' },
  { id:'combat', name:'COMBAT', code:'AMBIENCE: COMBAT_TENSION', hint:'TACTICAL / PRESSURE' },
  { id:'badlands', name:'BADLANDS', code:'AMBIENCE: BADLANDS_WIND', hint:'WIND / DISTANT ENGINES' },
  { id:'downtown', name:'DOWNTOWN', code:'AMBIENCE: DOWNTOWN_CORPO', hint:'CORPO / DENSE CITY' }
];
// These are the six URLs supplied by the player.  They are first in every pool and are never
// changed by updates or by the “additional links” editor.
const ORIGINAL_TRACKS = {
  night:['https://youtu.be/P4RJxb_UgxQ?t=21213'],
  apartment:['https://www.youtube.com/watch?v=uipvZ3QdV-U'],
  club:['https://www.youtube.com/watch?v=HOMt0qKIoYc&t=764s'],
  combat:['https://youtu.be/-5i9M8LejQY?t=665'],
  badlands:['https://www.youtube.com/watch?v=3BiCleKS_3U'],
  downtown:['https://www.youtube.com/watch?v=wgko9-vqdsk']
};
// Curated tracks are additions only.  In particular, none of these replaces the original Combat link.
const ADDITIONAL_TRACKS = {
  night:['https://www.youtube.com/watch?v=hKq7kqtS9ts'],
  apartment:['https://www.youtube.com/watch?v=a4Etm90iymM','https://www.youtube.com/watch?v=cZVoLSfys6g','https://youtu.be/LLBCDkq4QjE','https://www.youtube.com/watch?v=yBoG91xuEpQ','https://www.youtube.com/watch?v=pCo1g5NQAqc'],
  club:[],
  combat:[
    'https://www.youtube.com/watch?v=gbgbvMMsySA',
    'https://www.youtube.com/watch?v=b0Qos1GemwA'
  ],
  badlands:['https://www.youtube.com/watch?v=JBTEon60wAk'],
  downtown:['https://www.youtube.com/watch?v=jneNUnOHetw']
};
const STORE = 'nightCityAmbianceAdditionalUrlsV4';
const LEGACY_STORE = 'nightCityAmbianceUrlsV3';
const SOURCE_STORE='kiroshiSceneSourcesV1';
function readSourceOverrides(){try{const saved=JSON.parse(localStorage.getItem(SOURCE_STORE)||'{}');return saved&&typeof saved==='object'&&!Array.isArray(saved)?saved:{}}catch{return {}}}
let sourceOverrides=readSourceOverrides();
function readStoredLinks() {
  let stored={};try{stored=JSON.parse(localStorage.getItem(STORE)||localStorage.getItem(LEGACY_STORE)||'{}')||{}}catch{}
  return {...stored,...Object.fromEntries(presets.map(p => [p.id, Array.isArray(stored[p.id]) ? stored[p.id] : (stored[p.id] ? [stored[p.id]] : [])]))};
}
let urls = readStoredLinks();
let player, playerReady = false, current = presets[0], desiredVolume = 28, fadeTimer, pendingRandomPlay;
let pendingRandomSeek=false, playWhenReady=false;
let activeTarget;
let transitionTimer,sceneTransition=null,transitionSerial=0;
function cancelSceneTransition(restore=false){clearInterval(transitionTimer);clearInterval(fadeTimer);sceneTransition=null;transitionSerial++;if(restore&&playerReady)player.setVolume(desiredVolume);}
function fadePlayerTo(target,duration,done){
  clearInterval(transitionTimer);const start=player.getVolume(),began=Date.now(),serial=transitionSerial;
  transitionTimer=setInterval(()=>{if(serial!==transitionSerial)return;const progress=Math.min(1,(Date.now()-began)/duration),end=typeof target==='function'?target():target;player.setVolume(Math.round(start+(end-start)*(progress*progress*(3-2*progress))));if(progress===1){clearInterval(transitionTimer);if(done)done();}},25);
}
function transitionToTarget(target){
  cancelSceneTransition();const serial=transitionSerial;
  const load=()=>{if(serial!==transitionSerial)return;sceneTransition='loading';player.setVolume(0);queueRandomPlayback(target);};
  if(player.getPlayerState()===YT.PlayerState.PLAYING){sceneTransition='out';fadePlayerTo(0,450,load);}else load();
}
const failedVideos=new Set();
const $ = s => document.querySelector(s);

function videoTarget(raw) {
  if (!raw) return null;
  try {
    const url = new URL(raw.trim());
    const list = url.searchParams.get('list');
    const embeddedId = url.pathname.match(/^\/(?:embed|shorts|live)\/([^/?]+)/)?.[1];
    const id = url.hostname.includes('youtu.be') ? url.pathname.slice(1) : (url.searchParams.get('v') || embeddedId);
    return list ? { list } : id ? { videoId:id } : null;
  } catch { return null; }
}
function setStatus(text) { $('#status').textContent = text; setTimeout(() => { $('#status').textContent = 'LINKS SAVED LOCALLY'; }, 2600); }
function showPlayerNotice(text) { $('#playerNotice').textContent = text; $('#playerNotice').hidden = false; }
function defaultSourcePool(id){return [...new Set([...(ORIGINAL_TRACKS[id]||[]),...(urls[id]||[]),...(ADDITIONAL_TRACKS[id]||[])])];}
function sourcePool(id){return Array.isArray(sourceOverrides[id])?[...sourceOverrides[id]]:defaultSourcePool(id);}
function randomTarget(id) {
  const choices = sourcePool(id).map(videoTarget).filter(target=>target&&!failedVideos.has(target.videoId));
  return choices.length ? choices[Math.floor(Math.random() * choices.length)] : null;
}
function randomStart(duration) {
  // Keep away from intros/outros while still allowing a truly different atmosphere on each switch.
  const safeEnd = Math.max(0, Math.floor(duration) - 45);
  return safeEnd > 45 ? 20 + Math.floor(Math.random() * (safeEnd - 20)) : 0;
}
function queueRandomPlayback(target) {
  activeTarget=target;
  clearInterval(fadeTimer);
  $('#playerNotice').hidden=true;
  pendingRandomSeek=false;
  if (target.list) { player.loadPlaylist({ list:target.list, listType:'playlist' }); return; }
  pendingRandomPlay = null;
  pendingRandomSeek=true;
  player.loadVideoById({videoId:target.videoId,startSeconds:0});
}
function renderPresets() {
  $('#presetGrid').innerHTML = presets.map(p => `<button type="button" class="preset ${p.id===current.id?'active':''}" data-id="${p.id}"><b>${p.name}</b><small>${p.hint}</small></button>`).join('');
  document.querySelectorAll('.preset').forEach(b => b.onclick = () => selectPreset(presets.find(p => p.id === b.dataset.id), true));
}
function updateScene() {
  $('#sceneName').textContent = current.name;
  $('#sceneCode').textContent = current.code;
  $('#trackCount').textContent = `${sourcePool(current.id).length} SOURCE${sourcePool(current.id).length === 1 ? '' : 'S'} / RANDOM START`;
  renderPresets();
}
function selectPreset(preset, autoplay = false) {
  playWhenReady=autoplay;
  pendingRandomSeek=false;
  clearInterval(fadeTimer);
  current = preset; updateScene();
  const target = randomTarget(preset.id);
  activeTarget=target;
  if (!target) {cancelSceneTransition();showPlayerNotice(`No YouTube link saved for ${preset.name}. Use MANAGE SCENE LINKS.`); if (playerReady) player.stopVideo(); $('#playText').textContent = 'PLAY'; return; }
  $('#playerNotice').hidden = true;
  if (playerReady) {
    if (autoplay) transitionToTarget(target);
    else if (target.list) player.cuePlaylist({ list:target.list, listType:'playlist' });
    else player.cueVideoById(target.videoId);
    if(!autoplay){cancelSceneTransition();player.setVolume(desiredVolume);}
  }
}
window.onYouTubeIframeAPIReady = () => {
  player = new YT.Player('ytPlayer', { height:'100%', width:'100%', playerVars:{ autoplay:0, controls:1, rel:0, modestbranding:1, origin:window.location.origin }, events:{
    onReady: e => { playerReady = true; e.target.setVolume(desiredVolume); selectPreset(current,playWhenReady); },
    onStateChange: e => {
      if(e.data===YT.PlayerState.PLAYING){
        $('#playerNotice').hidden=true;
        if(pendingRandomSeek){pendingRandomSeek=false;const duration=player.getDuration();if(duration>90)player.seekTo(randomStart(duration),true);}
        if(sceneTransition==='loading'){sceneTransition='in';fadePlayerTo(()=>desiredVolume,700,()=>{sceneTransition=null;});}
      }
      $('#playText').textContent = e.data === YT.PlayerState.PLAYING ? 'PAUSE' : 'PLAY';
      $('#playIcon').textContent = e.data === YT.PlayerState.PLAYING ? 'Ⅱ' : '▶';
    },
    onError: e => {
      pendingRandomSeek=false;
      if([2,100,101,150].includes(e.data)){
        const id=player.getVideoData()?.video_id||activeTarget?.videoId;if(id)failedVideos.add(id);
        const alternative=randomTarget(current.id);
        if(alternative&&alternative.videoId!==id){setStatus('SOURCE UNAVAILABLE — TRYING NEXT');transitionToTarget(alternative);return;}
      }
      const messages = { 2:'YouTube rejected this link. Check the URL.', 5:'This video cannot play in the embedded player.', 100:'This video is unavailable.', 101:'The video owner has disabled embedding.', 150:'The video owner has disabled embedding.', 153:'YouTube requires the local launcher—close this page and use Start Night City HUD.cmd.' };
      cancelSceneTransition(true);showPlayerNotice(messages[e.data] || `YouTube player error ${e.data}. Try a different public video.`);
      setStatus(`YOUTUBE ERROR ${e.data}`);
    },
    onAutoplayBlocked:()=>{pendingRandomSeek=false;cancelSceneTransition(true);setStatus('PRESS PLAY IN THE YOUTUBE PLAYER');$('#playerNotice').hidden=true;}
  }});
};
$('#playPause').onclick = () => {
  const target = randomTarget(current.id);
  if(!target)return setStatus('NO AVAILABLE SOURCE — ADD ANOTHER LINK');
  if(!playerReady){playWhenReady=true;return setStatus('YOUTUBE IS LOADING — PLAY QUEUED');}
  const state = player.getPlayerState();
  if(sceneTransition){cancelSceneTransition(true);queueRandomPlayback(target);return;}
  if (state === YT.PlayerState.PLAYING) player.pauseVideo();
  else {
    player.setVolume(desiredVolume);
    if (state === YT.PlayerState.CUED || state === -1) {
      queueRandomPlayback(target);
    } else player.playVideo();
  }
};
$('#volume').oninput = e => { desiredVolume = +e.target.value; $('#volumeValue').textContent = desiredVolume + '%'; if (playerReady&&!sceneTransition) player.setVolume(desiredVolume); };
$('#fadeOut').onclick = () => {
  if (!playerReady || player.getPlayerState() !== YT.PlayerState.PLAYING) return setStatus('NOTHING IS PLAYING');
  cancelSceneTransition(); const start = player.getVolume(); let v = start;
  fadeTimer = setInterval(() => { v -= Math.max(1, Math.ceil(start / 30)); player.setVolume(Math.max(0,v)); if (v <= 0) { clearInterval(fadeTimer); player.pauseVideo(); player.setVolume(desiredVolume); setStatus('FADED OUT'); } }, 100);
};
function escapeEditor(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function validSource(raw){try{const url=new URL(raw),target=videoTarget(raw);return ['https:','http:'].includes(url.protocol)&&(['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com','youtu.be','www.youtu.be'].includes(url.hostname))&&!!target&&(target.list?/^[A-Za-z0-9_-]{10,}$/.test(target.list):/^[A-Za-z0-9_-]{11}$/.test(target.videoId))}catch{return false}}
function saveSourceEdits(fields){
  const next={...sourceOverrides};
  for(const field of fields){
    const links=[...new Set(field.value.split(/\r?\n/).map(value=>value.trim()).filter(Boolean))];
    if(links.some(link=>!validSource(link)))throw Error('Check '+(presets.find(p=>p.id===field.dataset.id)?.name||field.dataset.id)+': enter public YouTube video or playlist links, one per line.');
    if(JSON.stringify(links)!==JSON.stringify(sourcePool(field.dataset.id)))next[field.dataset.id]=links;
  }
  localStorage.setItem(SOURCE_STORE,JSON.stringify(next));
  sourceOverrides=next;
}
function renderEditor(){
  $('#editorMessage').textContent='';
  $('#urlFields').innerHTML=presets.map(p=>`<label class="url-field">${escapeEditor(p.name)}<small>Add, replace, or delete links below. Empty means no playback for this scene.</small><textarea data-id="${p.id}" aria-label="${escapeEditor(p.name)} links" rows="4" placeholder="One YouTube URL per line">${escapeEditor(sourcePool(p.id).join('\n'))}</textarea><button type="button" class="reset-scene" data-reset="${p.id}">RESTORE BUILT-IN LINKS</button></label>`).join('');
}
$('#urlFields').addEventListener('click',event=>{const button=event.target.closest('[data-reset]');if(!button)return;event.preventDefault();const id=button.dataset.reset;const field=Array.from(document.querySelectorAll('.url-field textarea')).find(item=>item.dataset.id===id);if(field)field.value=[...(ORIGINAL_TRACKS[id]||[]),...(ADDITIONAL_TRACKS[id]||[])].join('\n');});
$('#openEditor').onclick = () => { renderEditor(); $('#editor').showModal(); };
$('#cancelEditor').onclick = () => $('#editor').close();
$('#editorForm').onsubmit = e => {
  e.preventDefault();
  try{saveSourceEdits(document.querySelectorAll('.url-field textarea'));}
  catch(error){$('#editorMessage').textContent=error.name==='QuotaExceededError'?'Browser storage is full. Changes were not saved.':error.message;return;}
  failedVideos.clear();$('#editor').close();setStatus('SCENE LINKS SAVED');updateScene();if(playerReady)selectPreset(current);
};
$('#copyTag').onclick = async () => { try { await navigator.clipboard.writeText(current.code); setStatus('TAG COPIED'); } catch { setStatus(current.code); } };
updateScene();

// The deck shell sends real mode changes here. Leaving ambience pauses the actual
// YouTube engine; returning never fabricates a playback state.
const MODE_KEY = 'kiroshiAudioDeckModeV10';
function applyDeckMode(mode, persist = true) {
  if (!['voice', 'ambience', 'both'].includes(mode)) return;
  if (persist) localStorage.setItem(MODE_KEY, mode);
  document.body.dataset.deckMode = mode;
  document.querySelectorAll('[data-mode]').forEach(button => {
    const active = button.dataset.mode === mode;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  if (mode === 'voice' && playerReady && player.getPlayerState() === YT.PlayerState.PLAYING) {
    cancelSceneTransition(true);
    player.pauseVideo();
    setStatus('AMBIENCE PAUSED — VOICE MODE');
  }
}
document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => {
  applyDeckMode(button.dataset.mode);
  if (window.parent !== window) window.parent.postMessage({ type: 'kiroshi-deck-mode', mode: button.dataset.mode }, '*');
}));
window.addEventListener('message', event => {
  const data = event.data;
  if (data && data.type === 'kiroshi-deck-mode') applyDeckMode(data.mode);
});
applyDeckMode(localStorage.getItem(MODE_KEY) || 'both', false);

const RELEASE_VERSION = '10.0.1';
const RELEASE_API = 'https://api.github.com/repos/sokkgInc/kiroshi-audio-deck/releases/latest';
function versionParts(version) { return String(version).replace(/^v/, '').split('.').map(Number); }
function isNewerVersion(remote, local) { const a=versionParts(remote), b=versionParts(local); return a.some((n,i)=>n>(b[i]||0)) && !a.some((n,i)=>n<(b[i]||0)); }
const updateButton = document.getElementById('updateButton');
if (updateButton) updateButton.addEventListener('click', async () => {
  updateButton.disabled = true; updateButton.textContent = 'CHECKING…';
  try {
    const response = await fetch(RELEASE_API, { headers: { accept: 'application/vnd.github+json' } });
    const release = await response.json(); if (!response.ok) throw new Error('Release check unavailable');
    if (isNewerVersion(release.tag_name, RELEASE_VERSION)) {
      const asset=(release.assets||[]).find(item=>item.name==='Kiroshi_Audio_Deck_Update.zip');
      if (!asset) throw new Error('Update package unavailable');
      updateButton.textContent='DOWNLOAD '+release.tag_name.toUpperCase(); updateButton.onclick=()=>window.open(asset.browser_download_url,'_blank','noopener');
      setStatus('UPDATE '+release.tag_name.toUpperCase()+' READY');
    } else { updateButton.textContent='UP TO DATE'; setStatus('KIROSHI '+RELEASE_VERSION+' IS CURRENT'); }
  } catch { updateButton.textContent='RETRY UPDATE CHECK'; setStatus('UPDATE CHECK UNAVAILABLE'); }
  finally { updateButton.disabled = false; }
});
