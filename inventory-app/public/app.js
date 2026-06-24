const socket = io();
let instruments = [];
let users = [];
let currentUserId = 1;

async function api(path, opts) {
  const res = await fetch('/api' + path, opts);
  return res.json();
}

function el(tag, cls, txt){const e=document.createElement(tag);if(cls)e.className=cls;if(txt)e.textContent=txt;return e}

async function loadUsers(){
  users = await api('/users');
  const sel = document.getElementById('userSelect');
  sel.innerHTML='';
  users.forEach(u=>{const o=document.createElement('option');o.value=u.id;o.textContent=u.name;sel.appendChild(o)});
  sel.value = currentUserId;
  sel.onchange = e=> currentUserId = Number(e.target.value);
}

function animateInView(){
  const obs = new IntersectionObserver(entries=>{
    entries.forEach(en=>{
      if(en.isIntersecting){
        en.target.classList.add('in-view');
        obs.unobserve(en.target);
      }
    });
  },{threshold:0.12});
  document.querySelectorAll('.animate-on-scroll').forEach(elm=>obs.observe(elm));
}

function animateCount(el, to){
  const start = 0; const duration = 800; const step = Math.max(1, Math.floor(to/30));
  let cur = start; const iv = setInterval(()=>{ cur += step; if(cur>=to){ el.textContent = to; clearInterval(iv); } else el.textContent = cur; }, Math.floor(duration/(to/step||1)));
}

function renderDashboard(){
  const main = document.getElementById('main'); main.innerHTML='';
  const wrap = el('div','grid');

  const totalCard = el('div','card animate-on-scroll');
  totalCard.appendChild(el('h2',null,'Total Instruments'));
  const kpi = el('div','kpi'); kpi.textContent = '0'; totalCard.appendChild(kpi);
  wrap.appendChild(totalCard);

  const booked = el('div','card animate-on-scroll');
  booked.appendChild(el('h2',null,'Booked'));
  const kpi2 = el('div','kpi'); kpi2.textContent='0'; booked.appendChild(kpi2);
  wrap.appendChild(booked);

  const dueCard = el('div','card animate-on-scroll');
  dueCard.appendChild(el('h2',null,'Due within 7 days'));
  const kpi3 = el('div','kpi'); kpi3.textContent='0'; dueCard.appendChild(kpi3);
  wrap.appendChild(dueCard);

  main.appendChild(wrap);

  // details table
  const listCard = el('div','card animate-on-scroll');
  listCard.appendChild(el('h2',null,'Recent Instruments'));
  const table = document.createElement('table'); table.className='table';
  table.innerHTML = '<tr><th>SNo</th><th>Name</th><th>Model</th><th>Serial</th><th>Status</th></tr>';
  instruments.slice(0,12).forEach((it,idx)=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${idx+1}</td><td>${it.name}</td><td>${it.model}</td><td>${it.serial}</td><td>${it.status}</td>`;
    if(it.nextCalibrationDate && (new Date(it.nextCalibrationDate)-new Date()) < 7*24*3600*1000) tr.classList.add('red');
    table.appendChild(tr);
  });
  listCard.appendChild(table);
  main.appendChild(listCard);

  animateInView();
  animateCount(kpi, instruments.length);
  animateCount(kpi2, instruments.filter(i=>i.status==='booked').length);
  animateCount(kpi3, instruments.filter(i=>i.nextCalibrationDate && (new Date(i.nextCalibrationDate)-new Date()) < 7*24*3600*1000).length);
}

function renderInventory(){
  const main = document.getElementById('main'); main.innerHTML='';
  const card = el('div','card animate-on-scroll');
  card.appendChild(el('h2', null, 'Inventory'));
  const addBtn = el('button','btn','Add Instrument');
  addBtn.style.marginBottom = '12px';
  addBtn.onclick = ()=> showAddInstrumentForm();
  card.appendChild(addBtn);
  const table = document.createElement('table'); table.className='table';
  table.innerHTML = '<tr><th>SNo</th><th>Name</th><th>Brand</th><th>Model</th><th>Serial</th><th>Status</th><th>Actions</th></tr>';
  instruments.forEach((it, idx)=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${idx+1}</td><td>${it.name}</td><td>${it.brand}</td><td>${it.model}</td><td>${it.serial}</td><td>${it.status}</td><td></td>`;
    const actions = tr.querySelector('td:last-child');
    const edit = el('button','btn ghost','Edit'); edit.onclick=()=>editInstrument(it);
    const del = el('button','btn ghost','Delete'); del.onclick=async()=>{await fetch('/api/instruments/'+it.id,{method:'DELETE'}); loadAll();}
    actions.appendChild(edit);actions.appendChild(del);
    if(it.nextCalibrationDate && (new Date(it.nextCalibrationDate) - new Date()) < 7*24*3600*1000){ tr.classList.add('red') }
    table.appendChild(tr);
  });
  card.appendChild(table);
  main.appendChild(card);
  animateInView();
}

function showAddInstrumentForm(){
  const main = document.getElementById('main'); main.innerHTML='';
  const card = el('div','card animate-on-scroll'); card.appendChild(el('h2',null,'Add Instrument'));
  const form = document.createElement('form');
  const fields = ['category','name','brand','model','serial','location','productImages','productOverview','specifications','parametersMeasured','accuracy','measurementRange','resolution','applications','operatingProcedure','calibrationProcedure','safetyInstructions','userManualUrl','youtubeUrl'];
  fields.forEach(k=>{
    const p = document.createElement('p'); p.appendChild(el('label',null,k));
    let inp;
    if(['productOverview','specifications','parametersMeasured','applications','operatingProcedure','calibrationProcedure','safetyInstructions'].includes(k)){
      inp = document.createElement('textarea'); inp.style.minHeight='80px';
    } else {
      inp = document.createElement('input'); inp.type='text';
    }
    inp.name = k; inp.style.width='100%'; inp.style.padding='8px'; inp.style.margin='6px 0'; p.appendChild(inp); form.appendChild(p);
  });
  const save = el('button','btn','Create'); save.type='submit';
  const cancel = el('button','btn ghost','Cancel'); cancel.type='button'; cancel.onclick = ()=> renderInventory();
  form.appendChild(save); form.appendChild(cancel);
  form.onsubmit = async e=>{ e.preventDefault(); const fd = Object.fromEntries(new FormData(form).entries()); if(fd.productImages) fd.productImages = fd.productImages.split(',').map(s=>s.trim()).filter(Boolean); await fetch('/api/instruments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(fd)}); await loadAll(); };
  card.appendChild(form); main.appendChild(card); animateInView();
}

function editInstrument(it){
  const main = document.getElementById('main'); main.innerHTML='';
  const card = el('div','card animate-on-scroll');
  card.appendChild(el('h2',null,'Edit Instrument'));
  const form = document.createElement('form');
  const fields = [
    {name:'category',type:'text'}, {name:'name',type:'text'}, {name:'brand',type:'text'}, {name:'model',type:'text'}, {name:'serial',type:'text'}, {name:'location',type:'text'},
    {name:'productImages',type:'text',hint:'comma-separated image URLs'},
    {name:'productOverview',type:'textarea'}, {name:'specifications',type:'textarea'}, {name:'parametersMeasured',type:'textarea'}, {name:'accuracy',type:'text'}, {name:'measurementRange',type:'text'}, {name:'resolution',type:'text'}, {name:'applications',type:'textarea'}, {name:'operatingProcedure',type:'textarea'}, {name:'calibrationProcedure',type:'textarea'}, {name:'safetyInstructions',type:'textarea'}, {name:'userManualUrl',type:'text',hint:'PDF URL'}
  ];
  // add youtube field
  fields.push({name:'youtubeUrl',type:'text',hint:'YouTube video URL'});
  fields.forEach(f=>{
    const p = document.createElement('p');
    p.appendChild(el('label',null,f.name));
    let inp;
    if(f.type === 'textarea'){
      inp = document.createElement('textarea'); inp.value = it[f.name]||''; inp.style.minHeight='80px';
    } else {
      inp = document.createElement('input'); inp.type = f.type || 'text'; inp.value = (it[f.name] && Array.isArray(it[f.name])) ? it[f.name].join(', ') : it[f.name] || '';
      if(f.hint) inp.placeholder = f.hint;
    }
    inp.name = f.name;
    inp.style.width='100%'; inp.style.padding='8px'; inp.style.margin='6px 0';
    p.appendChild(inp); form.appendChild(p);
  });
  const save = el('button','btn','Save'); save.type='submit';
  const cancel = el('button','btn ghost','Cancel'); cancel.type='button'; cancel.onclick = ()=> loadAll();
  form.appendChild(save); form.appendChild(cancel);
  form.onsubmit = async e=>{ e.preventDefault(); const fd = Object.fromEntries(new FormData(form).entries()); await fetch('/api/instruments/'+it.id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(fd)}); await loadAll(); };
  card.appendChild(form); main.appendChild(card);
  animateInView();
}

function renderBooking(){
  const main = document.getElementById('main'); main.innerHTML='';
  const card = el('div','card animate-on-scroll'); card.appendChild(el('h2',null,'Booking / Return'));
  // toolbar for bulk actions
  const toolbar = el('div','toolbar');
  const selectAll = el('button','btn ghost','Select All');
  const bulkBook = el('button','btn','Bulk Book');
  const bulkReturn = el('button','btn','Bulk Return');
  toolbar.appendChild(selectAll); toolbar.appendChild(bulkBook); toolbar.appendChild(bulkReturn);
  card.appendChild(toolbar);

  const list = el('div');
  instruments.forEach(it=>{
    const row = el('div','booking-row');
    const leftWrap = el('div','booking-left');
    const chk = document.createElement('input'); chk.type='checkbox'; chk.dataset.id = it.id; chk.className='booking-checkbox';
    const left = el('div','title', `${it.name} ${it.model} (${it.serial})`);
    left.title = `${it.name} ${it.model} (${it.serial})`;
    leftWrap.appendChild(chk); leftWrap.appendChild(left);
    const insightBadge = el('span','booking-insight', it.lastInsight ? `Last: ${it.lastInsight}` : '');
    const btn = el('button','btn booking-action-btn', it.status==='available' ? 'Book' : 'Return');
    btn.onclick = async ()=>{
      if(it.status==='available'){
        const m = await showModal('Book instrument', [{name:'days',label:'Days to book',value:'7',type:'number'},{name:'remarks',label:'Remarks',value:''}]);
        if (!m) return;
        const days = Number(m.days) || 7;
        const remarks = m.remarks || '';
        const res = await fetch('/api/book',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId: currentUserId, instrumentId: it.id, days, remarks})});
        const j = await res.json();
        if (j && j.sheet) offerDownload(j.sheet);
      } else {
        const m = await showModal('Return instrument', [{name:'remarks',label:'Return remarks',value:''},{name:'insight',label:'Optional insight / note',value:''}]);
        if (!m) return;
        const remarks = m.remarks || '';
        const insight = m.insight || '';
        await fetch('/api/return',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({instrumentId: it.id, remarks})});
        if (insight) await fetch('/api/instrument/insight',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({instrumentId: it.id, insight})});
      }
      await loadAll();
    };
    const controls = el('div','booking-controls');
    controls.appendChild(btn); controls.appendChild(insightBadge);
    row.appendChild(leftWrap); row.appendChild(controls);
    list.appendChild(row);
  });
  card.appendChild(list); main.appendChild(card);
  // attach toolbar handlers (ensure they are wired every render)
  selectAll.onclick = ()=>{
    const all = document.querySelectorAll('input[type="checkbox"][data-id]'); const any = Array.from(all).some(a=>!a.checked);
    all.forEach(a=> a.checked = any);
  };
  bulkBook.onclick = async ()=>{
    const ids = getCheckedInstrumentIds(); if(!ids.length) return alert('Select at least one instrument');
    const m = await showModal('Bulk Book instruments', [{name:'days',label:'Days to book',value:'7',type:'number'},{name:'remarks',label:'Remarks',value:''}]);
    if(!m) return; const days = Number(m.days)||7; const remarks = m.remarks||'';
    const res = await fetch('/api/book/bulk',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId: currentUserId, instrumentIds: ids, days, remarks})});
    const j = await res.json(); if(j && j.sheet) offerDownload(j.sheet); await loadAll();
  };
  bulkReturn.onclick = async ()=>{
    const ids = getCheckedInstrumentIds(); if(!ids.length) return alert('Select at least one instrument');
    const m = await showBulkReturnModal(ids);
    if(!m) return; const remarks = m.remarks||'';
    await fetch('/api/return/bulk',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({instrumentIds: ids, remarks})});
    if (m.per){
      for(const id of Object.keys(m.per)){
        const insight = m.per[id]; if(!insight) continue;
        await fetch('/api/instrument/insight',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({instrumentId: id, insight})});
      }
    }
    await loadAll();
  };
  animateInView();
}

// Bulk action helpers (query toolbar buttons dynamically)
function getCheckedInstrumentIds(){
  return Array.from(document.querySelectorAll('input[type="checkbox"][data-id]')).filter(c=>c.checked).map(c=>c.dataset.id);
}
const tb = document.querySelector('.toolbar');
if (tb) {
  const btns = tb.querySelectorAll('button');
  const selectAllBtn = btns[0];
  const bulkBookBtn = btns[1];
  const bulkReturnBtn = btns[2];
  selectAllBtn && (selectAllBtn.onclick = ()=>{
    const all = document.querySelectorAll('input[type="checkbox"][data-id]'); const any = Array.from(all).some(a=>!a.checked);
    all.forEach(a=> a.checked = any);
  });
  bulkBookBtn && (bulkBookBtn.onclick = async ()=>{
    const ids = getCheckedInstrumentIds(); if(!ids.length) return alert('Select at least one instrument');
    const m = await showModal('Bulk Book instruments', [{name:'days',label:'Days to book',value:'7',type:'number'},{name:'remarks',label:'Remarks',value:''}]);
    if(!m) return; const days = Number(m.days)||7; const remarks = m.remarks||'';
    const res = await fetch('/api/book/bulk',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId: currentUserId, instrumentIds: ids, days, remarks})});
    const j = await res.json(); if(j && j.sheet) offerDownload(j.sheet); await loadAll();
  });
  bulkReturnBtn && (bulkReturnBtn.onclick = async ()=>{
    const ids = getCheckedInstrumentIds(); if(!ids.length) return alert('Select at least one instrument');
    const m = await showBulkReturnModal(ids);
    if(!m) return; const remarks = m.remarks||'';
    await fetch('/api/return/bulk',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({instrumentIds: ids, remarks})});
    // apply per-instrument insights if provided
    if (m.per){
      for(const id of Object.keys(m.per)){
        const insight = m.per[id]; if(!insight) continue;
        await fetch('/api/instrument/insight',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({instrumentId: id, insight})});
      }
    }
    await loadAll();
  });
}

function renderCalibration(){
  const main = document.getElementById('main'); main.innerHTML='';
  const card = el('div','card animate-on-scroll'); card.appendChild(el('h2',null,'Calibration'));
  instruments.forEach(it=>{
    const row = el('div'); row.style.display='flex'; row.style.justifyContent='space-between'; row.style.alignItems='center'; row.style.padding='8px 0';
    const dueMs = it.nextCalibrationDate ? (new Date(it.nextCalibrationDate)-new Date()) : Infinity;
    const days = Math.round(dueMs / (24*3600*1000));
    const left = el('div',null, `${it.name} ${it.model} (${it.serial}) - next in ${isFinite(days)?days+' days':'n/a'}`);
    const btn = el('button','btn', 'Mark Calibrated'); btn.onclick = async ()=>{
      // show modal to accept certificate link and cycle days
      const m = await showModal('Calibrate instrument', [
        { name: 'certificateUrl', label: 'Certificate URL (optional)', value: it.calibrationCertificateUrl || '', type: 'text' },
        { name: 'cycleDays', label: 'Calibration cycle (days)', value: it.calibrationCycleDays || '365', type: 'number' }
      ]);
      if (!m) return;
      await fetch('/api/calibrate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({instrumentId: it.id, byUserId: currentUserId, certificateUrl: m.certificateUrl, cycleDays: m.cycleDays})});
      loadAll();
    };
    row.appendChild(left); row.appendChild(btn);
    if(dueMs < 7*24*3600*1000) row.classList.add('red');
    card.appendChild(row);
  });
  main.appendChild(card);
  animateInView();
}

function renderLearning(){
  const main = document.getElementById('main'); main.innerHTML='';
  const card = el('div','card animate-on-scroll'); card.appendChild(el('h2',null,'Learning'));
  instruments.forEach(it=>{
    const row = el('div'); row.style.display='flex'; row.style.gap='16px'; row.style.alignItems='flex-start';
    const left = el('div',null); left.style.minWidth='260px';
    if (it.productImages && it.productImages.length){
      it.productImages.forEach(url=>{ const i = document.createElement('img'); i.src = url; i.style.width='100%'; i.style.maxWidth='240px'; i.style.height='160px'; i.style.objectFit='cover'; i.style.marginBottom='8px'; left.appendChild(i); });
    } else {
      const placeholder = document.createElement('div'); placeholder.style.width='240px'; placeholder.style.height='160px'; placeholder.style.background='#f3f4f6'; placeholder.style.display='flex'; placeholder.style.alignItems='center'; placeholder.style.justifyContent='center'; placeholder.style.color='var(--muted)'; placeholder.textContent='No image'; left.appendChild(placeholder);
    }
    const right = el('div',null);
    const title = el('div',null, `${it.name} ${it.model}`); title.style.fontWeight='700'; title.style.fontSize='18px';
    const overview = el('div',null, it.productOverview || it.overview || '<i>No overview</i>'); overview.style.color='var(--muted)'; overview.style.marginTop='6px';
    const metaList = el('div',null,`Parameters: ${it.parametersMeasured||'n/a'} • Accuracy: ${it.accuracy||'n/a'} • Range: ${it.measurementRange||'n/a'} • Resolution: ${it.resolution||'n/a'}`);
    metaList.style.color='var(--muted)'; metaList.style.marginTop='8px';
    const specs = el('pre',null, it.specifications || it.specs || ''); specs.style.background='#fafafa'; specs.style.padding='8px'; specs.style.borderRadius='8px'; specs.style.whiteSpace='pre-wrap'; specs.style.marginTop='8px';
    const extra = el('div',null,''); extra.style.marginTop='8px';
    if(it.userManualUrl){ const a = document.createElement('a'); a.href = it.userManualUrl; a.textContent = 'Download user manual (PDF)'; a.target='_blank'; extra.appendChild(a); }
    // embed youtube if present
    if(it.youtubeUrl){
      try{
        const vid = (it.youtubeUrl.split('v=')[1] || it.youtubeUrl.split('/').pop()).split('&')[0];
        const iframe = document.createElement('iframe'); iframe.width='560'; iframe.height='315'; iframe.src = `https://www.youtube.com/embed/${vid}`; iframe.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'; iframe.style.marginTop='12px'; iframe.style.maxWidth='560px'; iframe.style.width='100%'; right.appendChild(iframe);
      }catch(e){ /* ignore */ }
    }
    right.appendChild(title); right.appendChild(overview); right.appendChild(metaList); right.appendChild(specs); right.appendChild(extra);
    row.appendChild(left); row.appendChild(right);
    card.appendChild(row);
  });
  main.appendChild(card);
  animateInView();
}

function setupNav(){
  document.querySelectorAll('.sidebar button').forEach(b=>b.onclick=e=>{document.querySelectorAll('.sidebar button').forEach(x=>x.classList.remove('active'));b.classList.add('active');const v=b.dataset.view; if(v==='dashboard')renderDashboard(); if(v==='inventory')renderInventory(); if(v==='booking')renderBooking(); if(v==='calibration')renderCalibration(); if(v==='learning')renderLearning();});
  document.getElementById('search').addEventListener('input',(e)=>{
    const q = e.target.value.toLowerCase();
    // simple client-side filter: filter instruments shown on inventory
    if(document.querySelector('.sidebar button.active').dataset.view === 'inventory') renderInventory();
  });
}

// Simple modal prompt to replace window.prompt() for automated environments
function showModal(title, fields) {
  return new Promise((resolve)=>{
    const overlay = document.createElement('div'); overlay.style.position='fixed'; overlay.style.left=0; overlay.style.top=0; overlay.style.right=0; overlay.style.bottom=0; overlay.style.background='rgba(0,0,0,0.4)'; overlay.style.display='flex'; overlay.style.alignItems='center'; overlay.style.justifyContent='center'; overlay.style.zIndex=9999;
    const box = document.createElement('div'); box.style.background='#fff'; box.style.padding='18px'; box.style.borderRadius='12px'; box.style.minWidth='320px'; box.style.boxShadow='0 8px 30px rgba(0,0,0,0.12)';
    const h = document.createElement('h3'); h.textContent = title; box.appendChild(h);
    const inputs = {};
    fields.forEach(f=>{
      const p = document.createElement('div'); p.style.margin='8px 0';
      const label = document.createElement('div'); label.textContent = f.label; label.style.fontSize='13px'; label.style.color='var(--muted)';
      const inp = document.createElement('input'); inp.value = f.value||''; inp.placeholder = f.placeholder||''; inp.style.width='100%'; inp.style.padding='8px'; inp.type = f.type||'text';
      p.appendChild(label); p.appendChild(inp); box.appendChild(p);
      inputs[f.name] = inp;
    });
    const actions = document.createElement('div'); actions.style.display='flex'; actions.style.justifyContent='flex-end'; actions.style.gap='8px'; actions.style.marginTop='12px';
    const ok = document.createElement('button'); ok.className='btn'; ok.textContent='OK';
    const cancel = document.createElement('button'); cancel.className='btn ghost'; cancel.textContent='Cancel';
    actions.appendChild(cancel); actions.appendChild(ok); box.appendChild(actions);
    overlay.appendChild(box); document.body.appendChild(overlay);
    ok.onclick = ()=>{
      const result = {};
      Object.keys(inputs).forEach(k=> result[k] = inputs[k].value);
      overlay.remove(); resolve(result);
    };
    cancel.onclick = ()=>{ overlay.remove(); resolve(null); };
  });
}

// show info modal (read-only) with lines
function showInfoModal(title, lines){
  return new Promise((resolve)=>{
    const overlay = document.createElement('div'); overlay.style.position='fixed'; overlay.style.left=0; overlay.style.top=0; overlay.style.right=0; overlay.style.bottom=0; overlay.style.background='rgba(0,0,0,0.4)'; overlay.style.display='flex'; overlay.style.alignItems='center'; overlay.style.justifyContent='center'; overlay.style.zIndex=9999;
    const box = document.createElement('div'); box.style.background='#fff'; box.style.padding='18px'; box.style.borderRadius='12px'; box.style.minWidth='320px'; box.style.maxWidth='680px'; box.style.maxHeight='70vh'; box.style.overflow='auto';
    const h = document.createElement('h3'); h.textContent = title; box.appendChild(h);
    lines.forEach(l=>{ const p=document.createElement('div'); p.style.margin='6px 0'; p.textContent = l; box.appendChild(p); });
    const ok = document.createElement('button'); ok.className='btn'; ok.textContent='OK'; ok.style.marginTop='12px'; ok.onclick = ()=>{ overlay.remove(); resolve(); };
    box.appendChild(ok); overlay.appendChild(box); document.body.appendChild(overlay);
  });
}

// bulk return modal supporting per-instrument insights
async function showBulkReturnModal(ids){
  return new Promise((resolve)=>{
    const overlay = document.createElement('div'); overlay.style.position='fixed'; overlay.style.left=0; overlay.style.top=0; overlay.style.right=0; overlay.style.bottom=0; overlay.style.background='rgba(0,0,0,0.4)'; overlay.style.display='flex'; overlay.style.alignItems='center'; overlay.style.justifyContent='center'; overlay.style.zIndex=9999;
    const box = document.createElement('div'); box.style.background='#fff'; box.style.padding='18px'; box.style.borderRadius='12px'; box.style.minWidth='420px'; box.style.maxHeight='80vh'; box.style.overflow='auto';
    const h = document.createElement('h3'); h.textContent = `Return ${ids.length} instruments`; box.appendChild(h);
    const summaryLabel = document.createElement('div'); summaryLabel.textContent='Common remarks (applies to all, optional)'; summaryLabel.style.marginTop='8px'; box.appendChild(summaryLabel);
    const summary = document.createElement('textarea'); summary.style.width='100%'; summary.style.minHeight='60px'; box.appendChild(summary);
    const perToggleWrap = document.createElement('div'); perToggleWrap.style.marginTop='8px'; const perToggle = document.createElement('input'); perToggle.type='checkbox'; perToggle.id='perInsToggle'; const perLabel = document.createElement('label'); perLabel.htmlFor='perInsToggle'; perLabel.textContent=' Add per-instrument notes'; perToggleWrap.appendChild(perToggle); perToggleWrap.appendChild(perLabel); box.appendChild(perToggleWrap);
    const perContainer = document.createElement('div'); perContainer.style.marginTop='8px'; box.appendChild(perContainer);
    perToggle.onchange = ()=>{
      perContainer.innerHTML='';
      if(perToggle.checked){
        ids.forEach(id=>{
          const inst = instruments.find(x=>String(x.id)===String(id)) || {name:id};
          const lbl = document.createElement('div'); lbl.textContent = inst.name; lbl.style.fontWeight='600'; lbl.style.marginTop='8px';
          const ta = document.createElement('textarea'); ta.dataset.id = id; ta.style.width='100%'; ta.style.minHeight='40px'; perContainer.appendChild(lbl); perContainer.appendChild(ta);
        });
      }
    };
    const actions = document.createElement('div'); actions.style.display='flex'; actions.style.justifyContent='flex-end'; actions.style.gap='8px'; actions.style.marginTop='12px';
    const cancel = document.createElement('button'); cancel.className='btn ghost'; cancel.textContent='Cancel';
    const ok = document.createElement('button'); ok.className='btn'; ok.textContent='Return';
    actions.appendChild(cancel); actions.appendChild(ok); box.appendChild(actions);
    overlay.appendChild(box); document.body.appendChild(overlay);
    cancel.onclick = ()=>{ overlay.remove(); resolve(null); };
    ok.onclick = ()=>{
      const result = { remarks: summary.value, per: {} };
      if(perToggle.checked){ Array.from(perContainer.querySelectorAll('textarea[data-id]')).forEach(t=> result.per[t.dataset.id]=t.value); }
      overlay.remove(); resolve(result);
    };
  });
}

async function loadAll(){
  instruments = await api('/instruments');
  renderDashboard();
}

socket.on('instruments', data => {
  instruments = data;
  // re-render currently active view
  const active = document.querySelector('.sidebar button.active');
  if (active) {
    const v = active.dataset.view;
    if (v === 'dashboard') renderDashboard();
    if (v === 'inventory') renderInventory();
    if (v === 'booking') renderBooking();
    if (v === 'calibration') renderCalibration();
    if (v === 'learning') renderLearning();
  } else {
    renderDashboard();
  }
});

socket.on('insight', async (data)=>{
  try{
    if (!data) return;
    if (data.toUserId && Number(data.toUserId) !== Number(currentUserId)) return;
    if (data.items && Array.isArray(data.items)){
      const lines = data.items.map(it => `${it.instrumentName}: ${it.insight || '<no previous insight>'}`);
      await showInfoModal('Previous insights for your booking', lines);
    }
  }catch(err){ console.error('insight socket handler', err); }
});

loadUsers(); setupNav(); loadAll();

// helper to show download link for booking sheet
function offerDownload(path) {
  const a = document.createElement('a');
  a.href = path;
  a.download = '';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

