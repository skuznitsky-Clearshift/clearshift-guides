// Clearshift guides - "side by side" mode for desktop Chrome / Edge.
// Picking a language opens the real portal in a new tab and keeps the guide in a small always-on-top window.
(function(){
  var Q=new URLSearchParams(location.search);
  var PORTAL='https://www1.clearshiftinc.com/portal';
  var TXT={he:['המדריך פתוח בחלון הצף','הפורטל נפתח בלשונית חדשה. החלון הקטן עם המדריך נשאר תמיד מעל, גם כשלוחצים בפורטל.','לפתיחת הפורטל','להחזיר את המדריך לכאן'],
           en:['The guide is open in the floating window','The portal opened in a new tab. The small guide window always stays on top, even when you click in the portal.','Open the portal','Bring the guide back here'],
           ar:['الدليل مفتوح في النافذة العائمة','تم فتح البوابة في علامة تبويب جديدة. نافذة الدليل الصغيرة تبقى دائماً في الأعلى، حتى عند الضغط داخل البوابة.','فتح البوابة','إعادة الدليل إلى هنا'],
           fr:['Le guide est ouvert dans la fenêtre flottante','Le portail s’est ouvert dans un nouvel onglet. La petite fenêtre du guide reste toujours au premier plan, même quand vous cliquez dans le portail.','Ouvrir le portail','Ramener le guide ici']};
  if(Q.get('pip')==='1'){            // we are inside the floating window: skip the language screen and start
    var go=function(){var b=document.querySelector('#lang a[data-l="he"]');if(b)b.click()};
    if(document.readyState==='complete')setTimeout(go,300);else window.addEventListener('load',function(){setTimeout(go,300)});
    return;
  }
  var can=('documentPictureInPicture' in window)&&window.matchMedia('(min-width:900px)').matches&&Q.get('side')!=='0'&&(Q.get('side')==='1'||window.__CS_SIDE_DEFAULT);
  if(!can)return;
  var file=location.pathname.split('/').pop()||'index.html';
  function urlFor(l){
    var m=file.match(/^(.*?)(-(ar|en|fr))?\.html$/),base=m?m[1]:file.replace(/\.html$/,'');
    var q=new URLSearchParams(location.search);q.delete('side');q.set('pip','1');
    return new URL(((l&&l!=='he')?base+'-'+l:base)+'.html?'+q.toString(),location.href).href;
  }
  var pipWin=null,host=null;
  function showHost(l){
    var t=TXT[l]||TXT.he,rtl=(l==='he'||l==='ar'||!l);
    host=document.createElement('div');host.id='cs-side-host';host.dir=rtl?'rtl':'ltr';
    host.style.cssText='position:fixed;inset:0;z-index:2147483000;background:#f5f5f7;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;padding:24px;text-align:center;font-family:system-ui,Arial,sans-serif;color:#1d1d1f';
    host.innerHTML='<div style="font-size:30px;font-weight:800">'+t[0]+'</div><div style="font-size:18px;color:#6e6e73;max-width:560px;line-height:1.5">'+t[1]+'</div>'+
      '<a href="'+PORTAL+'" target="_blank" rel="noopener" style="background:#167398;color:#fff;text-decoration:none;font-size:20px;font-weight:700;border-radius:999px;padding:14px 34px">'+t[2]+'</a>'+
      '<button type="button" id="cs-side-back" style="background:none;border:0;color:#167398;font-size:16px;font-weight:600;cursor:pointer;font-family:inherit">'+t[3]+'</button>';
    document.body.appendChild(host);
    host.querySelector('#cs-side-back').addEventListener('click',function(){try{pipWin&&pipWin.close()}catch(e){}});
  }
  function restore(){if(host){host.remove();host=null}pipWin=null}
  function openSide(l){
    var p;try{p=documentPictureInPicture.requestWindow({width:400,height:760})}catch(e){return null}
    return p.then(function(w){
      pipWin=w;var d=w.document;d.title='Clearshift';d.documentElement.style.height='100%';d.body.style.cssText='margin:0;height:100%;background:#fff;overflow:hidden';
      var f=d.createElement('iframe');f.src=urlFor(l);f.allow='autoplay';f.style.cssText='border:0;width:100%;height:100%;display:block';d.body.appendChild(f);
      showHost(l);w.addEventListener('pagehide',restore);return true;
    }).catch(function(){return false});
  }
  document.addEventListener('click',function(e){
    var a=e.target&&e.target.closest&&e.target.closest('#lang a[data-l]');
    if(!a||pipWin||a.dataset.csSide==='skip')return;
    var l=a.dataset.l,p=openSide(l);if(!p)return;
    e.stopImmediatePropagation();                       // the guide starts inside the floating window, not here
    a.href=PORTAL;a.target='_blank';a.rel='noopener';   // the same click opens the portal in a new tab
    setTimeout(function(){a.removeAttribute('href');a.removeAttribute('target')},500);
    p.then(function(ok){if(!ok){a.dataset.csSide='skip';a.click();delete a.dataset.csSide}});
  },true);
})();
