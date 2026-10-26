(()=>{
  'use strict';
  const voice=location.port==='3131';
  const query=new URLSearchParams(location.hash.slice(1));
  const embedded=query.get('embed')==='1';
  const requested=query.get('mode');
  const valid=m=>['voice','ambience','both'].includes(m);
  const saved=localStorage.getItem('kiroshiAudioDeckModeV10');
  const mode=valid(requested)?requested:(voice?(valid(saved)?saved:'both'):'ambience');
  const clampGlass=value=>Math.max(20,Math.min(85,Number(value)||42));
  let glass=clampGlass(query.get('glass')||localStorage.getItem('kiroshiHudGlassV1')||42);
  const urlFor=m=>(m==='ambience'?'http://127.0.0.1:48721/#mode=ambience':'http://127.0.0.1:3131/#mode='+m)+'&glass='+glass;
  if(!embedded&&voice&&mode==='ambience'){location.replace(urlFor(mode));return;}
  document.body.classList.add('page-deck');
  document.body.classList.toggle('embedded-deck',embedded);
  document.body.dataset.deckMode=embedded?'both':mode;
  if(embedded){
    const measure=()=>window.parent.postMessage({type:'kiroshi-content-height',height:Math.ceil(document.querySelector('main').getBoundingClientRect().height)+8},'http://127.0.0.1:3131');
    new ResizeObserver(measure).observe(document.querySelector('main'));window.addEventListener('load',measure);
  }
  if(!embedded)localStorage.setItem('kiroshiAudioDeckModeV10',mode);
  const sheet=document.createElement('link');sheet.rel='stylesheet';sheet.href=voice?'/deck-pages.css':'deck-pages.css';document.head.append(sheet);
  const emblem=document.createElement('div');emblem.className='arasaka';emblem.setAttribute('aria-label','Arasaka');
  emblem.innerHTML='<svg viewBox="0 0 120 100" aria-hidden="true"><defs><linearGradient id="arasaka-metal" x1="0" y1="0" x2="0.8" y2="1"><stop stop-color="#ff6575"/><stop offset=".5" stop-color="#d93850"/><stop offset="1" stop-color="#86283b"/></linearGradient></defs><path class="emblem-brackets" d="M7 24V9h17M96 9h17v15M7 76v15h17M96 91h17V76" fill="none" stroke="#48717c" stroke-width="1"/><g fill="none" stroke="url(#arasaka-metal)" stroke-width="6" stroke-linecap="square" stroke-linejoin="miter"><path d="M60 78V35M60 69L26 46M60 69L94 46M44 84h32"/><circle cx="60" cy="21" r="13"/><circle cx="24" cy="32" r="13"/><circle cx="96" cy="32" r="13"/></g><path d="M60 4V0M0 50h5M115 50h5" stroke="#51b8c5" stroke-width="1"/></svg><span>ARASAKA</span><small>SECURITY SYSTEMS</small>';
  const header=document.querySelector(voice?'.masthead':'.topbar');if(header)header.append(emblem);
  const applyGlass=value=>{glass=clampGlass(value);document.documentElement.style.setProperty('--hud-glass',String(glass/100));localStorage.setItem('kiroshiHudGlassV1',String(glass));const frame=document.getElementById('ambienceFrame');if(frame?.contentWindow)frame.contentWindow.postMessage({type:'kiroshi-glass',value:glass},'http://127.0.0.1:48721');};
  applyGlass(glass);
  if(embedded){window.addEventListener('message',event=>{if(event.origin==='http://127.0.0.1:3131'&&event.source===window.parent&&event.data?.type==='kiroshi-glass')applyGlass(event.data.value);});}
  else{const appearance=document.createElement('div');appearance.className='hud-appearance';appearance.innerHTML='<span>OPTICAL LAYER <i>ACTIVE</i></span><label>PANEL OPACITY <input type="range" min="20" max="85" step="1" value="'+glass+'" aria-label="Panel opacity"><output>'+glass+'%</output></label>';document.querySelector(voice?'.deck-mode':'.mode-switch')?.after(appearance);appearance.querySelector('input').addEventListener('input',event=>{applyGlass(event.target.value);appearance.querySelector('output').textContent=glass+'%';});}
  document.querySelectorAll('[data-mode]').forEach(button=>{button.classList.toggle('active',button.dataset.mode===mode);button.setAttribute('aria-pressed',String(button.dataset.mode===mode));});
  // Capture the navigation before the legacy panel toggle handles the click.
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-mode]');if(!button||embedded)return;
    event.preventDefault();event.stopImmediatePropagation();
    const next=button.dataset.mode;if(!valid(next))return;
    localStorage.setItem('kiroshiAudioDeckModeV10',next);
    if(typeof stopSpeechForMode==='function')stopSpeechForMode();
    if(!voice&&typeof playerReady!=='undefined'&&playerReady)player.pauseVideo();
    const target=urlFor(next);if(new URL(target).origin===location.origin){location.hash='mode='+next+'&glass='+glass;location.reload();}else location.assign(target);
  },true);
  if(voice){
    const frame=document.getElementById('ambienceFrame');if(frame)frame.src='http://127.0.0.1:48721/#embed=1&glass='+glass;
    window.addEventListener('message',event=>{if(event.origin!=='http://127.0.0.1:48721'||event.source!==frame?.contentWindow)return;const data=event.data;if(data?.type==='kiroshi-content-height'&&Number.isFinite(data.height))frame.style.height=Math.min(20000,Math.max(300,data.height))+'px';});
    const root=document.querySelector('.deck-root');
    const voiceDeck=document.getElementById('voiceDeck'),ambienceDeck=document.getElementById('ambienceDeck');
    const workspace=document.createElement('div');workspace.className='page-workspace';root.insertBefore(workspace,voiceDeck);workspace.append(ambienceDeck,voiceDeck);
    const settings=document.querySelector('.settings');
    if(settings){const details=document.createElement('details');details.className='voice-profiles';details.innerHTML='<summary>VOICE PROFILES &amp; TUNING <span>CONFIGURE ＋</span></summary>';settings.before(details);details.append(settings);}
    if(query.get('updates')==='1')document.getElementById('updatesOpen')?.click();
  }else if(!embedded){
    const button=document.getElementById('updateButton');if(button){button.textContent='UPDATES';button.className='update-launch';button.id='ambienceUpdatesOpen';button.replaceWith(button.cloneNode(true));document.getElementById('ambienceUpdatesOpen').onclick=()=>location.assign('http://127.0.0.1:3131/#mode=voice&updates=1');}
  }
})();
