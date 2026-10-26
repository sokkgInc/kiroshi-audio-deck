const $ = id => document.getElementById(id); let current = [], stopped = false, autoRead = false, lastClaudeVersion = Number(localStorage.getItem("rpgVoiceLastClaudeVersion")) || 0, speaking = false;
const hud = /^(?:>|\[?(?:hud|status|inventory|hp|health|cred|credits|cash|cash\s+balance|balance|wallet|eddies|eurodollars|xp|quest|location|time|ooc|biomon|biomonitor|ram)\b|[$€]\s*\d|[-_=*]{3,})/i;
const gameRoll = /^[A-Z][A-Z0-9 _-]+\s+—\s+.*\b(?:d\d+|success|failure|critical)\b/i;
function parse(input) {
  let fenced = false; const lines = [];
  for (const raw of input.split(/\r?\n/)) {
    const line = raw.trim(); if (line.startsWith("```")) { fenced = !fenced; continue; }
    let plain = line.replace(/^`+|`+\\?$/g, "").trim();
    const speaker = plain.match(/^(narrator|nova\s+lux|sparks|rosa|juno)\s*(?::|—|-)?\s*/i);
    const role = speaker && ({ narrator: "narrator", "nova lux": "nova", sparks: "sparks", rosa: "rosa", juno: "juno" })[speaker[1].toLowerCase()];
    if (speaker) plain = plain.slice(speaker[0].length).trim();
    if (fenced || !plain || hud.test(plain) || gameRoll.test(plain) || /^\s*(?:assistant|user|system|ooc)\s*:/i.test(plain) || /^(?:quick reactions available|press tab until focus|escape to return)/i.test(plain)) continue;
    lines.push({ role: role || "narrator", text: plain.replace(/^#{1,6}\s*/, "") });
  }
  return lines;
}
function render() { $("queue").innerHTML = current.length ? current.map(x => `<li><b>${x.role.toUpperCase()}</b>${escapeHtml(x.text)}</li>`).join("") : "<li>Nothing to read after filtering.</li>"; }
function escapeHtml(s) { const d=document.createElement("div"); d.textContent=s; return d.innerHTML; }
$("preview").onclick = () => { current = parse($("source").value); render(); $("status").textContent = `${current.length} spoken line${current.length === 1 ? "" : "s"} ready.`; };
$("stop").onclick = () => { stopped = true; document.querySelectorAll("audio").forEach(a => { a.pause(); a.remove(); }); $("status").textContent = "Stopped."; };
$("findKatie").onclick = async () => { try { const r=await fetch("/api/voices?q=katie"); const d=await r.json(); if (!r.ok) throw Error(d.error); $("voices").innerHTML = (d.voices||[]).map(v => `<button class="voice" data-id="${v.id}">${escapeHtml(v.name)}<small>${v.id}</small></button>`).join("") || "No matching voice found."; document.querySelectorAll(".voice").forEach(b => b.onclick=()=> $("nova").value=b.dataset.id); } catch(e) { $("status").textContent=e.message; } };
async function speak(lines) { try { if (speaking) return; speaking = true; const r=await fetch("/api/speak", {method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({lines,voices:{narrator:$("narrator").value.trim(),nova:$("nova").value.trim(),sparks:$("sparks").value.trim(),rosa:$("rosa").value.trim(),juno:$("juno").value.trim()},speeds:{narrator:$("narratorSpeed").value,nova:$("novaSpeed").value,sparks:$("sparksSpeed").value,rosa:$("rosaSpeed").value,juno:$("junoSpeed").value},emotions:{narrator:$("narratorMood").value},accents:{}})}); const d=await r.json(); if (!r.ok) throw Error(d.error); stopped=false; for (const line of d.lines) { if(stopped) break; $("status").textContent=`Playing ${line.role}…`; const audio=new Audio(`data:audio/wav;base64,${line.audio}`); await new Promise((resolve,reject)=>{audio.onended=resolve;audio.onerror=reject;audio.play().catch(reject)}); } if(!stopped) $("status").textContent="Finished."; } catch(e) { $("status").textContent=e.message; } finally { speaking = false; } }
$("play").onclick = async () => { if (!current.length) { current=parse($("source").value); render(); } await speak(current); };
$("auto").onclick = async () => { autoRead = !autoRead; $("auto").textContent = autoRead ? "Auto-read enabled" : "Enable auto-read"; if (autoRead) { try { const latest = await (await fetch("/api/claude/latest")).json(); lastClaudeVersion = latest.version; localStorage.setItem("rpgVoiceLastClaudeVersion", String(lastClaudeVersion)); } catch {} $("status").textContent = "Armed for the next completed Claude reply…"; } else $("status").textContent = "Auto-read paused."; };
setInterval(async () => { if (!autoRead || speaking) return; try { const r = await fetch("/api/claude/latest"); const latest = await r.json(); if (latest.version > lastClaudeVersion) { lastClaudeVersion = latest.version; localStorage.setItem("rpgVoiceLastClaudeVersion", String(lastClaudeVersion)); $("source").value = latest.text; current = parse(latest.text); render(); if (current.length) await speak(current); } } catch {} }, 1200);
fetch("/api/status").then(r=>r.json()).then(d=>$("service").textContent=d.ready ? "Cartesia key detected — ready to test." : "Set CARTESIA_API_KEY to enable live speech.").catch(()=>$("service").textContent="Local service unavailable.");

const DECK_MODE_KEY='kiroshiAudioDeckModeV10';
function stopSpeechForMode(){stopped=true;document.querySelectorAll('audio').forEach(a=>{a.pause();a.remove();});}
function setDeckMode(mode,persist=true){if(!['voice','ambience','both'].includes(mode))return;if(persist)localStorage.setItem(DECK_MODE_KEY,mode);document.body.dataset.deckMode=mode;document.querySelectorAll('[data-mode]').forEach(button=>{const active=button.dataset.mode===mode;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});$('modeReadout').textContent=mode==='both'?'BOTH CHANNELS ARMED':mode==='voice'?'VOICE CHANNEL ACTIVE':'AMBIENCE CHANNEL ACTIVE';if(mode==='ambience')stopSpeechForMode();const frame=$('ambienceFrame');if(frame&&frame.contentWindow)frame.contentWindow.postMessage({type:'kiroshi-deck-mode',mode},'*');}
document.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',()=>setDeckMode(button.dataset.mode)));
window.addEventListener('message',event=>{if(event.data&&event.data.type==='kiroshi-deck-mode')setDeckMode(event.data.mode);});
$('ambienceFrame').addEventListener('load',()=>setDeckMode(localStorage.getItem(DECK_MODE_KEY)||'both',false));setDeckMode(localStorage.getItem(DECK_MODE_KEY)||'both',false);

const RELEASE_VERSION='10.0.1',RELEASE_API='https://api.github.com/repos/sokkgInc/kiroshi-audio-deck/releases/latest';
const updateButton=$('updateButton');
function newer(remote,local){const a=String(remote).replace(/^v/,'').split('.').map(Number),b=String(local).split('.').map(Number);return a.some((n,i)=>n>(b[i]||0))&&!a.some((n,i)=>n<(b[i]||0));}
updateButton.addEventListener('click',async()=>{updateButton.disabled=true;updateButton.textContent='CHECKING…';try{const r=await fetch(RELEASE_API,{headers:{accept:'application/vnd.github+json'}}),release=await r.json();if(!r.ok)throw Error();if(newer(release.tag_name,RELEASE_VERSION)){const asset=(release.assets||[]).find(item=>item.name==='Kiroshi_Audio_Deck_Update.zip');if(!asset)throw Error();updateButton.textContent='DOWNLOAD '+release.tag_name.toUpperCase();updateButton.onclick=()=>window.open(asset.browser_download_url,'_blank','noopener');$('status').textContent='UPDATE '+release.tag_name.toUpperCase()+' READY';}else{updateButton.textContent='UP TO DATE';$('status').textContent='KIROSHI '+RELEASE_VERSION+' IS CURRENT';}}catch{updateButton.textContent='RETRY UPDATE CHECK';$('status').textContent='UPDATE CHECK UNAVAILABLE';}finally{updateButton.disabled=false;}});
