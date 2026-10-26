(()=>{
  'use strict';
  const voice=location.port==='3131';
  const query=new URLSearchParams(location.hash.slice(1));
  const embedded=query.get('embed')==='1';
  const requested=query.get('mode');
  const valid=m=>['voice','ambience','both'].includes(m);
  const saved=localStorage.getItem('kiroshiAudioDeckModeV10');
  const mode=valid(requested)?requested:(voice?(valid(saved)?saved:'both'):'ambience');
  const urlFor=m=>m==='ambience'?'http://127.0.0.1:48721/#mode=ambience':'http://127.0.0.1:3131/#mode='+m;
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
  emblem.innerHTML='<svg viewBox="0 0 100 75" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="5"><path d="M50 59V30M50 59L23 32M50 59L77 32"/><circle cx="50" cy="17" r="12"/><circle cx="17" cy="23" r="12"/><circle cx="83" cy="23" r="12"/></g></svg><span>ARASAKA</span>';
  const header=document.querySelector(voice?'.masthead':'.topbar');if(header)header.append(emblem);
  document.querySelectorAll('[data-mode]').forEach(button=>{button.classList.toggle('active',button.dataset.mode===mode);button.setAttribute('aria-pressed',String(button.dataset.mode===mode));});
  // Capture the navigation before the legacy panel toggle handles the click.
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-mode]');if(!button||embedded)return;
    event.preventDefault();event.stopImmediatePropagation();
    const next=button.dataset.mode;if(!valid(next))return;
    localStorage.setItem('kiroshiAudioDeckModeV10',next);
    if(typeof stopSpeechForMode==='function')stopSpeechForMode();
    if(!voice&&typeof playerReady!=='undefined'&&playerReady)player.pauseVideo();
    const target=urlFor(next);if(new URL(target).origin===location.origin){location.hash='mode='+next;location.reload();}else location.assign(target);
  },true);
  if(voice){
    const frame=document.getElementById('ambienceFrame');if(frame)frame.src='http://127.0.0.1:48721/#embed=1';
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
