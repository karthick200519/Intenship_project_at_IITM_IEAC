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

function formatDateLabel(value){
  if(!value) return 'Not set';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? 'Not set' : d.toLocaleDateString();
}

function renderCalibration(){
  const main = document.getElementById('main'); main.innerHTML='';
  const card = el('div','card'); card.appendChild(el('h2',null,'Calibration'));
  const intro = el('div','calibration-help','Keep track of calibration due dates and open the last uploaded certificate when available.');
  card.appendChild(intro);
  instruments.forEach(it=>{
    const row = el('div','calibration-row');
    const dueMs = it.nextCalibrationDate ? (new Date(it.nextCalibrationDate)-new Date()) : Infinity;
    const days = Math.round(dueMs / (24*3600*1000));
    const info = el('div','calibration-info');
    const title = el('div','calibration-title', `${it.name} ${it.model}`);
    const meta = el('div','calibration-meta', `Serial: ${it.serial} • Next due: ${isFinite(days) ? days + ' days' : 'n/a'} • Last: ${formatDateLabel(it.lastCalibrationDate)}`);
    info.appendChild(title); info.appendChild(meta);
    const actions = el('div','calibration-actions');
    const certBtn = el('button','btn ghost calibration-cert-btn', it.calibrationCertificateUrl ? 'View last certificate' : 'No certificate');
    certBtn.disabled = !it.calibrationCertificateUrl;
    certBtn.onclick = ()=>{
      if(it.calibrationCertificateUrl){ window.open(it.calibrationCertificateUrl, '_blank', 'noopener,noreferrer'); }
    };
    const calibrateBtn = el('button','btn','Mark Calibrated'); calibrateBtn.onclick = async ()=>{
      const m = await showModal('Calibrate instrument', [
        { name: 'certificateUrl', label: 'Certificate URL (optional)', value: it.calibrationCertificateUrl || '', type: 'text' },
        { name: 'cycleDays', label: 'Calibration cycle (days)', value: it.calibrationCycleDays || '365', type: 'number' }
      ]);
      if (!m) return;
      await fetch('/api/calibrate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({instrumentId: it.id, byUserId: currentUserId, certificateUrl: m.certificateUrl, cycleDays: m.cycleDays})});
      loadAll();
    };
    actions.appendChild(certBtn); actions.appendChild(calibrateBtn);
    row.appendChild(info); row.appendChild(actions);
    if(dueMs < 7*24*3600*1000) row.classList.add('red');
    card.appendChild(row);
  });
  main.appendChild(card);
  animateInView();
}

function openLearningModal(it){
  const overlay = el('div','learning-modal-overlay');
  const modal = el('div','learning-modal');
  const header = el('div','learning-modal-header');
  const titleWrap = el('div','learning-modal-title-wrap');
  const title = el('h3','learning-modal-title', `${it.name} ${it.model}`);
  const subtitle = el('div','learning-modal-subtitle', `${it.category || 'Instrument'} • ${it.brand || 'Premium instrument'}`);
  titleWrap.appendChild(title); titleWrap.appendChild(subtitle);
  const actions = el('div','learning-modal-actions');
  const backBtn = el('button','btn ghost learning-modal-back','Back');
  backBtn.onclick = ()=> overlay.remove();
  const closeBtn = el('button','btn ghost learning-modal-close','Close');
  closeBtn.onclick = ()=> overlay.remove();
  actions.appendChild(backBtn); actions.appendChild(closeBtn);
  header.appendChild(titleWrap); header.appendChild(actions);
  modal.appendChild(header);

  const body = el('div','learning-modal-body');
  const left = el('div','learning-modal-left');
  const imageWrap = el('div','learning-modal-gallery');
  const images = Array.isArray(it.productImages) ? it.productImages.filter(Boolean) : [];
  if (images.length){
    const mainImage = document.createElement('img');
    mainImage.src = images[0]; mainImage.alt = it.name; mainImage.className = 'learning-modal-main-image';
    imageWrap.appendChild(mainImage);
    if (images.length > 1) {
      const thumbs = el('div','learning-modal-thumbs');
      images.slice(1).forEach(src=>{
        const thumb = document.createElement('img'); thumb.src = src; thumb.alt = `${it.name} view`; thumb.className='learning-modal-thumb'; thumbs.appendChild(thumb);
      });
      imageWrap.appendChild(thumbs);
    }
  } else {
    imageWrap.appendChild(el('div','learning-modal-empty','No image available'));
  }
  left.appendChild(imageWrap);

  const summaryCard = el('div','learning-summary-card');
  const overview = el('div','learning-summary-block');
  overview.innerHTML = `<h4>Product Overview</h4><p>${(it.productOverview || 'A short overview helps explain the purpose and value of this instrument.').replace(/\n/g, '<br>')}</p>`;
  summaryCard.appendChild(overview);

  const quickFacts = el('div','learning-fact-grid');
  const factItems = [
    ['Model', it.model || 'Not set'],
    ['Brand', it.brand || 'Not set'],
    ['Serial', it.serial || 'Not set'],
    ['Category', it.category || 'Instrument']
  ];
  factItems.forEach(([label, value])=>{
    const fact = el('div','learning-fact');
    fact.innerHTML = `<strong>${label}</strong><span>${value}</span>`;
    quickFacts.appendChild(fact);
  });
  summaryCard.appendChild(quickFacts);
  left.appendChild(summaryCard);
  body.appendChild(left);

  const right = el('div','learning-modal-right');
  const sections = [
    ['Specifications', it.specifications],
    ['Parameters Measured', it.parametersMeasured],
    ['Accuracy', it.accuracy],
    ['Measurement Range', it.measurementRange],
    ['Resolution', it.resolution],
    ['Applications', it.applications],
    ['Operating Procedure', it.operatingProcedure],
    ['Calibration Procedure', it.calibrationProcedure],
    ['Safety Instructions', it.safetyInstructions]
  ];
  sections.forEach(([title, value])=>{
    const section = el('div','learning-detail-section');
    const heading = el('h4','learning-section-title', title);
    const content = el('div','learning-section-content');
    content.textContent = value || 'No information provided for this section yet.';
    content.style.whiteSpace = 'pre-wrap';
    section.appendChild(heading); section.appendChild(content); right.appendChild(section);
  });

  const links = el('div','learning-links');
  if (it.userManualUrl) {
    const manual = document.createElement('a'); manual.href = it.userManualUrl; manual.target='_blank'; manual.rel='noopener'; manual.className='learning-link-btn'; manual.textContent = 'Open user manual'; links.appendChild(manual);
  }
  if (it.youtubeUrl) {
    const video = document.createElement('a'); video.href = it.youtubeUrl; video.target='_blank'; video.rel='noopener'; video.className='learning-link-btn'; video.textContent = 'Watch demo video'; links.appendChild(video);
  }
  if (links.childNodes.length) {
    right.appendChild(links);
  }

  body.appendChild(right);
  modal.appendChild(body);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';
  overlay.addEventListener('click', (event) => { if (event.target === overlay) { overlay.remove(); document.body.style.overflow = ''; } });
  const handleKey = (event) => { if (event.key === 'Escape') { overlay.remove(); document.body.style.overflow = ''; document.removeEventListener('keydown', handleKey); } };
  document.addEventListener('keydown', handleKey);
}

function renderLearning(){
  const main = document.getElementById('main'); main.innerHTML='';
  const card = el('div','card'); card.appendChild(el('h2',null,'Learning'));
  const hero = el('div','learning-hero');
  hero.innerHTML = '<h3>Learn with focused instrument details</h3><p>Select a card to open a polished details pop-up with images, overview, technical details, safety notes, manuals, and demo videos.</p>';
  card.appendChild(hero);
  if (!instruments.length) {
    const empty = el('div','learning-placeholder','No instruments are available yet. Add one in Inventory to start learning about it.');
    card.appendChild(empty);
    main.appendChild(card);
    return;
  }

  const grid = el('div','learning-grid');
  card.appendChild(grid);

  instruments.forEach(it=>{
    const preview = el('button','learning-preview');
    preview.type = 'button';
    preview.dataset.id = it.id;
    const imageWrap = el('div','learning-preview-image');
    if (it.productImages && it.productImages.length){
      const img = document.createElement('img'); img.src = it.productImages[0]; img.alt = it.name; img.className='learning-image'; imageWrap.appendChild(img);
    } else {
      const placeholder = el('div','learning-placeholder','No image'); imageWrap.appendChild(placeholder);
    }
    const info = el('div','learning-preview-info');
    const title = el('div','learning-preview-title', `${it.name}`);
    const model = el('div','learning-preview-model', it.model || 'Model not set');
    const badge = el('div','learning-preview-badge', it.category || 'Instrument');
    info.appendChild(title); info.appendChild(model); info.appendChild(badge);
    preview.appendChild(imageWrap); preview.appendChild(info);
    preview.addEventListener('click', (event) => {
      event.preventDefault();
      document.querySelectorAll('.learning-preview').forEach(btn => btn.classList.remove('active'));
      preview.classList.add('active');
      openLearningModal(it);
    });
    grid.appendChild(preview);
  });

  main.appendChild(card);
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
  try {
    instruments = await api('/instruments');
  } catch (err) {
    console.error('Failed to load instruments', err);
    instruments = [];
  }
  const active = document.querySelector('.sidebar button.active');
  if (active) {
    const v = active.dataset.view;
    if (v === 'dashboard') renderDashboard();
    if (v === 'inventory') renderInventory();
    if (v === 'booking') renderBooking();
    if (v === 'calibration') renderCalibration();
    if (v === 'learning') renderLearning();
  } else {
    renderLearning();
  }
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

