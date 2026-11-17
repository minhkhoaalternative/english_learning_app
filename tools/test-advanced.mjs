import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
const base=new URL('../web/',import.meta.url);
const ctx={window:{}};
for (const f of ['lessons.js','theory.js','b1-lessons.js','b1-theory.js','b2-lessons.js','b2-theory.js','c1-lessons.js','c1-theory.js','vocabulary.js']) vm.runInNewContext(await fs.readFile(new URL(f,base),'utf8'),ctx);
const all=[...ctx.window.GRAMMAR_LESSONS,...ctx.window.B1_LESSONS,...ctx.window.B2_LESSONS,...ctx.window.C1_LESSONS];
const details=Object.assign({},ctx.window.GRAMMAR_THEORY,ctx.window.B1_THEORY,ctx.window.B2_THEORY,ctx.window.C1_THEORY);
assert.equal(all.length,134);
assert.equal(new Set(all.map(l=>l.id)).size,all.length);
for(const level of ['B2','C1']) assert.equal(all.filter(l=>l.level===level).length,30);
for(const l of all) {
 assert.ok(details[l.id]?.sections?.length>=2,l.id);
 assert.equal(l.questions.length,1,l.id);
 const q=l.questions[0];
 if(l.level==='B2'||l.level==='C1') assert.ok(q.prompt.includes('____'),l.id);
 assert.equal(q.options.length,3,l.id);
 assert.ok(new Set(q.options).size===3,l.id);
 assert.ok(q.answer>=0&&q.answer<3,l.id);
}
const data=ctx.window.VOCABULARY_DATA;
assert.equal(data.words.length,138);
assert.equal(new Set(data.words.map(w=>w.topic)).size,10);
assert.equal(new Set(data.words.map(w=>w.id)).size,138);
for (const w of data.words) for(const field of ['id','word','ipa','partOfSpeech','meaningVi','level','example','collocation','topic']) assert.ok(w[field],`${w.id} missing ${field}`);
for(const w of data.words) assert.match(w.ipa,/^\/.+\/$/,w.id);
const html=await fs.readFile(new URL('grammar.html',base),'utf8');
for(const file of ['b2-lessons.js','b2-theory.js','c1-lessons.js','c1-theory.js','vocabulary.js']) assert.ok(html.includes(file));
const sw=await fs.readFile(new URL('sw.js',base),'utf8');
for(const file of ['b2-lessons.js','b2-theory.js','c1-lessons.js','c1-theory.js','vocabulary.js']) assert.ok(sw.includes(file));
console.log('PASS advanced data: 134 unique lessons, 30 B2, 30 C1, 138 vocab in 10 topics, theory, IPA, offline scripts.');

const advanced = all.filter(l=>details[l.id]?.selfChecks?.length);
assert.equal(advanced.length,12);
for (const level of ['B1','B2','C1']) assert.equal(advanced.filter(l=>l.level===level).length,4);
assert.equal(all.filter(l=>details[l.id]?.sources?.length).length,16);
const questionIds = new Set();
for (const l of all) {
 const t=details[l.id];
 for (const q of [...l.questions,...(t.selfChecks||[])]) {
  assert.ok(!questionIds.has(q.id),q.id); questionIds.add(q.id);
  assert.equal(new Set(q.options).size,3,q.id);
  assert.ok(Number.isInteger(q.answer)&&q.answer>=0&&q.answer<3,q.id);
  assert.ok(q.explanation,q.id);
 }
 if (!t.sources) continue;
 assert.ok(t.examples.length>=3,l.id);
 assert.equal(new Set(t.examples.map(e=>e[0])).size,t.examples.length,l.id);
 for (const r of t.sources) {
  assert.ok(['learnenglish.britishcouncil.org','dictionary.cambridge.org'].includes(new URL(r.url).hostname));
  assert.ok(r.title&&r.publisher&&r.accessed&&r.usage,l.id);
 }
}
console.log('PASS source coverage: 12 expanded lessons, 24 inline exercises, 4 revised explanations, validated references.');
