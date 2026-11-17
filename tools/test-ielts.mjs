import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),C=require('../web/ielts-core.js');
const dataContext={window:{}};vm.runInNewContext(await fs.readFile(new URL('../web/ielts-data.js',import.meta.url),'utf8'),dataContext);
const D=dataContext.window.IELTS_DATA;
assert.equal(D.grammar.length,12);assert.equal(D.vocabulary.length,36);assert.equal(D.prompts.length,10);
assert.equal(D.sources.filter(s=>s.kind.startsWith('Reddit')).length,4);
const ids=new Set(D.sources.map(s=>s.id));
for(const s of D.sources){assert.equal(new URL(s.url).protocol,'https:');for(const k of ['author','title','takeaway','application'])assert.ok(s[k]);}
for(const g of D.grammar){assert.ok(ids.has(g.source));assert.ok(g.options.includes(g.answer));assert.ok(g.vi&&g.wrong&&g.right&&g.why);}
for(const v of D.vocabulary)assert.ok(ids.has(v.source)&&v.collocation&&v.example&&v.vi);
for(const p of D.prompts)assert.ok(p.plan&&p.focus&&p.prompt);
assert.equal(C.countWords('  one\n two  three '),3);assert.equal(C.countWords(''),0);
assert.equal(C.overall({Listening:7,Reading:7,Writing:6,Speaking:6}),6.5);
assert.equal(C.overall({Listening:6.5,Reading:6.5,Writing:6.5,Speaking:7.5}),7);
assert.equal(C.overall({Listening:6,Reading:6,Writing:6,Speaking:7}),6.5);
assert.equal(C.overall({Listening:7}),null);
let review;for(const interval of [1,2,4,8,16,30,30]){review=C.review(review,true,0);assert.equal(review.interval,interval);assert.equal(review.due,interval*86400000);}
assert.equal(C.review(review,false,500).due,500);
const memory=new Map(),storage={getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)};
const state=C.fresh();state.drafts.education={text:'Draft\n\nBody paragraph',plan:'Position',feedback:'Revise',checks:[0,2]};state.reviews.v1=review;state.sentences.v1='My sentence';state.journal=[{id:'1',skill:'Writing',mistake:'a advice',fix:'advice',resolved:false}];
assert.ok(C.save(storage,state));assert.deepEqual(C.load(storage).state,state);
assert.ok(C.load({getItem(){return '{broken';}}).error);
assert.ok(C.load({getItem(){throw Error('denied');}}).error);
assert.equal(C.save({setItem(){throw Error('quota');}},state),false);
for(const bad of [{version:2},{...state,track:'unknown'},{...state,drafts:{bad:{text:9}}},{...state,reviews:{v1:{due:'tomorrow',interval:1}}},{...state,scores:{Writing:6.3}}])assert.throws(()=>C.validate(bad));
const appSource=await fs.readFile(new URL('../web/ielts.js',import.meta.url),'utf8');
function boot(initialHash='#dashboard',deny=false){
 const nodes=new Map(),events={},mem=new Map();let interval=null;
 function element(key){if(!nodes.has(key))nodes.set(key,{innerHTML:'',textContent:'',value:'',selectionStart:0,files:[],listeners:{},dataset:{},addEventListener(k,f){this.listeners[k]=f;},focus(){},setSelectionRange(){},setAttribute(){},removeAttribute(){}});return nodes.get(key);}
 const local={getItem:k=>{if(deny)throw Error('denied');return mem.get(k)||null;},setItem:(k,v)=>{if(deny)throw Error('denied');mem.set(k,v);}};
 const ctx={IELTS_DATA:D,IELTS_CORE:C,document:{querySelector:element,querySelectorAll:()=>[],createElement:()=>({click(){}})},location:{hash:initialHash,protocol:'file:'},localStorage:local,navigator:{},console,URL,Blob,crypto:{randomUUID:()=>String(mem.size)+'-id'},confirm:()=>true,setInterval:f=>{interval=f;return 1;},clearInterval:()=>{interval=null;},setTimeout:()=>0,Date,scrollTo(){},addEventListener(k,f){events[k]=f;}};ctx.window=ctx;
 vm.runInNewContext(appSource,ctx);
 const main=element('#main');return {nodes,main,mem,ctx,element,route(hash){ctx.location.hash='#'+hash;events.hashchange();},click(action,extra={}){main.listeners.click({target:{closest:()=>({disabled:false,dataset:{action,...extra}})}});},input(id,value){element('#'+id).value=value;main.listeners.input({target:{id,value}});},change(id,value,extra={}){main.listeners.change({target:{id,value,dataset:{},...extra}});},state(){return JSON.parse(mem.get(C.KEY));}};
}
const ui=boot();assert.ok(ui.main.innerHTML.includes('Small steps.'));
ui.route('grammar');assert.ok(ui.main.innerHTML.includes('Subject–verb agreement'));
ui.click('answer',{id:'agreement',option:'1'});assert.equal(ui.state().grammar.agreement.correct,false);
ui.click('answer',{id:'agreement',option:'0'});assert.equal(ui.state().grammar.agreement.correct,true);
ui.route('vocabulary');ui.click('reveal');assert.ok(ui.main.innerHTML.includes('cơ hội tiếp cận giáo dục'));
ui.input('sentence','Learning opens doors.');assert.equal(ui.state().sentences.v1,'Learning opens doors.');
ui.click('review',{id:'v1',known:'true'});assert.equal(ui.state().reviews.v1.interval,1);
ui.route('writing');ui.input('essay','First paragraph.\n\nSecond paragraph.');ui.input('plan','Clear position');assert.equal(ui.state().drafts.education.plan,'Clear position');
ui.click('timer');assert.equal(ui.main.innerHTML.includes('Your response'),true);ui.click('timer');ui.click('reset-timer');assert.ok(ui.main.innerHTML.includes('40:00'));ui.click('analyse');assert.ok(ui.nodes.get('#analysis').textContent.includes('2 paragraph(s)'));
ui.change('prompt','data');assert.ok(ui.main.innerHTML.includes('Commuting choices'));assert.ok(ui.main.innerHTML.includes('<table>'));
ui.route('dashboard');ui.change('track','General Training');ui.route('writing');assert.ok(ui.main.innerHTML.includes('A problem with a course'));assert.ok(!ui.main.innerHTML.includes('Commuting choices'));
ui.change('prompt','letter-formal');assert.ok(ui.main.innerHTML.includes('all three bullet points'));
ui.route('dashboard');ui.change('', '',{dataset:{task:'0-0'},checked:true});assert.ok(ui.state().done.includes('0-0'));
for(const skill of ['Listening','Reading','Writing','Speaking'])ui.change('',skill==='Listening'?'8':'6',{dataset:{score:skill}});
assert.ok(ui.main.innerHTML.includes('6.5'));
ui.route('sources');assert.ok(ui.main.innerHTML.includes('u/EvolveEnglish'));assert.ok(ui.main.innerHTML.includes('not an exhaustive search'));
ui.route('journal');ui.element('#mistake').value='<script>alert(1)</script>';ui.element('#fix').value='Use a correct sentence.';ui.element('#error-skill').value='Writing';ui.main.listeners.submit({target:{id:'journal-form'},preventDefault(){}});assert.ok(!ui.main.innerHTML.includes('<script>alert(1)</script>'));assert.ok(ui.main.innerHTML.includes('&lt;script&gt;'));
ui.click('resolve',{id:ui.state().journal[0].id});assert.equal(ui.state().journal[0].resolved,true);
const denied=boot('#writing',true);denied.input('essay','This survives in memory.');assert.ok(denied.nodes.get('#draft-status').textContent.includes('unavailable'));
ui.route('writing');ui.change('prompt','letter-formal');ui.input('essay','<img src=x onerror=alert(1)>');ui.route('dashboard');ui.route('writing');assert.ok(ui.main.innerHTML.includes('&lt;img'));assert.ok(!ui.main.innerHTML.includes('<img src=x'));
const sw=await fs.readFile(new URL('../web/sw.js',import.meta.url),'utf8');for(const name of ['ielts.js','ielts-core.js','ielts-data.js','ielts.css','grammar.html'])assert.ok(sw.includes(name));
console.log('PASS IELTS: content integrity, score rounding, review scheduling, storage failures, backup validation, routes, grammar answers, vocabulary, drafts, track selection, journal escaping and offline assets.');
