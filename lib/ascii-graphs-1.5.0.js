/* Surftrack ASCII Graphs v1.4.0 — styled, persistent, origin-local journey diagnostics. */
(function (root) {
  'use strict';
  const instances = new Map();
  const VERSION = '1.5.0';
  const clean = value => String(value ?? '').replace(/[^a-zA-Z0-9_. /:-]/g, '?').slice(0, 48);
  const blank = value => !value || /^YOUR[_ ]/i.test(value);
  const text = value => String(value ?? '').replace(/[^\x20-\x7e]/g, '?');
  const fieldType = value => value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
  const fieldPreview = (value, raw) => {
    const type = fieldType(value);
    if (type === 'null') return 'null';
    if (type === 'boolean') return String(value);
    if (type === 'number') return raw ? String(value) : '<number>';
    if (type === 'string') return raw ? JSON.stringify(value.slice(0, 160)) : '<string:' + value.length + '>';
    if (type === 'array') return '<array:' + value.length + '>';
    return '<' + type + '>';
  };
  const spark = values => { const max = Math.max(1, ...values); return values.map(n => '▁▂▃▄▅▆▇█'[Math.min(7, Math.floor(n / max * 7))]).join(''); };

  const FONT = 'font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;line-height:1.5;';
  const PALETTE = {
    base: 'color:#c9d1d9',
    frame: 'color:#414868',
    brand: 'color:#7aa2f7;font-weight:800',
    title: 'color:#c0caf5;font-weight:700',
    dim: 'color:#565f89',
    label: 'color:#565f89',
    value: 'color:#c0caf5;font-weight:700',
    section: 'color:#bb9af7;font-weight:700',
    accent: 'color:#7dcfff',
    ok: 'color:#9ece6a;font-weight:700',
    warn: 'color:#e0af68;font-weight:700',
    err: 'color:#f7768e;font-weight:700',
    info: 'color:#7dcfff;font-weight:700',
    link: 'color:#7aa2f7;text-decoration:underline',
  };
  const style = key => FONT + (PALETTE[key] || PALETTE.base);

  function reportHTML(id) {
    const template = [
      '<!doctype html><html lang="en"><head><meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width,initial-scale=1">',
      '<title>Surftrack · live report</title><style>',
      ':root{--bg:#0b0f17;--panel:#111827;--line:#243049;--ink:#c9d1d9;--dim:#6b7a99;--accent:#7aa2f7;--ok:#9ece6a;--warn:#e0af68;--err:#f7768e;--info:#7dcfff;--purple:#bb9af7}',
      '*{box-sizing:border-box}',
      'body{margin:0;min-height:100vh;background:radial-gradient(1200px 620px at 15% -10%,#16213a 0,#0b0f17 58%);color:var(--ink);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:13px;line-height:1.5}',
      '.wrap{max-width:1080px;margin:0 auto;padding:26px 20px 70px}',
      'header{display:flex;align-items:center;gap:14px;flex-wrap:wrap;border-bottom:1px solid var(--line);padding-bottom:15px;margin-bottom:22px}',
      '.brand{font-weight:800;letter-spacing:1.5px;color:var(--accent);font-size:15px}',
      '.brand span{color:var(--dim);font-weight:600}',
      '.badge{padding:3px 11px;border-radius:999px;border:1px solid var(--line);font-size:11px;letter-spacing:.7px}',
      '.badge.info{color:var(--info);border-color:#1f4b5e}.badge.ok{color:var(--ok);border-color:#31502f}.badge.warn{color:var(--warn);border-color:#5c4722}.badge.err{color:var(--err);border-color:#5e2733}',
      '.grow{flex:1}.muted{color:var(--dim)}',
      '.btn{cursor:pointer;background:var(--panel);color:var(--ink);border:1px solid var(--line);border-radius:7px;padding:6px 12px;font:inherit;font-size:12px}',
      '.btn:hover{border-color:var(--accent);color:var(--accent)}',
      '.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:20px}',
      '.card{background:linear-gradient(180deg,#131c30,#0f1626);border:1px solid var(--line);border-radius:12px;padding:14px 15px}',
      '.card .k{font-size:10px;letter-spacing:1.2px;color:var(--dim);text-transform:uppercase}',
      '.card .v{font-size:26px;font-weight:800;color:#e6edf3;margin-top:6px;letter-spacing:-.5px}',
      '.card.accent .v{color:var(--accent)}.card.ok .v{color:var(--ok)}.card.purple .v{color:var(--purple)}',
      'section{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:16px 18px;margin-bottom:18px}',
      'section h2{font-size:11px;letter-spacing:1.4px;color:var(--purple);margin:0 0 12px;font-weight:700;text-transform:uppercase}',
      'table{width:100%;border-collapse:collapse;font-size:12.5px}',
      'th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #1b2438;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      'th{color:var(--dim);font-weight:600;font-size:10.5px;letter-spacing:.8px;text-transform:uppercase}',
      'td.num{text-align:right;color:#e6edf3;font-weight:700}',
      '.mixrow{display:grid;grid-template-columns:minmax(140px,1fr) 46px 3fr;gap:10px;align-items:center;padding:5px 0}',
      '.bar{height:9px;border-radius:6px;background:#1b2438;overflow:hidden}.bar i{display:block;height:100%;background:linear-gradient(90deg,#7aa2f7,#bb9af7)}',
      '.empty{color:var(--dim);padding:8px 0}',
      '#spark{width:100%;height:64px;display:block}',
      '.foot{color:var(--dim);font-size:11px;margin-top:22px;text-align:center}',
      'a{color:var(--accent)}',
      '.reset{width:100%;margin:0 0 20px;padding:16px;border-radius:12px;border:1px solid #5e2733;background:linear-gradient(180deg,#2a1420,#1c0f18);color:#f7768e;font:inherit;font-size:13px;font-weight:800;letter-spacing:1.6px;cursor:pointer;text-transform:uppercase}',
      '.reset:hover{border-color:var(--err);background:linear-gradient(180deg,#361726,#241019)}',
      '.reset.arm{color:#0b0f17;background:linear-gradient(180deg,#f7768e,#e0556f);border-color:#f7768e}',
      '.rawtoggle{cursor:pointer;background:var(--panel);color:var(--dim);border:1px solid var(--line);border-radius:7px;padding:6px 12px;font:inherit;font-size:12px}',
      '.rawtoggle.on{color:var(--warn);border-color:#5c4722}',
      '.evt{width:100%;border-collapse:collapse;font-size:12px}',
      '.evt td{padding:5px 8px;border-bottom:1px solid #1b2438;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:240px}',
      '.evt tr.head{cursor:pointer}.evt tr.head:hover td{background:#16203a}',
      '.evt tr.detail td{background:#0d1526;color:var(--dim);white-space:normal}',
      '.chip{display:inline-block;margin:2px 6px 2px 0;padding:2px 8px;border:1px solid var(--line);border-radius:999px;font-size:11px}',
      '.chip b{color:#e6edf3;font-weight:700}.chip i{color:var(--dim);font-style:normal}',
      '.chip.warn{color:var(--warn);border-color:#5c4722}',
      '.state{font-size:11px}.state.local{color:var(--dim)}.state.queued,.state.sending,.state.retrying{color:var(--warn)}.state.accepted{color:var(--ok)}.state.failed{color:var(--err)}',
      '.filters{display:flex;gap:8px;margin-bottom:10px}',
      '.filters input{flex:1;background:#0d1526;border:1px solid var(--line);border-radius:7px;color:var(--ink);padding:7px 10px;font:inherit;font-size:12px}',
      '</style></head><body><div class="wrap">',
      '<header><div class="brand">SURFTRACK <span>// LIVE REPORT</span></div>',
      '<span class="badge" id="mode">…</span>',
      '<span class="muted" id="host"></span>',
      '<span class="grow"></span>',
      '<button class="btn" id="pause">Pause</button>',
      '<button class="rawtoggle" id="raw">Raw values: off</button>',
      '<button class="btn" id="copy">Copy JSON</button></header>',
      '<button class="reset" id="reset">⟲ Reset all local data</button>',
      '<div class="kpis" id="kpis"></div>',
      '<section><h2>Activity / retained window</h2><svg id="spark" viewBox="0 0 600 64" preserveAspectRatio="none"></svg></section>',
      '<section><h2>Recent visits</h2><div id="visits"></div></section>',
      '<section><h2>Event mix</h2><div id="mix"></div></section>',
      '<section><h2>Schemas / fields seen per event</h2><div id="schemas"></div></section>',
      '<section><h2>Event stream / schema &amp; data sent</h2><div class="filters"><input id="filter" placeholder="filter by event name…" autocomplete="off"></div><div id="events"></div></section>',
      '<section><h2>Delivery</h2><div id="delivery"></div></section>',
      '<p class="foot">Local diagnostics only · data stays in this browser origin · refreshes live · <span id="updated"></span></p>',
      '</div><script>(function(){',
      'var ID=__ID__;var PREFIX="surftrack.debug.v1."+encodeURIComponent(ID)+".";var CFG="surftrack.config.v1."+encodeURIComponent(ID);var paused=false;var open={};',
      'function rawOn(){try{var c=JSON.parse(localStorage.getItem(CFG));return !!(c&&c.captureValues);}catch(e){return false;}}',
      'function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;"}[c];});}',
      'function dur(n){n=Math.floor(Number(n)||0);return Math.floor(n/60)+"m "+Math.floor(n%60)+"s";}',
      'function clock(ms){var d=new Date(ms);function p(x){return String(x).padStart(2,"0");}return p(d.getHours())+":"+p(d.getMinutes())+":"+p(d.getSeconds());}',
      'function read(){var out=[];for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(!k||k.indexOf(PREFIX)!==0)continue;try{var v=JSON.parse(localStorage.getItem(k));if(v&&(v.kind==="visit"||v.kind==="event")&&Number.isFinite(v.at))out.push(v);}catch(e){}}out.sort(function(a,b){return a.at-b.at;});return out;}',
      'function render(){var recs=read();var visits=recs.filter(function(x){return x.kind==="visit";});var events=recs.filter(function(x){return x.kind==="event";});',
      'var pages=events.filter(function(x){return x.event&&x.event.slice(-10)===".page_view";}).length;',
      'var clicks=events.filter(function(x){return x.event&&x.event.slice(-6)===".click";}).length;',
      'var scrolls=events.filter(function(x){return x.event&&x.event.slice(-13)===".scroll_depth";}).length;',
      'var secs=visits.reduce(function(n,v){return n+(Number(v.visible)||0);},0);',
      'var accepted=events.filter(function(x){return x.state==="accepted";}).length;',
      'var failed=events.filter(function(x){return x.state==="failed";}).length;',
      'var pending=events.filter(function(x){return x.state==="queued"||x.state==="sending"||x.state==="retrying";}).length;',
      'var blocked=!!navigator.globalPrivacyControl||navigator.doNotTrack==="1";',
      'var mode=blocked?"PRIVACY SIGNAL":accepted||failed?"CONNECTED":"LOCAL";',
      'document.getElementById("mode").textContent=mode;document.getElementById("mode").className="badge "+(blocked?"err":mode==="CONNECTED"?"ok":"info");',
      'document.getElementById("host").textContent=location.hostname+" · "+visits.length+" visits · "+events.length+" events";',
      'document.getElementById("kpis").innerHTML=[',
      '["Pageviews",pages,"accent"],["Clicks",clicks,""],["Scroll milestones",scrolls,"purple"],["Visible time",dur(secs),""],["Events",events.length,""],["Accepted",accepted,"ok"]',
      '].map(function(c){return \'<div class="card \'+c[2]+\'"><div class="k">\'+c[0]+\'</div><div class="v">\'+esc(c[1])+\'</div></div>\';}).join("");',
      'var bucketMs=60000,slots=30,now=Date.now(),base=now-(slots-1)*bucketMs,buckets=new Array(slots).fill(0);',
      'events.forEach(function(e){var i=Math.floor((e.at-base)/bucketMs);if(i>=0&&i<slots)buckets[i]++;});',
      'var max=Math.max(1,Math.max.apply(null,buckets));var step=600/(slots-1);',
      'var pts=buckets.map(function(n,i){return [i*step,60-(n/max)*54];});',
      'var line=pts.map(function(p,i){return (i?"L":"M")+p[0].toFixed(1)+" "+p[1].toFixed(1);}).join(" ");',
      'var area=line+" L600 64 L0 64 Z";',
      'document.getElementById("spark").innerHTML=\'<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7aa2f7" stop-opacity=".45"/><stop offset="1" stop-color="#7aa2f7" stop-opacity="0"/></linearGradient></defs><path d="\'+area+\'" fill="url(#g)"/><path d="\'+line+\'" fill="none" stroke="#7dcfff" stroke-width="2" stroke-linejoin="round"/>\';',
      'var vh=visits.slice(-12).reverse();',
      'document.getElementById("visits").innerHTML=vh.length?\'<table><thead><tr><th>Time</th><th>Page</th><th class="num">Visible</th><th class="num">Depth</th><th class="num">Events</th></tr></thead><tbody>\'+vh.map(function(v){var n=events.filter(function(e){return e.visit===v.id;}).length;return \'<tr><td>\'+clock(v.at)+\'</td><td title="\'+esc(v.path)+\'">\'+esc(v.path)+\'</td><td class="num">\'+dur(v.visible)+\'</td><td class="num">\'+(Number(v.progress)||0)+\'%</td><td class="num">\'+n+\'</td></tr>\';}).join("")+\'</tbody></table>\':\'<div class="empty">Waiting for the first page view.</div>\';',
      'var named={};events.forEach(function(e){named[e.event]=(named[e.event]||0)+1;});var top=Object.keys(named).map(function(k){return [k,named[k]];}).sort(function(a,b){return b[1]-a[1];}).slice(0,8);var mmax=Math.max(1,top.length?top[0][1]:1);',
      'document.getElementById("mix").innerHTML=top.length?top.map(function(t){return \'<div class="mixrow"><span title="\'+esc(t[0])+\'">\'+esc(t[0])+\'</span><span class="num">\'+t[1]+\'</span><span class="bar"><i style="width:\'+Math.round(t[1]/mmax*100)+\'%"></i></span></div>\';}).join(""):\'<div class="empty">No events recorded yet.</div>\';',
      'document.getElementById("delivery").innerHTML=\'<div class="mixrow"><span>Accepted</span><span class="num">\'+accepted+\'</span></div><div class="mixrow"><span>Pending / retrying</span><span class="num">\'+pending+\'</span></div><div class="mixrow"><span>Failed</span><span class="num">\'+failed+\'</span></div>\'+(accepted||failed?\'<div class="empty">Accepted means the collector received the event, not final destination storage.</div>\':\'<div class="empty">Local mode: events are recorded here without collector delivery.</div>\');',
      'var schemas={};events.forEach(function(e){(e.fields||[]).forEach(function(f){if(!schemas[e.event])schemas[e.event]={};schemas[e.event][f.n]=f.t;});});',
      'var sk=Object.keys(schemas).sort();',
      'document.getElementById("schemas").innerHTML=sk.length?sk.map(function(name){var fs=Object.keys(schemas[name]).sort();return \'<div style="margin-bottom:10px"><div><b>\'+esc(name)+\'</b></div><div>\'+fs.map(function(f){return \'<span class="chip"><b>\'+esc(f)+\'</b> <i>\'+esc(schemas[name][f])+\'</i></span>\';}).join("")+\'</div></div>\';}).join(""):\'<div class="empty">No fields captured yet. Properties appear here as events arrive.</div>\';',
      'var filt=String((document.getElementById("filter")||{}).value||"").toLowerCase();',
      'var list=events.slice().reverse().filter(function(e){return !filt||String(e.event).toLowerCase().indexOf(filt)>=0;}).slice(0,60);',
      'document.getElementById("events").innerHTML=list.length?\'<table class="evt"><tbody>\'+list.map(function(e){var fs=e.fields||[];var id=esc(e.id);return \'<tr class="head" data-id="\'+id+\'"><td>\'+clock(e.at)+\'</td><td><b>\'+esc(e.event)+\'</b></td><td>\'+esc(e.path)+\'</td><td class="state \'+esc(e.state||"local")+\'">\'+esc(e.state||"local")+\'</td><td>\'+fs.length+\' fields</td></tr><tr class="detail" id="d_\'+id+\'" style="display:\'+(open[e.id]?"table-row":"none")+\'"><td colspan="5">\'+(fs.length?fs.map(function(f){return \'<span class="chip"><b>\'+esc(f.n)+\'</b> <i>\'+esc(f.t)+\'</i> = \'+esc(f.v)+\'</span>\';}).join(""):"no properties")+((e.warnings&&e.warnings.length)?\' <span class="chip warn">\'+esc(e.warnings.join("; "))+\'</span>\':"")+\'</td></tr>\';}).join("")+\'</tbody></table>\':\'<div class="empty">No events match the filter.</div>\';',
      'var heads=document.querySelectorAll("#events tr.head");for(var hi=0;hi<heads.length;hi++){heads[hi].addEventListener("click",function(){var id=this.getAttribute("data-id");open[id]=!open[id];render();});}',
      'document.getElementById("updated").textContent="updated "+clock(now);',
      '}',
      'document.getElementById("pause").addEventListener("click",function(){paused=!paused;this.textContent=paused?"Resume":"Pause";});',
      'document.getElementById("copy").addEventListener("click",function(){try{navigator.clipboard.writeText(JSON.stringify(read(),null,2));this.textContent="Copied";var b=this;setTimeout(function(){b.textContent="Copy JSON";},1200);}catch(e){}});',
      'function syncRaw(){var b=document.getElementById("raw");var on=rawOn();b.textContent="Raw values: "+(on?"on":"off");b.className="rawtoggle"+(on?" on":"");}',
      'document.getElementById("raw").addEventListener("click",function(){try{var c=JSON.parse(localStorage.getItem(CFG))||{};c.captureValues=!c.captureValues;localStorage.setItem(CFG,JSON.stringify(c));}catch(e){}syncRaw();render();});',
      'var resetBtn=document.getElementById("reset");var armed=false,armTimer;',
      'resetBtn.addEventListener("click",function(){if(!armed){armed=true;this.classList.add("arm");this.textContent="Click again to wipe journey + settings";armTimer=setTimeout(function(){armed=false;resetBtn.classList.remove("arm");resetBtn.textContent="⟲ Reset all local data";},4000);return;}clearTimeout(armTimer);var keys=[];for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(k&&(k.indexOf(PREFIX)===0||k===CFG))keys.push(k);}keys.forEach(function(k){localStorage.removeItem(k);});open={};armed=false;this.classList.remove("arm");this.textContent="⟲ Reset all local data";syncRaw();render();});',
      'syncRaw();',
      'window.addEventListener("storage",render);setInterval(function(){if(!paused)render();},1000);render();',
      '})();</' + 'script></body></html>',
    ].join('');
    return template.split('__ID__').join(JSON.stringify(String(id)));
  }

  function init(options = {}) {
    const id = options.id || 'default';
    if (instances.has(id)) return instances.get(id);
    const blocked = !!navigator.globalPrivacyControl || navigator.doNotTrack === '1';
    const hasKey = !blank(options.writeKey), hasEndpoint = !blank(options.endpoint);
    let mode = blocked ? 'PRIVACY SIGNAL' : hasKey && hasEndpoint ? 'CONNECTED' : hasKey || hasEndpoint ? 'CONFIG REQUIRED' : 'LOCAL';
    let client, stopped = false, paused = false, timer, tick, visible = 0;
    let activeAt = document.hidden ? null : performance.now();
    const started = performance.now(), history = [], counts = new Map(), records = new Map(), buckets = [];
    const totals = {seen: 0, accepted: 0, attempts: 0, failed: 0, restoredAttempts: 0, restoredAccepted: 0};
    const listeners = []; let articleRead = false, progress = 0; const thresholds = new Set();
    const namespace = options.preset === 'website' ? 'surftrack' : 'blog';
    const article = document.querySelector(options.articleSelector || (options.preset === 'website' ? 'main' : 'article'));
    const visibleSeconds = () => (visible + (activeAt === null ? 0 : performance.now() - activeAt)) / 1000;
    const prefix = 'surftrack.debug.v1.' + encodeURIComponent(id) + '.';
    const configKey = 'surftrack.config.v1.' + encodeURIComponent(id);
    const rawCapture = () => { try { const c = JSON.parse(localStorage.getItem(configKey)); return !!(c && c.captureValues); } catch { return false; } };
    const visitId = crypto.randomUUID();
    const visit = {kind:'visit', id:visitId, at:Date.now(), path:location.pathname, visible:0, progress:0};
    let storageAvailable = !blocked && mode !== 'CONFIG REQUIRED', pendingJourneyId;
    const memory = new Map();
    const liveInterval = Number.isFinite(options.liveIntervalMs) ? Math.max(250, options.liveIntervalMs) : 1200;
    let liveEnabled = options.live === true, liveTimer, painted = 0, reportHref = '';

    function readJourney() {
      const found = new Map(memory);
      if(storageAvailable) try {
        for(let i=0;i<localStorage.length;i++) {
          const key=localStorage.key(i); if(!key?.startsWith(prefix)) continue;
          try { const value=JSON.parse(localStorage.getItem(key));
            if(value && ['visit','event'].includes(value.kind) && typeof value.id==='string' && Number.isFinite(value.at) && value.at>Date.now()-7*86400000) found.set(value.id,value);
          } catch { /* Ignore malformed debug records. */ }
        }
      } catch { storageAvailable=false; }
      return [...found.values()].filter(x=>x.at>Date.now()-7*86400000).sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id));
    }
    function prune() {
      if(!storageAvailable)return;
      try {
        const items=[];
        for(let i=0;i<localStorage.length;i++) {const key=localStorage.key(i);if(key?.startsWith(prefix))items.push(key);}
        const valid=[];
        for(const key of items) {try {const v=JSON.parse(localStorage.getItem(key));if(!v || !Number.isFinite(v.at) || v.at<Date.now()-7*86400000) localStorage.removeItem(key);else valid.push({key,...v});}catch{localStorage.removeItem(key);}}
        for(const kind of ['visit','event']) {const rows=valid.filter(v=>v.kind===kind).sort((a,b)=>b.at-a.at);for(const row of rows.slice(kind==='visit'?100:500))localStorage.removeItem(row.key);}
      } catch {storageAvailable=false;}
    }
    function save(record) {
      if(blocked||mode==='CONFIG REQUIRED')return;
      memory.set(record.id,{...record});if(memory.size>600)memory.delete(memory.keys().next().value);
      if(storageAvailable) try {localStorage.setItem(prefix+record.id,JSON.stringify(record));prune();} catch {storageAvailable=false;}
    }
    function saveVisit() {if(!stopped){visit.visible=Math.floor(visibleSeconds());visit.progress=progress;save(visit);}}
    function journey() {return readJourney();}
    function clearJourney() {
      memory.clear();
      try {const keys=[];for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(key?.startsWith(prefix))keys.push(key);}keys.forEach(key=>localStorage.removeItem(key));}catch{storageAvailable=false;}
      if(options.debug!==false)console.info('[Surftrack] Journey history cleared. New actions start a fresh history.');
      schedule();
    }
    const eventKey = name => counts.has(name) || counts.size < 50 ? name : 'other';
    function count(name) { const key = eventKey(clean(name)); if (!counts.has(key)) counts.set(key, {seen:0,accepted:0}); return counts.get(key); }
    function rate() { const now = Math.floor(performance.now()/5000); return Array.from({length:12},(_,i)=>buckets.filter(x=>x===now-11+i).length); }
    function snapshot() {
      const states = [...records.values()];
      return {storage:storageAvailable?'localStorage':'memory', journeyVisits:readJourney().filter(x=>x.kind==='visit').length, mode, path: location.pathname, elapsed: Math.floor((performance.now()-started)/1000), visible: Math.floor(visibleSeconds()), progress,
        ...totals, pending: states.filter(x=>x.state==='queued'||x.state==='attempt').length, retrying:states.filter(x=>x.state==='retry').length,
        diagnosticWindow:records.size, rate:rate(), events:Object.fromEntries([...counts].map(([k,v])=>[k,{...v}]))};
    }

    const WIDTH = 88, inner = WIDTH - 2, limit = inner - 2;
    const fit = (value,size) => { const t=text(value); return t.length>size ? t.slice(0,size-3)+'...' : t.padEnd(size); };
    const col = (value,size,s) => ({t:fit(value,size), s});
    const duration = n => Math.floor(n/60)+'m '+Math.floor(n%60)+'s';
    function row(segments, s) {
      const arr=(Array.isArray(segments)?segments:[{t:String(segments),s}]).map(x=>({t:x.t==null?'':String(x.t), s:x.s}));
      let plain=arr.reduce((n,x)=>n+x.t.length,0);
      let use=arr;
      if(plain>limit){ const t=arr.map(x=>x.t).join('').slice(0,limit-3)+'...'; use=[{t,s:s||'base'}]; plain=t.length; }
      const gap=Math.max(0,limit-plain);
      if(gap)use=use.concat([{t:' '.repeat(gap),s:s||'base'}]);
      return [{t:'│ ',s:'frame'},...use,{t:' │',s:'frame'}];
    }
    function splitRow(left,right) {
      const lp=left.reduce((n,x)=>n+x.t.length,0), rp=right.reduce((n,x)=>n+x.t.length,0);
      const gap=Math.max(1, limit-lp-rp);
      return row([...left,{t:' '.repeat(gap),s:'base'},...right]);
    }
    const topRule = [{t:'╭'+'─'.repeat(inner)+'╮', s:'frame'}];
    const midRule = [{t:'├'+'─'.repeat(inner)+'┤', s:'frame'}];
    const bottomRule = [{t:'╰'+'─'.repeat(inner)+'╯', s:'frame'}];

    function build() {
      const all=readJourney(), visits=all.filter(x=>x.kind==='visit'), events=all.filter(x=>x.kind==='event');
      const pages=events.filter(x=>x.event?.endsWith('.page_view')).length;
      const clicks=events.filter(x=>x.event?.endsWith('.click')).length;
      const scrolls=events.filter(x=>x.event?.endsWith('.scroll_depth')).length;
      const seconds=visits.reduce((n,v)=>n+(Number(v.visible)||0),0);
      const accepted=events.filter(x=>x.state==='accepted').length;
      const badge = mode==='CONNECTED'?'ok':mode==='LOCAL'?'info':mode==='CONFIG REQUIRED'?'warn':'err';
      const lines=[];
      lines.push(topRule);
      lines.push(splitRow(
        [{t:' SURFTRACK ',s:'brand'},{t:'▸ JOURNEY MONITOR',s:'title'}],
        [{t:'v'+VERSION+'  ',s:'dim'},{t:'● ',s:badge},{t:mode,s:badge}]
      ));
      lines.push(splitRow(
        [{t:(storageAvailable?'localStorage':'memory')+'  ·  '+location.hostname+'  ·  7-day window',s:'dim'}],
        [{t:'updated '+new Date().toTimeString().slice(0,8),s:'dim'}]
      ));
      lines.push(midRule);
      lines.push(row([
        col('PAGEVIEWS',14,'label'),col('CLICKS',12,'label'),col('SCROLL',12,'label'),
        col('VISIBLE',14,'label'),col('EVENTS',12,'label'),col('ACCEPTED',14,'label')
      ]));
      lines.push(row([
        col(pages,14,'value'),col(clicks,12,'value'),col(scrolls,12,'value'),
        col(duration(seconds),14,'value'),col(events.length,12,'value'),col(accepted,12,'value')
      ]));
      lines.push(row([
        {t:'activity  ',s:'label'},{t:spark(rate()),s:'accent'},
        {t:'   '+(storageAvailable?'persisted locally':'memory only'),s:'dim'}
      ]));
      lines.push(midRule);
      lines.push(row([{t:'RECENT VISITS',s:'section'}]));
      lines.push(row([
        col('TIME',10,'label'),col('PAGE',40,'label'),col('VISIBLE',9,'label'),col('DEPTH',8,'label'),col('EVENTS',17,'label')
      ]));
      for(const v of visits.slice(-8)) {
        const es=events.filter(e=>e.visit===v.id);
        lines.push(row([
          col(new Date(v.at).toTimeString().slice(0,8),10,'dim'),
          col(v.path,40,'base'),
          col(duration(Number(v.visible)||0),9,'base'),
          col((v.progress||0)+'%',8,'base'),
          col(es.length,17,'base')
        ]));
      }
      if(!visits.length)lines.push(row([{t:'Waiting for the first page view.',s:'dim'}]));
      lines.push(midRule);
      lines.push(row([{t:'EVENT MIX',s:'section'}]));
      const named=new Map();for(const event of events)named.set(event.event,(named.get(event.event)||0)+1);
      const top=[...named].sort((a,b)=>b[1]-a[1]).slice(0,5);const max=Math.max(1,...top.map(x=>x[1]));
      for(const [name,n] of top)lines.push(row([
        col(name,30,'base'),col(n,6,'value'),
        {t:'['+'█'.repeat(Math.max(1,Math.ceil(n/max*26))).padEnd(26,'·')+']',s:'accent'}
      ]));
      if(!top.length)lines.push(row([{t:'No events recorded yet.',s:'dim'}]));
      lines.push(midRule);
      const href=ensureReportHref();
      lines.push(splitRow(
        [{t:'▸ live report',s:'label'}],
        [{t:href||'run surftrackDebug.openReport()',s:href?'link':'dim'}]
      ));
      lines.push(row([{t:'summary() · journey() · openReport() · clearJourney() · help()',s:'dim'}]));
      lines.push(bottomRule);
      const plainText=lines.map(segs=>segs.map(s=>s.t).join('')).join('\n');
      const flat=[];
      lines.forEach((segs,i)=>segs.forEach((s,j)=>{
        flat.push({t:s.t+((j===segs.length-1&&i<lines.length-1)?'\n':''),s:s.s});
      }));
      return {text:plainText, segs:flat};
    }
    function paint() {
      const out=build();
      if(options.debug!==false&&!stopped){
        if(liveEnabled&&options.liveClear&&painted)console.clear();
        const fmt=[];const args=[];
        for(const seg of out.segs){fmt.push('%c'+seg.t.replace(/%/g,'%%'));args.push(style(seg.s));}
        console.log(fmt.join(''),...args);
        painted++;
      }
      return out.text;
    }
    function frame() {return build().text;}
    function summary() {saveVisit();return paint();}
    function redraw() {return paint();}
    function live(on) {
      liveEnabled=on!==false;
      if(liveEnabled)paint();else{clearTimeout(liveTimer);liveTimer=undefined;}
      return liveEnabled;
    }
    function schedule() {
      if(stopped||!liveEnabled||options.debug===false)return;
      if(liveTimer)return;
      liveTimer=setTimeout(()=>{liveTimer=undefined;paint();},liveInterval);
    }
    function ensureReportHref() {
      if(reportHref)return reportHref;
      try {
        if(options.reportUrl){try{reportHref=new URL(String(options.reportUrl).split('#')[0],location.href).href+'#'+encodeURIComponent(id);}catch{reportHref=String(options.reportUrl);}return reportHref;}
        if(typeof location!=='undefined'&&/(^|\.)surftrack\.io$/.test(location.hostname)){reportHref=location.origin+'/surftrack-report.html#'+encodeURIComponent(id);return reportHref;}
        reportHref=URL.createObjectURL(new Blob([reportHTML(id)],{type:'text/html'}));
      } catch { reportHref=''; }
      return reportHref;
    }
    function openReport() {
      const href=ensureReportHref();
      if(!href)return '';
      const opened=root.open(href,'surftrack-report');
      if(opened){try{opened.focus();}catch{/* Popup focus is best effort. */}}
      return href;
    }
    function observe(obs) {
      if(stopped||blocked)return;
      const known=records.get(obs.id);
      if(obs.stage==='queued') { if(records.size>=500)records.delete(records.keys().next().value);records.set(obs.id,{event:clean(obs.event),state:'queued'}); }
      else if(obs.stage==='attempt') { if(known){totals.attempts++;known.state='attempt';}else totals.restoredAttempts++; }
      else if(obs.stage==='accepted') {if(known&&known.state!=='accepted'){known.state='accepted';totals.accepted++;count(known.event).accepted++;}else if(!known)totals.restoredAccepted++;}
      else if(obs.stage==='retry'&&known)known.state='retry';
      else if(obs.stage==='failed'&&known&&known.state!=='failed'){known.state='failed';totals.failed++;}
      const entry=readJourney().find(x=>x.kind==='event'&&(x.sdkId===obs.id || (obs.stage==='queued'&&x.id===pendingJourneyId)));
      if(entry){entry.sdkId=obs.id;entry.state=obs.stage==='accepted'?'accepted':obs.stage==='failed'?'failed':obs.stage==='retry'?'retrying':obs.stage==='attempt'?'sending':'queued';save(entry);}
      schedule();
    }
    function track(event) {
      if(stopped||blocked||mode==='CONFIG REQUIRED')return;
      if(!event||typeof event.eventType!=='string'||!event.eventType.trim())throw new Error('eventType is required');
      const name=clean(event.eventType), props=event.properties||{}, warnings=[];
      const schema=options.schemas?.[event.eventType];
      if(schema) for(const [field,type] of Object.entries(schema)) {if(!(field in props))warnings.push('Missing field: '+clean(field));else if(typeof props[field]!==type)warnings.push('Type mismatch: '+clean(field));}
      const previous=history[history.length-1];if(previous&&previous.event===name&&performance.now()-previous.time<250)warnings.push('Rapid repeat: check instrumentation');
      saveVisit();
      const detail = event.eventType.endsWith('.scroll_depth') && [25,50,75,100].includes(props.threshold) ? props.threshold+'%' : event.eventType.endsWith('.cta_click') ? clean(props.cta) : event.eventType.endsWith('.outbound_click') ? clean(props.hostname) : '';
      const raw = rawCapture();
      const fields = Object.entries(props).slice(0, 30).map(([key, value]) => ({n:clean(key), t:fieldType(value), v:fieldPreview(value, raw)}));
      const entry={kind:'event',id:crypto.randomUUID(),visit:visitId,at:Date.now(),path:location.pathname,event:name,detail,state:client?'queued':'local',fields,warnings};
      save(entry);pendingJourneyId=entry.id;
      try {if(client)client.track(event);} catch(error){save({...entry,state:'enqueue failed'});throw error;} finally {pendingJourneyId=undefined;}
      totals.seen++;count(name).seen++;
      const now=performance.now();buckets.push(Math.floor(now/5000));while(buckets.length>2000||buckets[0]<Math.floor(now/5000)-11)buckets.shift();
      history.push({event:name,time:now,fields:Object.entries(props).slice(0,30).map(([key,value])=>clean(key)+': '+(value===null?'null':Array.isArray(value)?'array':typeof value)),warnings});if(history.length>100)history.shift();schedule();
    }
    function on(target,name,handler) {target.addEventListener(name,handler);listeners.push(()=>target.removeEventListener(name,handler));}
    function pageEvent(name,props={}){track({eventType:name.replace(/^blog\./, namespace+'.'),properties:{page:location.pathname,...props},platform:'web'});}
    function checkRead() {if(options.preset==='blog'&&article&&!articleRead&&progress>=75&&visibleSeconds()>=30){articleRead=true;pageEvent('blog.article_read');}}
    function scroll() {if(!article)return;const rect=article.getBoundingClientRect();const travel=Math.max(0,rect.height-innerHeight);progress=travel===0?(rect.top>=0&&rect.bottom<=innerHeight?100:0):Math.max(0,Math.min(100,Math.round(-rect.top/travel*100)));for(const n of [25,50,75,100])if(progress>=n&&!thresholds.has(n)){thresholds.add(n);pageEvent('blog.scroll_depth',{threshold:n});}checkRead();}
    const api={track,observe,summary,redraw,snapshot,journey,clearJourney,live,openReport,reportUrl:()=>ensureReportHref(),
      events:()=>{const rows=history.map(x=>({event:x.event,secondsAgo:Math.floor((performance.now()-x.time)/1000),fields:x.fields.join(', '),warnings:x.warnings.join('; ')}));if(options.debug!==false&&!stopped)console.table(rows);return rows;},
      help:()=>{const help='journey() · clearJourney() · summary() · redraw() · openReport() · live(true/false) · events() · snapshot() · pause() / resume() · destroy()';if(options.debug!==false)console.info(help);return help;},
      pause:()=>{paused=true;clearTimeout(timer);timer=undefined;},
      resume:()=>{paused=false;schedule();},
      destroy:()=>{if(stopped)return;saveVisit();stopped=true;clearTimeout(timer);clearTimeout(liveTimer);clearInterval(tick);listeners.forEach(fn=>fn());client?.destroy();instances.delete(id);history.length=0;records.clear();counts.clear();buckets.length=0;if(reportHref.startsWith('blob:')){try{URL.revokeObjectURL(reportHref);}catch{/* Already gone. */}reportHref='';}}};
    if(mode==='CONNECTED') {
      if(!root.Surftrack?.init)throw new Error('Load the Surftrack SDK before ASCII Graphs');
      client=root.Surftrack.init({endpoint:options.endpoint,writeKey:options.writeKey,storageKey:options.storageKey||'surftrack.pilot.'+id,debug:false,onDiagnostic:observe});
    }
    instances.set(id,api);
    if(!blocked&&mode!=='CONFIG REQUIRED') {
      on(document,'visibilitychange',()=>{if(document.hidden){if(activeAt!==null)visible+=performance.now()-activeAt;activeAt=null;}else activeAt=performance.now();saveVisit();schedule();});
      if(['blog','website'].includes(options.preset)) {
        pageEvent('blog.page_view');if(article&&options.preset==='blog')pageEvent('blog.article_view');scroll();on(window,'scroll',scroll);on(window,'resize',scroll);
        tick=setInterval(()=>{checkRead();if(Math.floor(visibleSeconds())%10===0)saveVisit();},1000);
        on(document,'click',e=>{pageEvent('blog.click');const target=e.target instanceof Element?e.target:null;const cta=target?.closest('[data-surftrack]');if(cta)pageEvent('blog.cta_click',{cta:clean(cta.getAttribute('data-surftrack'))});const link=target?.closest('a[href]');if(link){try{const url=new URL(link.href);if(['http:','https:'].includes(url.protocol)&&url.hostname!==location.hostname)pageEvent('blog.outbound_click',{hostname:url.hostname});}catch{}}});
      }
      on(window,'pagehide',()=>api.destroy());
      on(window,'popstate',()=>api.destroy());
    }
    if(!blocked&&mode!=='CONFIG REQUIRED'){saveVisit();prune();summary();}
    if(mode==='CONFIG REQUIRED'&&options.debug!==false)console.info('[Surftrack] Add both collector URL and write key, or leave both empty for local mode.');
    return api;
  }
  root.SurftrackAscii=Object.freeze({init,version:VERSION,reportHTML});
})(globalThis);
