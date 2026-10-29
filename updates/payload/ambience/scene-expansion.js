/* Kiroshi Atmosphere Atlas v9.1.0
 * Data/UI extension for the original YouTube IFrame player.
 * The six original presets, player, volumes, URLs and stored user links are untouched.
 * These are curated online videos, not synthetic/generated audio. Availability depends on YouTube.
 */
(()=>{
  "use strict";
  const groups = [
    ["streets","STREETS"],["interiors","INTERIORS"],["nightlife","NIGHTLIFE"],
    ["transit","TRANSIT"],["outskirts","OUTSKIRTS"],["danger","HIGH ALERT"]
  ];
  // All URLs use identified public YouTube video IDs. Specific settings are atmosphere
  // selections, not claims that audio was recorded at a real-world location.
  const atlas = [
    ["kabuki","KABUKI MARKET","HAWKERS / BAZAAR / CHATTER","streets","NYHN6HUxKnQ"],
    ["japantown","JAPANTOWN","ADVERTS / FOOTSTEPS / AIR TRAFFIC","streets","JYc_cOvPfz4"],
    ["alley","RAINY ALLEYWAY","NIGHT CITY / RAIN / ALLEY","streets","ZNwtLMv5rrA"],
    ["foodstall","LATE-NIGHT RAMEN","AWNING RAIN / NEON / LO-FI","streets","UkhoVwz3FoI"],
    ["rooftop","ROOFTOP SHELTER","RAIN / SKYLINE / TRAFFIC","streets","hruZzkUPF08"],
    ["districtwalk","CITY DISTRICTS","LONG WALK / MANY NEIGHBORHOODS","streets","tUNQL3KVUqA"],
    ["judyapt","RAINY APARTMENT","WINDOW RAIN / INDOORS / REST","interiors","NXfcw3HHd-c"],
    ["cybercafe","CYBER CAFE","NEON RAIN / QUIET TABLES / DEEP REST","interiors","5QH6iPGN1OQ"],
    ["controlroom","RAINY CONTROL ROOM","CONSOLE HUM / STORM / FOCUS","interiors","878qiuOtQM4"],
    ["arcade","ARCADE","MACHINES / BEEPS / CROWD MURMUR","interiors","iMi7MC6ntpk","wpq1D3Jayvc","9hyvP37QZUE"],
    ["hacker","NETRUNNER DEN","STATIC / TERMINALS / ELECTRONICS","interiors","4W_WW2Yase4"],
    ["hideout","HIDDEN SAFEHOUSE","QUIET / SCREENS / CITY RAIN","interiors","CKpSc0LB3DI"],
    ["skybridge","SKYBRIDGE DRONE","SYNTHWAVE / CALM DRONE / SLEEP","interiors","Eq2uAtvHQ3c"],
    ["warehouse","WAREHOUSE DOCK","RAIN / INDUSTRIAL / PORT","interiors","h0j2COERtjA"],
    ["lizzies","LIZZIE'S BAR","CROWD / BASS / BAR SOUNDS","nightlife","NXCUJ2-n8Tk"],
    ["konpeki","LUXURY HOTEL BAR","LOUNGE / DRINKS / CORPO MUSIC","nightlife","KdLv_hlfoWs"],
    ["underground","UNDERGROUND CLUB","BASS / DARK SYNTH / NIGHTLIFE","nightlife","_hPOtH3vVsc"],
    ["metro","NCART METRO","TRAIN RIDE / RAIN / CITY","transit","k9DuPxFQ7HQ"],
    ["nightdrive","RAINY NIGHT DRIVE","FIRST-PERSON DRIVE / NIGHT CITY / RAIN","transit","crJLuExSD5M"],
    ["busstop","JUNKYARD BUS STOP","WIND / DISTANT CITY / WAITING","transit","Cyq4s6gFx_o"],
    ["aerodyne","FUTURISTIC COCKPIT","SCI-FI / COCKPIT / SLEEP AMBIENCE","transit","j5wWSKqlYp8"],
    ["nomad","NOMAD CAMP","CAMPFIRE / GUITAR / CRICKETS","outskirts","ip-j8dCJ6dY"],
    ["junkyard","SCRAPYARD","SALVAGE / METAL / WASTELAND","outskirts","riaRLSTk2jk"],
    ["evac","BEHIND THE BLACK WALL","DARK AMBIENT MUSIC / TEAFORONE","danger","255tviwqYCA"]
  ];
  const oldCategory = {night:"streets",apartment:"interiors",club:"nightlife",combat:"danger",badlands:"outskirts",downtown:"streets"};
  for (const [id,name,hint,category,...videoIds] of atlas) {
    if (presets.some(p=>p.id===id)) continue;
    presets.push({id,name,code:"AMBIENCE: "+id.toUpperCase(),hint,category});
    ORIGINAL_TRACKS[id] = [];
    ADDITIONAL_TRACKS[id] = videoIds.map(vid=>"https://www.youtube.com/watch?v="+vid);
  }
  for (const p of presets) p.category ||= oldCategory[p.id] || "streets";
  // readStoredLinks() ran before atlas was registered. Hydrate new preset links now.
  let stored={};
  try {stored=JSON.parse(localStorage.getItem(STORE)||localStorage.getItem(LEGACY_STORE)||"{}")||{}} catch {}
  for (const [id] of atlas) {
    const value=stored[id];
    urls[id]=Array.isArray(value)?value:(typeof value==="string"&&value?[value]:[]);
  }
  // Retire misleading/duplicate built-ins without deleting anyone's saved links.
  const retired={bazaar:['BLACK MARKET','streets'],westbrook:['WESTBROOK','streets'],dogtown:['DOGTOWN','streets'],waterfront:['WATERFRONT','streets'],server:['SERVER ROOM','interiors'],medtech:['MEDTECH LAB','interiors'],clubexterior:['OUTSIDE THE CLUB','nightlife'],powerstation:['ABANDONED STATION','outskirts'],wasteland:['WASTELAND','outskirts'],raids:['GANG TERRITORY','danger'],stealth:['CORPO INFILTRATION','danger']};
  for(const [id,[name,category]] of Object.entries(retired)){
    const value=stored[id];const saved=Array.isArray(value)?value:(typeof value==='string'&&value?[value]:[]);
    if(!saved.length)continue;
    presets.push({id,name:name+' (SAVED)',code:'AMBIENCE: '+id.toUpperCase(),hint:'YOUR SAVED SOURCES',category});
    urls[id]=saved;ORIGINAL_TRACKS[id]=[];ADDITIONAL_TRACKS[id]=[];
  }
  const grid=document.getElementById("presetGrid");
  if (!grid) return;
  const toolbar=document.createElement("div");
  toolbar.className="atlas-toolbar";
  toolbar.innerHTML='<div class="atlas-top"><span class="atlas-kicker">ENVIRONMENT LIBRARY <strong id="atlasCount"></strong></span><label class="atlas-search"><span>SEARCH</span><input id="atlasSearch" type="search" placeholder="Find a scene..." autocomplete="off" aria-label="Search ambience scenes"></label></div><div class="atlas-filters" id="atlasFilters" role="group" aria-label="Filter scene category"></div><p class="atlas-empty" id="atlasEmpty" hidden>No scenes match this search.</p>';
  grid.before(toolbar);
  const chips=toolbar.querySelector("#atlasFilters");
  chips.innerHTML=[["all","ALL"],...groups].map(([id,label])=>'<button type="button" class="atlas-filter" data-filter="'+id+'">'+label+'</button>').join("");
  const search=toolbar.querySelector("#atlasSearch");
  const count=toolbar.querySelector("#atlasCount");
  const empty=toolbar.querySelector("#atlasEmpty");
  let category="all";
  const filter=()=>{
    const q=search.value.toLocaleLowerCase().trim();
    let visible=0;
    for(const b of grid.querySelectorAll(".preset")){
      const p=presets.find(x=>x.id===b.dataset.id);
      const matches=!!p&&(category==="all"||p.category===category)&&
        (!q||(p.name+" "+p.hint+" "+p.code+" "+p.category).toLocaleLowerCase().includes(q));
      b.style.display=matches?"":"none";
      if(matches)visible++;
    }
    count.textContent=visible+" / "+presets.length;
    empty.hidden=visible>0;
    chips.querySelectorAll("button").forEach(b=>{
      const selected=b.dataset.filter===category;
      b.classList.toggle("selected",selected);
      b.setAttribute("aria-pressed",String(selected));
    });
  };
  chips.addEventListener("click",e=>{
    const button=e.target.closest("button[data-filter]");
    if(!button)return;
    category=button.dataset.filter;
    filter();
  });
  search.addEventListener("input",filter);
  const standardRender=renderPresets;
  renderPresets=function(){standardRender();filter();};
  // Keep the original editor and all saved URLs; just make its long list searchable.
  const open=document.getElementById("openEditor");
  const editorFields=document.getElementById("urlFields");
  if(open&&editorFields){
    const find=document.createElement("input");
    find.type="search";
    find.placeholder="Find a scene to add links...";
    find.setAttribute("aria-label","Search scenes in the YouTube link editor");
    find.className="atlas-editor-search";
    editorFields.before(find);
    const filterEditor=()=>{
      const q=find.value.toLocaleLowerCase().trim();
      for(const label of editorFields.querySelectorAll(".url-field")){
        const name=label.textContent.toLocaleLowerCase();
        label.style.display=name.includes(q)?"":"none";
      }
    };
    find.addEventListener("input",filterEditor);
    open.addEventListener("click",()=>{find.value="";filterEditor();});
  }
  updateScene();
})();
