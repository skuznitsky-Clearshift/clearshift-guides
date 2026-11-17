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
  const R=window.__rec={busy:false,log:[],stop:false,state:'idle',
    status(){const d=done();return JSON.stringify({state:R.state,hidden:document.hidden,busy:R.busy,doneTotal:d.length,perLang:ORDER.map(l=>l+':'+d.filter(n=>n.startsWith('cs-'+l+'-')).length),session:R.log.slice(-30)})},
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
          const u=URL.createObjectURL(blob);const l=document.createElement('a');l.href=u;l.download=name+'.wav';document.body.appendChild(l);l.click();l.remove();setTimeout(()=>URL.revokeObjectURL(u),60000);
          mark(name);n++;R.log.push([name,'ok',Math.round(last*10)/10,blob.size]);await W(2000);
        }
        if(!/^STOP/.test(R.state))R.state='finished this run: '+n+' clips';
      }catch(e){R.state='STOP: error '+e}
      R.busy=false;return R.state;
    }};
  return 'recorder ready: __rec.start(max) / __rec.status()';
})();
