import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const html=readFileSync(new URL('../mcp-workbench.html',import.meta.url),'utf8');
const scripts=[...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)];
const data=JSON.parse(scripts.find(s=>s[1].includes('application/json'))[2]);
// These are code-level state tests. This tiny DOM stand-in does not render a page.
function harness(){
  const nodes=new Map();
  function element(id){
    if(!nodes.has(id))nodes.set(id,{value:'',textContent:'',innerHTML:'',hidden:false,disabled:false,dataset:{},handlers:{},
      addEventListener(type,fn){this.handlers[type]=fn;},setAttribute(k,v){this[k]=v;}});
    return nodes.get(id);
  }
  element('workbench-data').textContent=JSON.stringify(data);
  element('filter').value='all'; element('recipe').value='code';
  const tabs=['catalog','studio'].map(view=>Object.assign(element('tab-'+view),{dataset:{view}}));
  const context=vm.createContext({document:{getElementById:element,querySelectorAll:()=>tabs},navigator:{},setTimeout});
  vm.runInContext(scripts.at(-1)[2],context);
  return {context,element,tabs,run:code=>vm.runInContext(code,context)};
}

test('all inline scripts parse; artifact contains no external asset references',()=>{
  for(const [,attrs,code] of scripts)if(!attrs.includes('application/json'))new vm.Script(code);
  assert.doesNotMatch(html,/<(?:script|link|img)[^>]+(?:src|href)=/i);
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(new Set(ids).size,ids.length);
});

test('configured snapshot and session evidence remain separate',()=>{
  const h=harness();
  assert(data.servers.length>0);
  assert.match(h.element('count').textContent,/entries shown/);
  assert.match(h.element('capture').textContent,/Config:.*Session:/);
  assert(h.run('entries.length')>=data.servers.length);
});

test('search and disabled filter narrow the catalog',()=>{
  const h=harness();h.element('search').value='context7';h.run('renderCatalog()');
  assert.match(h.element('catalog').innerHTML,/context7/);
  assert.doesNotMatch(h.element('catalog').innerHTML,/<h3>github<\/h3>/);
  h.element('search').value='';h.element('filter').value='disabled';h.run('renderCatalog()');
  assert.doesNotMatch(h.element('catalog').innerHTML,/Config enabled/);
});

test('workflow shows real availability and explicit simulated outage',()=>{
  const h=harness();h.element('target').value='Review local ACK behavior';h.run('buildPlan()');
  assert.match(h.element('prompt').textContent,/Review local ACK behavior/);
  assert.match(h.element('prompt').textContent,/github \/ get_pull_request_files/);
  assert.equal(h.element('copy-plan').disabled,false);
  h.element('outage').value='github';h.run('buildPlan()');
  assert.match(h.element('steps').innerHTML,/Simulated outage/);
  assert.match(h.element('prompt').textContent,/scenario, not observed system state/);
});

test('edited inputs invalidate the old handoff',()=>{
  const h=harness();h.run('buildPlan()');h.element('target').handlers.input();
  assert.equal(h.element('copy-plan').disabled,true);
  assert.equal(h.element('download-plan').disabled,true);
  assert.equal(h.element('prompt-details').hidden,true);
});

test('tabs change panels and exported creative plan stops before paid generation',()=>{
  const h=harness();h.tabs[1].handlers.click();
  assert.equal(h.element('view-catalog').hidden,true);
  assert.equal(h.element('view-studio').hidden,false);
  h.element('recipe').value='creative';h.run('buildPlan()');
  assert.match(h.element('prompt').textContent,/Stop before any generate or upload call/);
  assert.doesNotMatch(h.element('prompt').textContent,/Tool: fal_ai \/ generate/);
});

test('unavailable tools are blocked and dynamic markup is escaped',()=>{
  const h=harness();
  assert.equal(h.run('availability({provider:"missing",tool:"anything"}).blocked'),true);
  assert.equal(h.run('availability({provider:"confluence",tool:"confluence_get_page"}).blocked'),true);
  assert.equal(h.run('esc("<img onerror=1>")'),'&lt;img onerror=1&gt;');
});
