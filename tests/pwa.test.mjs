import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const scope='https://example.test/scp-breach-protocol/';
const source=readFileSync(new URL('../dist/sw.js',import.meta.url),'utf8');
function worker({fetch=async()=>new Response('network'),keys=[]}={}){
  const listeners={},entries=new Map(),removed=[],pending=[];
  const cache={match:async request=>entries.get(typeof request==='string'?request:request.url),put:async(request,response)=>{entries.set(typeof request==='string'?request:request.url,response);}};
  vm.runInNewContext(source,{
    URL,Response,Request,
    self:{registration:{scope},clients:{claim:async()=>{}},addEventListener:(event,handler)=>{listeners[event]=handler;}},
    caches:{open:async()=>cache,keys:async()=>keys,delete:async key=>{removed.push(key);}},fetch
  });
  const fetchRequest=async(path,mode='cors')=>{
    let response;const request={method:'GET',url:new URL(path,scope).href,mode};
    listeners.fetch({request,respondWith:p=>{response=p;},waitUntil:p=>pending.push(p)});
    const result=response?await response:undefined;await Promise.all(pending);return result;
  };
  return {listeners,entries,removed,fetchRequest,pending};
}
test('offline navigation serves the cached shell, including install start URLs',async()=>{
  const w=worker({fetch:async()=>{throw new Error('offline');}});
  w.entries.set(scope+'index.html',new Response('<main>game</main>'));
  const response=await w.fetchRequest('./?source=pwa','navigate');assert.equal(await response.text(),'<main>game</main>');
});
test('online navigation fetches the new release and refreshes the canonical shell',async()=>{
  const w=worker({fetch:async()=>new Response('<main>new</main>',{headers:{'content-type':'text/html'}})});
  w.entries.set(scope+'index.html',new Response('old'));
  const response=await w.fetchRequest('./?release=2','navigate');assert.equal(await response.text(),'<main>new</main>');
  assert.equal(await w.entries.get(scope+'index.html').text(),'<main>new</main>');
});
test('cached versioned assets are served offline, and missing assets never receive HTML',async()=>{
  const w=worker({fetch:async()=>{throw new Error('offline');}});
  w.entries.set(scope+'engine.js?v=abc',new Response('game engine'));
  assert.equal(await(await w.fetchRequest('engine.js?v=abc')).text(),'game engine');
  w.entries.set(scope+'index.html',new Response('<main>game</main>'));
  const missing=await w.fetchRequest('unknown.js');assert.equal(missing.type,'error');
});
test('requests outside this application are never intercepted',async()=>{
  const w=worker();assert.equal(await w.fetchRequest('https://fonts.example.test/font.woff2'),undefined);
  assert.equal(await w.fetchRequest('https://example.test/another-game/'),undefined);
});
test('cache cleanup preserves other applications on the same origin',async()=>{
  const ownOld='breach-protocol:/scp-breach-protocol/:old';
  const other='breach-protocol:/another-game/:release';const w=worker({keys:[ownOld,other,'other-app-cache','breach-protocol-v1']});
  let done;w.listeners.activate({waitUntil:p=>{done=p;}});await done;
  assert.deepEqual(w.removed,[ownOld,'breach-protocol-v1']);
});
