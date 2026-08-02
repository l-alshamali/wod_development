// WOD Generator — Service Worker: يخلي البرنامج يشتغل بدون إنترنت بعد أول زيارة أونلاين
var CACHE='wod-offline-v2';
// نخزّن الصفحات صراحةً (مسارات نسبية → تشتغل حتى لو الموقع داخل مجلد فرعي)
var PRECACHE=['./','index.html','trial.html'];
self.addEventListener('install',function(e){
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function(c){
    // نخزّن كل ملف على حدة حتى لا يفشل الكل بفشل واحد
    return Promise.all(PRECACHE.map(function(u){return c.add(u).catch(function(){});}));
  }));
});
self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(ks){
    return Promise.all(ks.filter(function(k){return k!==CACHE;}).map(function(k){return caches.delete(k);}));
  }).then(function(){return self.clients.claim();}));
});
self.addEventListener('fetch',function(e){
  var req=e.request;
  if(req.method!=='GET')return;
  var url=new URL(req.url);
  // فحص الدخول (Supabase) يظل مباشر — عنده تجاوز عند فشل الاتصال داخل التطبيق
  if(url.hostname.indexOf('supabase')>=0)return;
  var isPage=req.mode==='navigate'||url.pathname.slice(-5)==='.html'||url.pathname.slice(-1)==='/';
  if(isPage){
    // الصفحات: نت أولاً (عشان تحديثاتك توصل)، وإذا ما في نت → من الكاش، وإلا أقرب صفحة مخزّنة
    e.respondWith(fetch(req).then(function(r){
      var cp=r.clone();caches.open(CACHE).then(function(c){c.put(req,cp);});return r;
    }).catch(function(){
      return caches.match(req).then(function(m){
        return m||caches.match('index.html').then(function(m2){return m2||caches.match('./');});
      });
    }));
  }else{
    // الخطوط والأصول: كاش أولاً، وإذا مو موجود → نت ثم خزّن
    e.respondWith(caches.match(req).then(function(m){
      return m||fetch(req).then(function(r){
        var cp=r.clone();caches.open(CACHE).then(function(c){c.put(req,cp);});return r;
      });
    }).catch(function(){return new Response('',{status:504});}));
  }
});
