import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { Blob } from 'node:buffer';
import { URL } from 'node:url';

// The Codex JavaScript runner omits browser fetch classes. Normal Node uses its
// native implementations; these small adapters cover the same byte operations.
const ResponseAPI = globalThis.Response || class {
  constructor(body, options={}) { this.bytes=body===null?Buffer.alloc(0):Buffer.from(body); this.status=options.status||200; this.headers=options.headers||{}; }
  clone(){ return new ResponseAPI(this.bytes,{status:this.status,headers:this.headers}); }
  async arrayBuffer(){ return this.bytes.buffer.slice(this.bytes.byteOffset,this.bytes.byteOffset+this.bytes.byteLength); }
  async text(){ return this.bytes.toString(); }
};
const RequestAPI = globalThis.Request || class {
  constructor(url, options={}) { this.url=url; this.method='GET'; const values=options.headers||{}; this.headers={has:key=>key in values,get:key=>values[key]}; }
};

const base = new URL('../web/', import.meta.url);
const source = await fs.readFile(new URL('app.js', base), 'utf8');
const dataScript = await fs.readFile(new URL('lessons.js', base), 'utf8');
const dataContext = {window:{}};
vm.runInNewContext(dataScript, dataContext);
vm.runInNewContext(await fs.readFile(new URL('theory.js', base), 'utf8'), dataContext);
const lessons = dataContext.window.GRAMMAR_LESSONS;
const theory = dataContext.window.GRAMMAR_THEORY;
assert.equal(lessons.length, 26);
assert.equal(new Set(lessons.map(l => l.id)).size, 26);
assert.equal(new Set(lessons.map(l => l.category)).size, 6);
assert.equal(Object.keys(theory).length, lessons.length);
for (const l of lessons) {
  const t = theory[l.id];
  assert.ok(t && t.sections.length >= 2 && t.examples.length && t.mistakes.length && t.check);
  assert.ok(t.pages.every(page => Number.isInteger(page) && page >= 1 && page <= 41));
  for (const s of t.sections) {
    assert.ok(s.title && s.text && Array.isArray(s.bullets));
    if (s.table) assert.ok(s.table.rows.every(row => row.length === s.table.headers.length));
  }
}
const KEY = 'busgrammar.web.v1';

// Exercise the actual app handlers with a small DOM adapter. This is not a
// substitute for rendering in a browser, but catches session/storage regressions.
function boot(storage = new Map(), hash = '#home', denyStorage = false) {
  const elements = new Map(), windowEvents = {}, downloads = [];
  function element(selector) {
    if (!elements.has(selector)) elements.set(selector, {innerHTML:'',textContent:'',value:'',checked:false,files:[],listeners:{},dataset:{},classList:{add(){},remove(){},toggle(){}},addEventListener(name,callback){this.listeners[name]=callback;},focus(){},click(){downloads.push(this);},setAttribute(){},removeAttribute(){}});
    return elements.get(selector);
  }
  const app = element('#app');
  const location = {protocol:'file:'};
  Object.defineProperty(location,'hash',{get:()=>hash,set:value=>{hash=value.startsWith('#')?value:'#'+value;windowEvents.hashchange?.();}});
  const localStorage = {getItem:key=>{if(denyStorage)throw Error('denied');return storage.get(key)||null;},setItem:(key,value)=>{if(denyStorage)throw Error('denied');storage.set(key,value);}};
  const context = {window:null,document:{querySelector:element,querySelectorAll:()=>[],getElementById:()=>({scrollIntoView(){}}),createElement:()=>({click(){},href:'',download:''})},location,localStorage,navigator:{},console,Blob,URL,setTimeout:()=>0,clearTimeout(){},confirm:()=>true,GRAMMAR_LESSONS:lessons,GRAMMAR_THEORY:theory,addEventListener:(name,callback)=>{windowEvents[name]=callback;},scrollTo(){}};
  context.window=context;
  vm.runInNewContext(source, context);
  return {
    app, elements, storage, context,
    click(action, extra={}) {app.listeners.click({target:{closest:()=>({dataset:{action,...extra}})}});},
    route(route) {location.hash='#'+route;},
    input(id,value) {element('#'+id).value=value;app.listeners.input({target:{id,value}});},
    change(id,value,checked=false) {app.listeners.change({target:{id,value,checked}});},
    state() {return JSON.parse(storage.get(KEY));}
  };
}

let ui=boot();
assert.ok(ui.app.innerHTML.includes('Mỗi chuyến đi'));
ui.route('theory');
assert.ok(ui.app.innerHTML.includes('chủ điểm'));
assert.ok(categoriesForTest().every(c=>ui.app.innerHTML.includes(c)));
function categoriesForTest(){return [...new Set(lessons.map(l=>l.category))];}
for (const l of lessons) {
  ui.route('lesson/'+l.id);
  assert.ok(ui.app.innerHTML.includes('Lý thuyết chi tiết'));
  assert.ok(ui.app.innerHTML.includes('TỰ KIỂM TRA TRƯỚC KHI LUYỆN'));
  assert.ok(ui.app.innerHTML.includes('data-action="practice-one"'));
}
ui.route('theory/chapter-3');
assert.ok(ui.app.innerHTML.includes('Thì động từ'));
ui.route('home');
ui.click('duration',{value:'2'});
ui.click('start');
assert.equal(ui.state().session.ids.length,2);
assert.ok(ui.app.innerHTML.includes('CÂU 1/2'));
const first=ui.state().session.ids[0];
ui.click('answer',{value:'0'});
assert.equal(ui.state().attempts,1);
assert.equal(ui.state().correct,1);
assert.equal(ui.state().reviews[first].interval,1);
assert.ok(ui.state().reviews[first].due>Date.now());
ui.click('answer',{value:'0'});
assert.equal(ui.state().attempts,1,'Cannot count an answer twice');
const order=ui.state().session.orders;
ui=boot(ui.storage,'#practice');
assert.deepEqual(ui.state().session.orders,order,'Option order survives reload');
assert.ok(ui.app.innerHTML.includes('Chính xác'));
ui.click('next');
const second=ui.state().session.ids[1];
ui.click('answer',{value:'1'});
assert.equal(ui.state().attempts,2);
assert.equal(ui.state().correct,1);
assert.equal(ui.state().reviews[second].interval,0);
assert.ok(ui.app.innerHTML.includes('Chưa đúng'));
ui.click('next');
assert.ok(ui.app.innerHTML.includes('1/2'));
ui.route('review');
assert.ok(ui.app.innerHTML.includes('1 câu đang chờ'));
ui.click('review');
assert.deepEqual(ui.state().session.ids,[second]);
ui.click('answer',{value:'0'});
assert.equal(ui.state().reviews[second].interval,1);
ui.click('next');
ui.route('lesson/lesson-1');
ui.click('bookmark',{id:'lesson-1'});
ui.click('complete',{id:'lesson-1'});
assert.deepEqual(ui.state().bookmarks,['lesson-1']);
assert.deepEqual(ui.state().completed,['lesson-1']);
ui=boot(ui.storage,'#lesson/lesson-1');
assert.ok(ui.app.innerHTML.includes('Đã lưu'));
assert.ok(ui.app.innerHTML.includes('Đã đọc bài này'));
ui.route('library');
ui.input('search','hiện tại');
assert.ok(ui.elements.get('#lesson-results').innerHTML.includes('Hiện tại'));
assert.ok(!ui.elements.get('#lesson-results').innerHTML.includes('Câu bị động'));
ui.input('search','zzzz-does-not-exist');
assert.ok(ui.elements.get('#lesson-results').innerHTML.includes('Chưa tìm thấy'));
ui.input('search','');
ui.change('saved-only','',true);
assert.ok(ui.elements.get('#lesson-results').innerHTML.includes('Nhận diện từ loại'));
assert.ok(!ui.elements.get('#lesson-results').innerHTML.includes('Câu bị động'));
ui.route('lesson/invalid');
assert.ok(ui.app.innerHTML.includes('Không tìm thấy'));
ui.route('progress');
assert.ok(ui.app.innerHTML.includes('67%'));
ui.route('lesson/lesson-2');
ui.click('speak',{id:'lesson-2'});
assert.ok(ui.elements.get('#toast').textContent.includes('chưa hỗ trợ'));
const denied=boot(new Map(),'#home',true);
denied.click('start');denied.click('answer',{value:'0'});
assert.ok(denied.app.innerHTML.includes('Chính xác'),'Storage denial must not prevent practice');
const corrupt=boot(new Map([[KEY,'{broken json']]),'#home');
assert.ok(corrupt.app.innerHTML.includes('Mỗi chuyến đi'));
const badSession=boot(new Map([[KEY,JSON.stringify({completed:[],bookmarks:[],reviews:{},session:{ids:['missing'],position:0}})]]),'#practice');
assert.ok(badSession.app.innerHTML.includes('chuyến học đầu tiên'));

// Exercise service-worker installation and offline PDF byte ranges.
const handlers={},cached=new Map();
let claimed=false, offlineNotice=false;
const cache={async addAll(files){for(const file of files){const path=file==='./'?'index.html':file.slice(2);cached.set(file,new ResponseAPI(await fs.readFile(new URL(path,base))));}},async match(request){const key=typeof request==='string'?request:'./'+new URL(request.url).pathname.slice(1);return cached.get(key)?.clone();}};
const worker={location:{origin:'https://grammar.test'},addEventListener:(name,handler)=>{handlers[name]=handler;},skipWaiting:async()=>{},clients:{claim:async()=>{claimed=true;},matchAll:async()=>[{postMessage:message=>{offlineNotice=message==='OFFLINE_READY';}}]}};
const sw=await fs.readFile(new URL('sw.js',base),'utf8');
vm.runInNewContext(sw,{self:worker,caches:{open:async()=>cache,keys:async()=>['busgrammar-static-v1'],delete:async()=>true},URL,Response:ResponseAPI,fetch:()=>{throw Error('Network disabled');}});
let pending;
handlers.install({waitUntil:promise=>{pending=promise;}});await pending;
handlers.activate({waitUntil:promise=>{pending=promise;}});await pending;
assert.ok(claimed&&offlineNotice);
assert.ok(cached.has('./app.js')&&cached.has('./grammar-source.pdf')&&cached.has('./theory.js'));
let response;
handlers.fetch({request:new RequestAPI('https://grammar.test/grammar-source.pdf',{headers:{range:'bytes=0-4'}}),respondWith:promise=>{response=promise;}});
const pdf=await response;
assert.equal(pdf.status,206);
assert.equal(await pdf.text(),'%PDF-');
handlers.fetch({request:new RequestAPI('https://grammar.test/app.js'),respondWith:promise=>{response=promise;}});
assert.equal(await (await response).text(),source);
handlers.fetch({request:new RequestAPI('https://grammar.test/grammar-source.pdf',{headers:{range:'bytes=9999999-'}}),respondWith:promise=>{response=promise;}});
assert.equal((await response).status,416);
const manifest=JSON.parse(await fs.readFile(new URL('manifest.webmanifest',base),'utf8'));
for(const icon of manifest.icons)await fs.access(new URL(icon.src,base));
const originalPDF = await fs.readFile(new URL('grammar-source.pdf',base));
assert.equal(createHash('sha256').update(originalPDF).digest('hex'), 'a8c5d2c898c3c5dd271dd9e8ac98f673e55da2d567f8076c86b3a5132ca92113');
assert.equal([...originalPDF.toString('latin1').matchAll(/\/Type \/Page\b/g)].length, 41);
assert.ok((await fs.readFile(new URL('index.html',base),'utf8')).includes('Nguồn tài liệu: Huy Forum.'));
console.log('PASS: all 26 theory topics and 58 sections, chapter navigation, practice, duplicate-answer guard, persisted resume, review scheduling, bookmarks, read progress, search/filter, corrupt storage recovery, storage denial, offline theory/app/PDF, icons and original PDF identity.');
