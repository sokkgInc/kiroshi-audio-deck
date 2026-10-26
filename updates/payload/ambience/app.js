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
  night:['https://www.youtube.com/watch?v=jneNUnOHetw','https://www.youtube.com/watch?v=iNq7OmoER_s'],
  apartment:['https://www.youtube.com/watch?v=a4Etm90iymM','https://www.youtube.com/watch?v=cZVoLSfys6g','https://youtu.be/LLBCDkq4QjE','https://www.youtube.com/watch?v=yBoG91xuEpQ'],
  club:[],
  combat:[
    'https://youtu.be/255tviwqYCA',
    'https://www.youtube.com/watch?v=gbgbvMMsySA',
    'https://www.youtube.com/watch?v=b0Qos1GemwA'
  ],
  badlands:['https://www.youtube.com/watch?v=JBTEon60wAk'],
  downtown:['https://www.youtube.com/watch?v=jneNUnOHetw']
};
const STORE = 'nightCityAmbianceAdditionalUrlsV4';
const LEGACY_STORE = 'nightCityAmbianceUrlsV3';
function readStoredLinks() {
  const stored = JSON.parse(localStorage.getItem(STORE) || localStorage.getItem(LEGACY_STORE) || '{}');
  return Object.fromEntries(presets.map(p => [p.id, Array.isArray(stored[p.id]) ? stored[p.id] : (stored[p.id] ? [stored[p.id]] : [])]));
}
let urls = readStoredLinks();
let player, playerReady = false, current = presets[0], desiredVolume = 55, fadeTimer, pendingRandomPlay;
const $ = s => document.querySelector(s);

function videoTarget(raw) {
  if (!raw) return null;
  try {
    const url = new URL(raw.trim());
    const list = url.searchParams.get('list');
    const embeddedId = url.pathname.match(/^\/embed\/([^/?]+)/)?.[1];
    const id = url.hostname.includes('youtu.be') ? url.pathname.slice(1) : (url.searchParams.get('v') || embeddedId);
    return list ? { list } : id ? { videoId:id } : null;
  } catch { return null; }
}
function setStatus(text) { $('#status').textContent = text; setTimeout(() => { $('#status').textContent = 'LINKS SAVED LOCALLY'; }, 2600); }
function showPlayerNotice(text) { $('#playerNotice').textContent = text; $('#playerNotice').hidden = false; }
function sourcePool(id) { return [...new Set([...ORIGINAL_TRACKS[id], ...urls[id], ...ADDITIONAL_TRACKS[id]])]; }
function randomTarget(id) {
  const choices = sourcePool(id).map(videoTarget).filter(Boolean);
  return choices.length ? choices[Math.floor(Math.random() * choices.length)] : null;
}
function randomStart(duration) {
  // Keep away from intros/outros while still allowing a truly different atmosphere on each switch.
  const safeEnd = Math.max(0, Math.floor(duration) - 45);
  return safeEnd > 45 ? 20 + Math.floor(Math.random() * (safeEnd - 20)) : 0;
}
function queueRandomPlayback(target) {
  if (target.list) { player.loadPlaylist({ list:target.list, listType:'playlist' }); return; }
  pendingRandomPlay = target;
  player.cueVideoById(target.videoId);
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
  current = preset; updateScene();
  const target = randomTarget(preset.id);
  if (!target) { showPlayerNotice(`No YouTube link saved for ${preset.name}. Use EDIT YOUTUBE LINKS.`); if (playerReady) player.stopVideo(); $('#playText').textContent = 'PLAY'; return; }
  $('#playerNotice').hidden = true;
  if (playerReady) {
    if (autoplay) queueRandomPlayback(target);
    else if (target.list) player.cuePlaylist({ list:target.list, listType:'playlist' });
    else player.cueVideoById(target.videoId);
    player.setVolume(desiredVolume);
  }
}
window.onYouTubeIframeAPIReady = () => {
  player = new YT.Player('ytPlayer', { height:'100%', width:'100%', playerVars:{ autoplay:0, controls:1, rel:0, modestbranding:1, origin:window.location.origin }, events:{
    onReady: e => { playerReady = true; e.target.setVolume(desiredVolume); selectPreset(current); },
    onStateChange: e => {
      if (e.data === YT.PlayerState.CUED && pendingRandomPlay) {
        const target = pendingRandomPlay;
        pendingRandomPlay = null;
        player.loadVideoById({ videoId:target.videoId, startSeconds:randomStart(player.getDuration()) });
        return;
      }
      $('#playText').textContent = e.data === YT.PlayerState.PLAYING ? 'PAUSE' : 'PLAY';
      $('#playIcon').textContent = e.data === YT.PlayerState.PLAYING ? 'Ⅱ' : '▶';
    },
    onError: e => {
      const messages = { 2:'YouTube rejected this link. Check the URL.', 5:'This video cannot play in the embedded player.', 100:'This video is unavailable.', 101:'The video owner has disabled embedding.', 150:'The video owner has disabled embedding.', 153:'YouTube requires the local launcher—close this page and use Start Night City HUD.cmd.' };
      showPlayerNotice(messages[e.data] || `YouTube player error ${e.data}. Try a different public video.`);
      setStatus(`YOUTUBE ERROR ${e.data}`);
    }
  }});
};
$('#playPause').onclick = () => {
  const target = randomTarget(current.id);
  if (!playerReady || !target) return setStatus('ADD A YOUTUBE LINK FIRST');
  const state = player.getPlayerState();
  if (state === YT.PlayerState.PLAYING) player.pauseVideo();
  else {
    player.setVolume(desiredVolume);
    if (state === YT.PlayerState.CUED || state === -1) {
      queueRandomPlayback(target);
    } else player.playVideo();
  }
};
$('#volume').oninput = e => { desiredVolume = +e.target.value; $('#volumeValue').textContent = desiredVolume + '%'; if (playerReady) player.setVolume(desiredVolume); };
$('#fadeOut').onclick = () => {
  if (!playerReady || player.getPlayerState() !== YT.PlayerState.PLAYING) return setStatus('NOTHING IS PLAYING');
  clearInterval(fadeTimer); const start = player.getVolume(); let v = start;
  fadeTimer = setInterval(() => { v -= Math.max(1, Math.ceil(start / 30)); player.setVolume(Math.max(0,v)); if (v <= 0) { clearInterval(fadeTimer); player.pauseVideo(); player.setVolume(desiredVolume); setStatus('FADED OUT'); } }, 100);
};
function renderEditor() {
  $('#urlFields').innerHTML = presets.map(p => `<label class="url-field">${p.name}<small>Original link is locked in. Add extra URLs below, one per line.</small><textarea data-id="${p.id}" rows="3" placeholder="Optional additional YouTube URL(s)">${urls[p.id].join('\n')}</textarea></label>`).join('');
}
$('#openEditor').onclick = () => { renderEditor(); $('#editor').showModal(); };
$('#cancelEditor').onclick = () => $('#editor').close();
$('#editorForm').onsubmit = e => {
  e.preventDefault();
  document.querySelectorAll('.url-field textarea').forEach(i => urls[i.dataset.id] = i.value.split(/\r?\n/).map(value => value.trim()).filter(Boolean));
  localStorage.setItem(STORE, JSON.stringify(urls));
  $('#editor').close(); setStatus('ADDITIONAL YOUTUBE LINKS SAVED'); if (playerReady) selectPreset(current);
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
