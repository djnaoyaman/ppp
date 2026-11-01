const {chromium}=require('playwright');const fs=require('node:fs');const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch();const results=[];fs.mkdirSync('test-artifacts/brand',{recursive:true});
 const source=JSON.parse(fs.readFileSync('tests/brand-contract.json','utf8'));
 try{
  for(const width of [320,390,768,1280]){
   const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
   await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   const paths=width===320?Object.keys(source.pages):['index.html','about.html','quiz.html','treatments/biotin-oral.html','clinics/higuchi-dental.html'];
   for(const file of paths){
    await page.goto('http://127.0.0.1:8765/'+file,{waitUntil:'networkidle'});
    const logo=page.locator('.brand-logo');assert.equal(await logo.count(),1);assert.equal(await logo.getAttribute('alt'),'掌蹠膿疱症.com');
    const b=await logo.boundingBox();assert.ok(b&&b.width>=299&&b.width<=341&&b.x>=0&&b.x+b.width<=width,JSON.stringify({file,width,b}));
    assert.equal(await logo.evaluate(img=>img.complete&&img.naturalWidth===2200),true);
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
    assert.equal(overflow,false,JSON.stringify({file,width,overflow}));
    if(width<=1024){
     const menu=page.locator('#menu-toggle');await menu.click();await page.waitForTimeout(400);assert.equal(await menu.getAttribute('aria-expanded'),'true');
     assert.equal(await page.locator('#site-nav').evaluate(el=>el.scrollHeight>0&&getComputedStyle(el).opacity==='1'),true);
     await menu.click();await page.waitForTimeout(400);assert.equal(await menu.getAttribute('aria-expanded'),'false');
     await menu.click();await page.waitForTimeout(400);assert.equal(await menu.getAttribute('aria-expanded'),'true');
     if(file==='index.html')await page.screenshot({path:`test-artifacts/brand/home-menu-open-${width}.png`});
     await menu.click();await page.waitForTimeout(400);assert.equal(await menu.getAttribute('aria-expanded'),'false');
     assert.equal(await page.locator('#site-nav').evaluate(el=>getComputedStyle(el).pointerEvents),'none');
    }
    await page.evaluate(()=>scrollTo(0,0));
    if(file==='index.html')await page.screenshot({path:`test-artifacts/brand/home-${width}.png`});
    if(width===390&&file==='treatments/biotin-oral.html')await page.screenshot({path:'test-artifacts/brand/treatment-390.png'});
    results.push({file,width,logoWidth:b.width,overflow});
   }
   assert.deepEqual(errors,[]);await page.close();
  }
  const context=await browser.newContext({viewport:{width:320,height:900},javaScriptEnabled:false});const page=await context.newPage();
  await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
  await page.goto('http://127.0.0.1:8765/index.html');assert.equal(await page.locator('.brand-logo').isVisible(),true);await page.screenshot({path:'test-artifacts/brand/home-nojs-320.png'});await context.close();
 }finally{fs.writeFileSync('test-artifacts/brand/browser-report.json',JSON.stringify(results,null,2));await browser.close()}
 console.log('PASS: full 47-page mobile header audit, responsive menu repeat flows and no-JS logo');
})().catch(e=>{console.error(e);process.exit(1)});
