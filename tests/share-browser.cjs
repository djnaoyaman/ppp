const {chromium}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
const URL_FIXED='https://djnaoyaman.github.io/ppp/index.html',TITLE='掌蹠膿疱症の治療法まとめ｜掌蹠膿疱症.com';
(async()=>{
 const browser=await chromium.launch(),results=[];fs.mkdirSync('test-artifacts/share',{recursive:true});
 async function make(width,mode='success',javascript=true){
  const p=await browser.newPage({viewport:{width,height:900},javaScriptEnabled:javascript});
  await p.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
  if(javascript)await p.addInitScript(({mode})=>{
   window.shareCalls=[];window.copyCalls=[];
   const action=(type,data)=>{window[type+'Calls'].push(data);if(mode==='cancel')return Promise.reject(new DOMException('cancel','AbortError'));if(mode==='failure')return Promise.reject(new Error('blocked'));if(mode==='pending')return new Promise((resolve,reject)=>{window[type+'Resolve']=resolve;window[type+'Reject']=reject;});return Promise.resolve();};
   Object.defineProperty(navigator,'share',{configurable:true,value:mode==='unsupported'?undefined:x=>action('share',x)});
   Object.defineProperty(navigator,'clipboard',{configurable:true,value:mode==='unsupported'?undefined:{writeText:x=>action('copy',x)}});
  },{mode});
  p.errors=[];p.on('pageerror',e=>p.errors.push(e.message));await p.goto('http://127.0.0.1:8765/index.html?private=health#answer',{waitUntil:'networkidle'});return p;
 }
 const status=(p,t)=>p.locator('[data-share-status]').filter({hasText:t}).waitFor();
 async function check(p,label){assert.deepEqual(p.errors,[]);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,label);results.push(label);}
 try{
  for(const width of [320,390,768,1280]){
   let p=await make(width),share=p.locator('[data-share-native]'),copy=p.locator('[data-share-copy]');
   assert.deepEqual(await p.evaluate(()=>[shareCalls,copyCalls]),[[],[]]);await share.focus();await p.keyboard.press('Enter');await status(p,'共有操作が完了しました。');assert.deepEqual(await p.evaluate(()=>shareCalls),[{title:TITLE,url:URL_FIXED}]);assert.deepEqual(await p.evaluate(()=>copyCalls),[]);
   await p.keyboard.press('Tab');assert.equal(await copy.evaluate(el=>el===document.activeElement),true);await p.keyboard.press('Space');await status(p,'URLをコピーしました。');assert.deepEqual(await p.evaluate(()=>copyCalls),[URL_FIXED]);for(const el of [share,copy])assert((await el.boundingBox()).height>=44);
   await p.locator('[data-page-share]').scrollIntoViewIfNeeded();await check(p,`${width} keyboard success and fixed payload`);await p.screenshot({path:`test-artifacts/share/ready-${width}.png`});await p.close();
   p=await make(width,'unsupported');await p.locator('[data-share-native]').click();await p.locator('[data-share-manual][open]').waitFor();const input=p.locator('#ppp-share-url');assert.equal(await input.inputValue(),URL_FIXED);assert.equal(await input.evaluate(el=>el===document.activeElement&&el.selectionStart===0&&el.selectionEnd===el.value.length),true);await check(p,`${width} unsupported manual fallback`);await p.locator('[data-page-share]').scrollIntoViewIfNeeded();await p.screenshot({path:`test-artifacts/share/fallback-${width}.png`});await p.close();
   p=await make(width,'success',false);assert.equal(await p.locator('[data-share-copy]').isDisabled(),true);await p.locator('[data-share-manual] summary').click();assert.equal(await p.locator('#ppp-share-url').isVisible(),true);assert.equal(await p.locator('#ppp-share-url').inputValue(),URL_FIXED);await check(p,`${width} no-JS fallback`);await p.close();
  }
  for(const mode of ['cancel','failure']){const p=await make(390,mode);await p.locator('[data-share-native]').click();await status(p,mode==='cancel'?'共有をキャンセルしました。':'共有メニューを開けませんでした。');assert.deepEqual(await p.evaluate(()=>copyCalls),[]);assert.equal(await p.locator('[data-share-manual]').evaluate(el=>el.open),mode==='failure');await check(p,mode);await p.close();}
  const p=await make(390,'pending');await p.locator('[data-share-native]').focus();await p.keyboard.press('Enter');await p.keyboard.press('Enter');await p.keyboard.press('Tab');await p.keyboard.press('Enter');assert.deepEqual(await p.evaluate(()=>[shareCalls.length,copyCalls.length]),[1,0]);await p.evaluate(()=>window.dispatchEvent(new Event('pagehide')));await p.locator('[data-share-copy]').click();await p.evaluate(()=>shareResolve());assert.equal(await p.locator('[data-share-actions]').getAttribute('aria-busy'),'true');await p.evaluate(()=>copyResolve());await status(p,'URLをコピーしました。');await check(p,'repeated cross-actions and stale completion');await p.close();
 }finally{fs.writeFileSync('test-artifacts/share/results.json',JSON.stringify(results,null,2));await browser.close();}
 console.log(`PASS ${results.length} sharing browser cases`);
})().catch(e=>{console.error(e);process.exit(1);});
