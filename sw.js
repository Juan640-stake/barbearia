/* Guarda uma cópia das páginas para o app abrir mesmo sem internet. Busca sempre a versão nova primeiro. */
var CACHE='barbearia-v1';
self.addEventListener('install',function(){self.skipWaiting()});
self.addEventListener('activate',function(e){e.waitUntil(self.clients.claim())});
self.addEventListener('fetch',function(e){
  if(e.request.method!=='GET'||new URL(e.request.url).origin!==location.origin)return;
  e.respondWith(fetch(e.request).then(function(r){
    var copy=r.clone();
    caches.open(CACHE).then(function(c){c.put(e.request,copy)});
    return r;
  }).catch(function(){return caches.match(e.request,{ignoreSearch:true})}));
});
