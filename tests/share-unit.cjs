'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {mountSharePanel}=require('../share-page.js');
const PUBLIC={title:'掌蹠膿疱症の治療法まとめ｜掌蹠膿疱症.com',url:'https://djnaoyaman.github.io/ppp/index.html'};
function fixture(nav={},page=PUBLIC,{missing}={}){
 const elements=Object.fromEntries(['native','copy','status','manual','url','actions'].map(key=>[key,{textContent:'',disabled:true,open:false,value:'',attrs:{},events:{},setAttribute(k,v){this.attrs[k]=v;},addEventListener(k,f){this.events[k]=f;},removeEventListener(k){delete this.events[k];},focus(options){this.focused=true;this.focusOptions=options;},select(){this.selected=true;}}]));
 const lifecycle={events:{},addEventListener(k,f){this.events[k]=f;},removeEventListener(k){delete this.events[k];}};
 const root={dataset:{shareTitle:page?.title,shareUrl:page?.url},querySelector(selector){const key=selector.match(/data-share-(.+)\]/)[1];return key===missing?null:elements[key];}};
 const api=mountSharePanel(root,{nav,lifecycle});return {elements,lifecycle,root,api,click:kind=>elements[kind].events.click()};
}
const source=fs.readFileSync(path.join(__dirname,'../share-page.js'),'utf8');
test('mounting reads no share/clipboard capabilities and makes no calls',()=>{
 const nav={};for(const key of ['share','clipboard'])Object.defineProperty(nav,key,{get(){throw Error('capability read before explicit click')}});
 const f=fixture(nav);assert.ok(f.api);assert.equal(f.elements.url.value,PUBLIC.url);assert.equal(f.elements.native.disabled,false);assert.equal(f.elements.copy.disabled,false);assert.equal(f.elements.status.textContent,'');assert.deepEqual(Object.keys(f.elements.native.events),['click']);assert.deepEqual(Object.keys(f.elements.copy.events),['click']);
});
test('only explicit buttons share exact fixed title+canonical or copy canonical',async()=>{
 const shares=[],copies=[];const f=fixture({share:async x=>shares.push(x),clipboard:{writeText:async x=>copies.push(x)}});
 assert.equal(shares.length,0);assert.equal(copies.length,0);await f.click('native');assert.deepEqual(shares,[PUBLIC]);assert.deepEqual(copies,[]);assert.equal(f.elements.status.textContent,'共有操作が完了しました。');
 await f.click('copy');assert.deepEqual(copies,[PUBLIC.url]);assert.equal(f.elements.status.textContent,'URLをコピーしました。');assert.equal(f.elements.actions.attrs['aria-busy'],'false');assert.equal(f.elements.manual.open,false);
});
test('payload is captured from fixed metadata, not later changed DOM',async()=>{
 const calls=[];const f=fixture({share:async data=>calls.push(data)});f.root.dataset.shareUrl='https://example.invalid/?answer=private';f.root.dataset.shareTitle='Private health details';await f.click('native');assert.deepEqual(calls,[PUBLIC]);
});
test('private browser state and network APIs are never consulted',async()=>{
 const context={module:{exports:{}},URL};
 for(const key of ['location','history','localStorage','sessionStorage','fetch','XMLHttpRequest'])Object.defineProperty(context,key,{get(){throw Error('forbidden read '+key)}});
 vm.runInNewContext(source,context);const f=fixture({});const calls=[];const api=context.module.exports.mountSharePanel(f.root,{nav:{share:async data=>calls.push({...data})},lifecycle:f.lifecycle});assert.ok(api);await f.click('native');assert.deepEqual(calls,[PUBLIC]);
 assert.doesNotMatch(source,/\b(?:localStorage|sessionStorage|fetch|XMLHttpRequest|execCommand)\b/);assert.doesNotMatch(source,/\b(?:location|history)\s*[.[]/);
});
test('repeat and cross-action clicks during pending share are suppressed; later retry works',async()=>{
 let done,calls=0,copies=0;const f=fixture({share:()=>{calls++;return new Promise(r=>done=r)},clipboard:{writeText:async()=>copies++}});
 const first=f.click('native');await f.click('native');await f.click('copy');assert.equal(calls,1);assert.equal(copies,0);assert.equal(f.elements.native.attrs['aria-disabled'],'true');assert.equal(f.elements.copy.attrs['aria-disabled'],'true');assert.equal(f.elements.native.disabled,false);done();await first;await f.click('copy');assert.equal(copies,1);assert.equal(f.elements.actions.attrs['aria-busy'],'false');
});
test('repeat and cross-action clicks during pending copy are suppressed',async()=>{
 let done,copies=0,shares=0;const f=fixture({share:async()=>shares++,clipboard:{writeText:()=>{copies++;return new Promise(r=>done=r)}}});const first=f.click('copy');await f.click('copy');await f.click('native');assert.equal(copies,1);assert.equal(shares,0);done();await first;assert.equal(f.elements.copy.attrs['aria-disabled'],'false');
});
test('AbortError is cancellation, not success, copying or a failure focus jump',async()=>{
 let copies=0,calls=0;const f=fixture({share:async()=>{calls++;throw Object.assign(Error(),{name:'AbortError'})},clipboard:{writeText:async()=>copies++}});await f.click('native');assert.equal(f.elements.status.textContent,'共有をキャンセルしました。');assert.equal(f.elements.manual.open,false);assert.equal(f.elements.url.focused,undefined);assert.equal(copies,0);await f.click('native');assert.equal(calls,2);assert.equal(f.elements.actions.attrs['aria-busy'],'false');
});
for(const mode of ['missing','reject','throw','getter'])test(`share ${mode}: honest fallback, focus and no implicit clipboard`,async()=>{
 let copies=0;const nav={clipboard:{writeText:async()=>copies++}};if(mode==='getter')Object.defineProperty(nav,'share',{get(){throw Error()}});else if(mode!=='missing')nav.share=()=>{if(mode==='throw')throw Error();return Promise.reject(Error())};const f=fixture(nav);await f.click('native');assert.equal(copies,0);assert.equal(f.elements.manual.open,true);assert.equal(f.elements.url.focused,true);assert.equal(f.elements.url.selected,true);assert.deepEqual(f.elements.url.focusOptions,{preventScroll:true});assert.equal(f.elements.actions.attrs['aria-busy'],'false');assert.doesNotMatch(f.elements.status.textContent,/完了|コピーしました/);await f.click('copy');assert.equal(copies,1);assert.equal(f.elements.manual.open,false);
});
for(const mode of ['missing','reject','throw','getter','abort'])test(`clipboard ${mode}: manual fallback rather than false success`,async()=>{
 const nav={};if(mode==='getter')Object.defineProperty(nav,'clipboard',{get(){throw Error()}});else if(mode!=='missing')nav.clipboard={writeText:()=>{if(mode==='throw')throw Error();return Promise.reject(Object.assign(Error(),{name:mode==='abort'?'AbortError':'NotAllowedError'}))}};const f=fixture(nav);await f.click('copy');assert.equal(f.elements.manual.open,true);assert.equal(f.elements.url.value,PUBLIC.url);assert.equal(f.elements.url.focused,true);assert.equal(f.elements.url.selected,true);assert.equal(f.elements.actions.attrs['aria-busy'],'false');assert.doesNotMatch(f.elements.status.textContent,/コピーしました|キャンセル/);
});
for(const outcome of ['resolve','reject'])test(`pagehide: stale ${outcome} cannot override later success`,async()=>{
 let resolve,reject;const f=fixture({share:()=>new Promise((r,j)=>{resolve=r;reject=j}),clipboard:{writeText:async()=>{}}});const old=f.click('native');f.lifecycle.events.pagehide();assert.equal(f.elements.actions.attrs['aria-busy'],'false');assert.equal(f.elements.status.textContent,'');await f.click('copy');if(outcome==='resolve')resolve();else reject(Error());await old;assert.equal(f.elements.status.textContent,'URLをコピーしました。');assert.equal(f.elements.manual.open,false);
});
test('stale finally cannot clear busy state of newer pending operation',async()=>{
 let shareDone,copyDone;const f=fixture({share:()=>new Promise(r=>shareDone=r),clipboard:{writeText:()=>new Promise(r=>copyDone=r)}});const old=f.click('native');f.lifecycle.events.pagehide();const current=f.click('copy');shareDone();await old;assert.equal(f.elements.actions.attrs['aria-busy'],'true');assert.equal(f.elements.status.textContent,'URLをコピーしています…');copyDone();await current;assert.equal(f.elements.actions.attrs['aria-busy'],'false');
});
test('reset closes fallback and clears state; destroy removes callbacks and stale completions',async()=>{
 let done;const f=fixture({share:()=>new Promise(r=>done=r)});const old=f.click('native');f.api.destroy();assert.equal(f.lifecycle.events.pagehide,undefined);assert.equal(f.elements.native.events.click,undefined);assert.equal(f.elements.copy.events.click,undefined);done();await old;assert.equal(f.elements.status.textContent,'');assert.equal(f.elements.actions.attrs['aria-busy'],'false');
 const missing=fixture({});await missing.click('copy');missing.api.reset();assert.equal(missing.elements.manual.open,false);assert.equal(missing.elements.status.textContent,'');
});
for(const url of [undefined,'','not-a-url','javascript:alert(1)','http://djnaoyaman.github.io/ppp/index.html','https://djnaoyaman.github.io/ppp/index.html?answer=1','https://djnaoyaman.github.io/ppp/index.html#private','https://name:secret@djnaoyaman.github.io/ppp/index.html','https://example.invalid/','https://djnaoyaman.github.io/ppp/quiz.html','https://djnaoyaman.github.io/ppp/','https://djnaoyaman.github.io/ppp/index.html '])test(`bad or nonexact canonical fails closed: ${String(url)}`,()=>{
 const f=fixture({},{...PUBLIC,url});assert.equal(f.api,null);assert.equal(f.elements.native.disabled,true);assert.equal(f.elements.copy.disabled,true);assert.deepEqual(f.elements.native.events,{});assert.equal(f.elements.url.value,'');
});
for(const title of [undefined,'','Private details',PUBLIC.title+' '])test(`nonexact title fails closed: ${String(title)}`,()=>{const f=fixture({},{...PUBLIC,title});assert.equal(f.api,null);assert.equal(f.elements.copy.disabled,true)});
for(const missing of ['native','copy','status','manual','url','actions'])test(`missing element ${missing} fails closed without partially enabling controls`,()=>{const f=fixture({},PUBLIC,{missing});assert.equal(f.api,null);assert.equal(f.elements.native.disabled,true);assert.equal(f.elements.copy.disabled,true)});
