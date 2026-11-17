(function(root){
'use strict';
const KEY='busielts.v1';
const fresh=()=>({version:1,track:'Academic',done:[],grammar:{},reviews:{},sentences:{},drafts:{},journal:[],scores:{},week:0});
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
function validate(x){
 if(!plain(x)||x.version!==1)throw Error('Please choose a Bus IELTS v1 backup.');
 const s=fresh();
 if(!['Academic','General Training'].includes(x.track))throw Error('Invalid test type.');s.track=x.track;
 if(!Array.isArray(x.done)||x.done.some(v=>typeof v!=='string'))throw Error('Invalid study progress.');s.done=[...new Set(x.done)];
 for(const key of ['grammar','reviews','sentences','drafts','scores'])if(!plain(x[key]))throw Error('Invalid '+key+'.');
 for(const [k,v]of Object.entries(x.grammar)){if(!plain(v)||typeof v.correct!=='boolean')throw Error('Invalid grammar result.');s.grammar[k]={correct:v.correct};}
 for(const [k,v]of Object.entries(x.reviews)){if(!plain(v)||!Number.isFinite(v.due)||!Number.isInteger(v.interval)||v.interval<0||v.interval>30)throw Error('Invalid review.');s.reviews[k]={due:v.due,interval:v.interval};}
 for(const [k,v]of Object.entries(x.sentences)){if(typeof v!=='string'||v.length>10000)throw Error('Invalid sentence.');s.sentences[k]=v;}
 for(const [k,v]of Object.entries(x.drafts)){if(!plain(v)||['text','plan','feedback'].some(f=>typeof v[f]!=='string'||v[f].length>200000)||!Array.isArray(v.checks)||v.checks.some(i=>!Number.isInteger(i)||i<0||i>3))throw Error('Invalid draft.');s.drafts[k]={text:v.text,plan:v.plan,feedback:v.feedback,checks:[...new Set(v.checks)]};}
 if(!Array.isArray(x.journal)||x.journal.length>10000)throw Error('Invalid journal.');
 s.journal=x.journal.map(e=>{if(!plain(e)||['id','skill','mistake','fix'].some(f=>typeof e[f]!=='string')||typeof e.resolved!=='boolean')throw Error('Invalid journal entry.');return {id:e.id,skill:e.skill,mistake:e.mistake,fix:e.fix,resolved:e.resolved};});
 for(const [k,v]of Object.entries(x.scores)){if(!['Listening','Reading','Writing','Speaking'].includes(k)||!Number.isFinite(v)||v<0||v>9||v*2%1)throw Error('Scores must be half bands from 0 to 9.');s.scores[k]=v;}
 s.week=Number.isInteger(x.week)&&x.week>=0&&x.week<6?x.week:0;return s;
}
function load(storage){try{const raw=storage.getItem(KEY);return {state:raw?validate(JSON.parse(raw)):fresh(),error:null};}catch(error){return {state:fresh(),error:'Saved data could not be read. Your session will continue; import a backup if needed.'};}}
function save(storage,state){try{storage.setItem(KEY,JSON.stringify(state));return true;}catch{return false;}}
function countWords(text){return (text.trim().match(/\S+/g)||[]).length;}
function overall(scores){const a=['Listening','Reading','Writing','Speaking'].map(k=>scores[k]);return a.every(v=>Number.isFinite(v))?Math.round(a.reduce((x,y)=>x+y,0)/4*2)/2:null;}
function review(previous,known,now=Date.now()){const interval=known?Math.min(30,previous?.interval?previous.interval*2:1):0;return {interval,due:now+interval*86400000};}
function stats(text,min){return {words:countWords(text),paragraphs:text.trim()?text.trim().split(/\n\s*\n/).length:0,minimum:min};}
const api={KEY,fresh,validate,load,save,countWords,overall,review,stats};root.IELTS_CORE=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
