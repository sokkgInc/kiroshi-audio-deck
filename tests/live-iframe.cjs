'use strict';
const { chromium } = require('playwright');
const fs = require('node:fs');
const sources = [
  ['original-night','P4RJxb_UgxQ','night'],
  ['original-club','HOMt0qKIoYc','club'],
  ['exploration','Nob9WhAl02k','freeroam'],
  ['dark-mix','mglVOJDhhbU','freeroam'],
  ['night-city','jneNUnOHetw','freeroam'],
];
(async()=>{
  const browser = await chromium.launch({headless:true,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
  const results=[];
  for(const [label,id,scene] of sources){
    const ctx=await browser.newContext({viewport:{width:1280,height:960},acceptDownloads:false});
    const page=await ctx.newPage();
    const errors=[],iframeResponses=[];
    page.on('pageerror',e=>errors.push(String(e).slice(0,180)));
    page.on('response',r=>{if(r.url().includes('youtube.com/embed/')||r.url().includes('youtube.com/iframe_api'))iframeResponses.push({status:r.status(),url:r.url().slice(0,150)})});
    try {
      await page.goto('http://127.0.0.1:48721/#mode=ambience',{waitUntil:'domcontentloaded',timeout:25000});
      await page.evaluate(({id,scene})=>localStorage.setItem('kiroshiSceneSourcesV1',JSON.stringify({[scene]:['https://www.youtube.com/watch?v='+id]})),{id,scene});
      await page.reload({waitUntil:'domcontentloaded',timeout:20000});
      await page.locator('[data-id="'+scene+'"]').waitFor({timeout:10000});
      await page.locator('[data-id="'+scene+'"]').click({timeout:8000});
      let state;
      try {
        await page.waitForFunction(()=>
          typeof player!=='undefined' && playerReady && player.getPlayerState()===YT.PlayerState.PLAYING,
          null,{timeout:11000});
        state='playing';
      } catch {
        state='not_confirmed';
      }
      const details=await page.evaluate(()=>({
        scene:document.querySelector('#sceneName')?.textContent,
        notice:document.querySelector('#playerNotice')?.textContent,
        noticeHidden:document.querySelector('#playerNotice')?.hidden,
        text:document.querySelector('#status')?.textContent,
        ready:(typeof playerReady!=='undefined')?playerReady:false,
        state:(typeof player!=='undefined'&&playerReady)?player.getPlayerState():null,
        video:(typeof player!=='undefined'&&playerReady)?player.getVideoData()?.video_id:null,
        iframe:!!document.querySelector('#ytPlayer iframe')
      }));
      results.push({label,id,scene,result:state,...details,errors,iframeResponses});
      await page.screenshot({path:'live-'+label+'.png',fullPage:false}).catch(()=>{});
      console.log(state.toUpperCase(),label,id,JSON.stringify(details),JSON.stringify(iframeResponses.slice(-3)));
    }catch(e){
      results.push({label,id,scene,result:'test_error',error:String(e).slice(0,330),errors,iframeResponses});
      console.log('TEST_ERROR',label,id,String(e).slice(0,300));
    }finally{await ctx.close();}
  }
  await browser.close();
  fs.writeFileSync('live-youtube-results.json',JSON.stringify(results,null,2));
  const confirmed=results.filter(r=>r.result==='playing').length;
  console.log('LIVE_IFRAME_TEST '+confirmed+'/'+results.length+' PLAYING confirmed, including 2 known existing controls');
  // Do not use CI failures as proof that video sources are unavailable:
  // network/consent/headless restrictions frequently block embedded YouTube.
  if(confirmed!==results.length)process.exitCode=2;
})().catch(e=>{console.error(e.stack);process.exitCode=1});
