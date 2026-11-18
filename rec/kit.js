// Clearshift guides - narration recorder for Google AI Studio (generate-speech page).
// Usage in the page console:  eval(await (await fetch(BASE+'rec/kit.js?v='+Date.now())).text()); __rec.start();
// Then poll: __rec.status()
(function(){
  const BASE='https://skuznitsky-clearshift.github.io/clearshift-guides/rec/';
  const ORDER=['he','en','ar','fr'];
  const KEY='cs_rec_done';
  // Chrome throttles timers in a hidden tab; there, waits are driven by small network requests instead
  const pause=ms=>new Promise(r=>setTimeout(r,ms));
  const netWait=async ms=>{const t=Date.now();while(Date.now()-t<ms){try{await fetch(BASE+'ping.txt?'+Date.now(),{cache:'no-store'})}catch(e){await pause(200)}}};
  const W=ms=>document.hidden?Promise.race([pause(ms),netWait(ms)]):pause(ms);
  const vis=s=>[...document.querySelectorAll(s)].filter(e=>e.offsetParent);
  const done=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch(e){return []}};
  const mark=n=>{const d=done();if(!d.includes(n)){d.push(n);localStorage.setItem(KEY,JSON.stringify(d))}};
  // v2 (18.11): Chrome blocked the 2nd+ automatic download, so clips were marked done but never saved.
  // Now every clip is kept in IndexedDB first and a run ends with ONE zip download of all clips not yet exported.
  if(!localStorage.getItem('cs_rec_v2')){localStorage.setItem(KEY,JSON.stringify(['cs-he-exbuy0','cs-he-exbuy3','cs-he-exbuy4']));localStorage.setItem('cs_rec_v2','1')}
  const db=()=>new Promise((ok,no)=>{const r=indexedDB.open('cs_rec',1);r.onupgradeneeded=()=>r.result.createObjectStore('clips');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});
  const tx=async(mode,fn)=>{const d=await db();return new Promise((ok,no)=>{const t=d.transaction('clips',mode),st=t.objectStore('clips');const out=fn(st);t.oncomplete=()=>ok(out&&out.result!==undefined?out.result:out);t.onerror=()=>no(t.error)})};
  const put=(n,v)=>tx('readwrite',st=>st.put(v,n));
  const all=async()=>{const d=await db();return new Promise((ok,no)=>{const res=[];const c=d.transaction('clips').objectStore('clips').openCursor();c.onsuccess=()=>{const k=c.result;if(k){res.push([k.key,k.value]);k.continue()}else ok(res)};c.onerror=()=>no(c.error)})};
  const CRC=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}return b=>{let c=0xFFFFFFFF;for(let i=0;i<b.length;i++)c=t[(c^b[i])&255]^(c>>>8);return (c^0xFFFFFFFF)>>>0}})();
  async function zip(files){const parts=[],cen=[];let off=0;const enc=new TextEncoder();
    for(const [name,blob] of files){const data=new Uint8Array(await blob.arrayBuffer()),nm=enc.encode(name),crc=CRC(data);
      const h=new DataView(new ArrayBuffer(30));h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint32(14,crc,true);h.setUint32(18,data.length,true);h.setUint32(22,data.length,true);h.setUint16(26,nm.length,true);
      parts.push(h.buffer,nm,data);
      const c=new DataView(new ArrayBuffer(46));c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint32(16,crc,true);c.setUint32(20,data.length,true);c.setUint32(24,data.length,true);c.setUint16(28,nm.length,true);c.setUint32(42,off,true);
      cen.push(c.buffer,nm);off+=30+nm.length+data.length}
    const csz=cen.reduce((a,b)=>a+(b.byteLength||b.length),0);const e=new DataView(new ArrayBuffer(22));e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);e.setUint32(12,csz,true);e.setUint32(16,off,true);
    return new Blob([...parts,...cen,e.buffer],{type:'application/zip'})}
  const R=window.__rec={busy:false,log:[],stop:false,state:'idle',
    status(){const d=done();return JSON.stringify({state:R.state,hidden:document.hidden,busy:R.busy,doneTotal:d.length,perLang:ORDER.map(l=>l+':'+d.filter(n=>n.startsWith('cs-'+l+'-')).length),session:R.log.slice(-30)})},
    async stored(){const a=await all();return JSON.stringify({total:a.length,notExported:a.filter(x=>!x[1].exported).map(x=>x[0])})},
    // one download with every clip not exported yet (all=true: every stored clip)
    async export(every){const a=(await all()).filter(x=>every||!x[1].exported);if(!a.length)return 'nothing to export';
      const z=await zip(a.map(x=>[x[0]+'.wav',x[1].blob]));const d=new Date(),stamp=d.toISOString().slice(0,16).replace(/[-:T]/g,'');
      const u=URL.createObjectURL(z);const l=document.createElement('a');l.href=u;l.download='cs-rec-'+stamp+'.zip';document.body.appendChild(l);l.click();l.remove();setTimeout(()=>URL.revokeObjectURL(u),120000);
      for(const [k,v] of a){v.exported=true;await put(k,v)}return 'exported '+a.length+' clips as cs-rec-'+stamp+'.zip'},
    unmark(n){localStorage.setItem(KEY,JSON.stringify(done().filter(x=>x!==n)))},
    async start(max,langs){
      if(R.busy)return 'already running';R.busy=true;R.stop=false;R.log=[];R.state='loading lists';max=max||40;
      try{
        // open a fresh dialog if the editor is not there yet
        let ta;for(let i=0;i<12;i++){ta=vis('textarea').sort((a,b)=>b.offsetWidth-a.offsetWidth)[0];if(ta)break;await W(1000)}
        if(!ta){const b=[...document.querySelectorAll('button,[role=button],a,div,span')].filter(e=>e.offsetParent&&/Create new dialog/.test(e.textContent||'')).sort((a,b)=>(a.textContent||'').length-(b.textContent||'').length)[0];if(b){b.click();await W(3500)}}
        let voice;for(let i=0;i<10;i++){voice=(document.body.innerText.match(/Speaker 1 - (\w+)/)||[])[1];if(voice)break;await W(1000)}
        if(voice!=='Fola'){R.state='STOP: voice is '+voice+' (expected Fola)';R.busy=false;return R.state}
        let todo=[];const d=done();
        for(const l of (langs||ORDER)){const r=await fetch(BASE+l+'.json?v='+Date.now());if(!r.ok)continue;for(const it of await r.json())if(!d.includes(it[0]))todo.push(it)}
        R.state='recording, '+todo.length+' left in total';let n=0;
        for(const [name,text] of todo){
          if(R.stop||n>=max)break;
          ta=vis('textarea').sort((a,b)=>b.offsetWidth-a.offsetWidth)[0];
          if(!ta){R.state='STOP: no text box';break}
          const before=(document.querySelector('audio')||{}).src||'';
          ta.focus();ta.select();document.execCommand('insertText',false,text);await W(600);
          const run=vis('button').find(b=>/^Run/.test(b.innerText.trim()));if(!run){R.state='STOP: no Run button';break}
          run.click();await W(2500);
          for(let i=0;i<120;i++){if(!vis('button').some(b=>b.innerText.trim().startsWith('progress_activity')))break;await W(1000)}
          let a,last=-1,same=0;
          for(let i=0;i<60;i++){a=document.querySelector('audio');const dur=a&&a.src&&a.src!==before?a.duration:0;if(dur>1.5&&dur===last){same++;if(same>=3)break}else same=0;last=dur;
            if(i>=6&&!(dur>0)&&/quota limit reached/i.test(document.body.innerText))break;await W(1000)}
          if(!a||!a.src||a.src===before||!(last>1.5)){const q=/quota limit reached/i.test(document.body.innerText);R.log.push([name,q?'QUOTA':'NO AUDIO']);R.state=q?'STOP: daily quota reached':'STOP: no audio for '+name;break}
          const blob=await (await fetch(a.src)).blob();
          const expect=Math.round(last*48000+44);
          if(Math.abs(blob.size-expect)>expect*0.03+2000){R.log.push([name,'SIZE MISMATCH',blob.size,expect]);R.state='STOP: size mismatch for '+name;break}
          await put(name,{blob,exported:false,t:Date.now()});
          mark(name);n++;R.log.push([name,'ok',Math.round(last*10)/10,blob.size]);await W(2000);
        }
        if(!/^STOP/.test(R.state))R.state='finished this run: '+n+' clips';
      }catch(e){R.state='STOP: error '+e}
      try{const x=await R.export();R.log.push(['export',x])}catch(e){R.log.push(['export','error '+e])}
      R.busy=false;return R.state;
    }};
  return 'recorder ready: __rec.start(max) / __rec.status()';
})();
