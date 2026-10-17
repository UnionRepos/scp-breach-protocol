'use strict';
const VERSION='0a6e37c8d095';
const PREFIX='breach-protocol:'+new URL(self.registration.scope).pathname+':';
const CACHE_NAME=PREFIX+VERSION;
const APP_SHELL=[
  "./",
  "./index.html",
  "./style.css?v=986a62d6303d",
  "./audio.js?v=29d7cee8ad7f",
  "./engine.js?v=fcfe7ef3976e",
  "./art.js?v=b58c1c0db355",
  "./game.js?v=6199d9239d21",
  "./pwa.js?v=9433eeab5142",
  "./icon.svg",
  "./icons/icon-192.svg",
  "./icons/icon-512.svg",
  "./manifest.webmanifest"
];
const INDEX=new URL('./index.html',self.registration.scope).href;

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_SHELL.map(url=>new Request(url,{cache:'reload'})))).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>(key.startsWith(PREFIX)||key==='breach-protocol-v1')&&key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url),scope=new URL(self.registration.scope);
  if(request.method!=='GET'||url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname))return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE_NAME);
    if(request.mode==='navigate'){
      try{
        const response=await fetch(request);
        if(response.ok&&response.headers.get('content-type')?.includes('text/html'))event.waitUntil(cache.put(INDEX,response.clone()));
        return response;
      }catch{return await cache.match(INDEX)||Response.error();}
    }
    const cached=await cache.match(request);if(cached)return cached;
    try{return await fetch(request);}catch{return Response.error();}
  })());
});
