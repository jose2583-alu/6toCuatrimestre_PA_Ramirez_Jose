// ============================================================
//  AnimeX - Panel Admin v4
//  Videos se suben DESPUÉS de guardar el anime (2 pasos)
//  para evitar que el POST grande cancele el nombre
// ============================================================

let adminUser      = null;
let allAnimes      = [];
let allGeneros     = [];
let editingId      = null;
let selGenres      = new Set();
let currentLangTab = 'esp_lat';
// { 'esp_lat_1': File, 'jpn_esp_3': File, ... }
let videoFiles     = {};

const langInfo = {
  esp_lat: { label: 'Español Latino (doblaje)',        flag: '🇲🇽' },
  jpn_esp: { label: 'Japonés + Subtítulos en Español', flag: '🇯🇵' },
  eng_esp: { label: 'Inglés + Subtítulos en Español',  flag: '🇺🇸' },
};

// ── INIT ──────────────────────────────────────────────────────
(async () => {
  adminUser = await guardAuth('admin');
  if (!adminUser) return;
  document.getElementById('admin-wrap').style.display = 'flex';
  document.getElementById('admin-username').textContent = adminUser.username;
  await Promise.all([loadAnimes(), loadGeneros()]);
  renderStats(); renderDashboard(); renderGenreChips(); buildLangTab('esp_lat');
})();

async function loadAnimes()  { allAnimes  = await API.getAnimes().catch(() => []); }
async function loadGeneros() { allGeneros = await API.getGeneros().catch(() => []); }

// ── SECTIONS ──────────────────────────────────────────────────
function showSection(name) {
  document.querySelectorAll('.section-view').forEach(v => v.style.display = 'none');
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  document.getElementById('sec-' + name).style.display = 'block';
  const btn = document.getElementById('si-' + name);
  if (btn) btn.classList.add('active');
  if (name === 'animes')    renderAnimeTable();
  if (name === 'users')     renderUsersTable();
  if (name === 'dashboard') { renderStats(); renderDashboard(); }
  if (name === 'add')       { renderGenreChips(); buildLangTab(currentLangTab); }
  if (name === 'subs')      renderSubsSection();
  if (name === 'anuncios')  renderAnunciosTable();
  if (name === 'productos') { renderProductosAnimeSelect(); renderProductosTable(); }
  if (name === 'manga')     initMangaSection();
  if (name === 'chat')      initChatAdminSection();
}

// ── STATS ──────────────────────────────────────────────────────
function renderStats() {
  document.getElementById('stats-grid').innerHTML = [
    { label:'Total Animes', value: allAnimes.length },
    { label:'En Emisión',   value: allAnimes.filter(a=>a.estado==='En emisión').length },
    { label:'Finalizados',  value: allAnimes.filter(a=>a.estado==='Finalizado').length },
    { label:'Nuevos',       value: allAnimes.filter(a=>+a.es_nuevo).length },
  ].map(s=>`<div class="stat-card"><div class="stat-value">${s.value}</div><div class="stat-label">${s.label}</div></div>`).join('');
}

function renderDashboard() {
  document.getElementById('dash-tbody').innerHTML = allAnimes.slice(0,8).map(a => {
    const gs = (a.generos||[]).map(g=>typeof g==='object'?g.nombre:g);
    return `<tr>
      <td><div class="table-thumb">${a.cover_path?`<img src="${coverSrc(a.cover_path)}" alt="">`:''}</div></td>
      <td style="font-weight:800">${escHtml(a.nombre)}</td>
      <td>${gs.slice(0,2).join(', ')}</td>
      <td><span class="badge ${a.estado==='En emisión'?'badge-emit':'badge-fin'}">${a.estado}</span></td>
      <td><div class="row-actions">
        <button class="btn btn-sm" style="background:rgba(255,209,102,.12);border:1px solid rgba(255,209,102,.3);color:var(--gold)" onclick="editAnime(${a.id})">✏️ Editar</button>
        <button class="btn btn-danger btn-sm" onclick="confirmDelete(${a.id},'${escHtml(a.nombre)}')">🗑️</button>
      </div></td></tr>`;
  }).join('');
}

// ── ANIME TABLE ────────────────────────────────────────────────
function renderAnimeTable(filter='') {
  let list = filter ? allAnimes.filter(a=>a.nombre.toLowerCase().includes(filter.toLowerCase())) : allAnimes;
  document.getElementById('anime-total').textContent = `(${list.length})`;
  document.getElementById('anime-tbody').innerHTML = list.map(a => {
    const gs = (a.generos||[]).map(g=>typeof g==='object'?g.nombre:g);
    return `<tr>
      <td><div class="table-thumb">${a.cover_path?`<img src="${coverSrc(a.cover_path)}" alt="">`:''}</div></td>
      <td style="font-weight:800;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(a.nombre)}</td>
      <td>${a.anio}</td><td>${a.episodios}</td>
      <td><span class="badge ${a.estado==='En emisión'?'badge-emit':'badge-fin'}">${a.estado}</span></td>
      <td style="max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${gs.slice(0,2).join(', ')}</td>
      <td><span class="text-gold">⭐ ${a.rating}</span></td>
      <td><div class="row-actions">
        <button class="btn btn-sm" style="background:rgba(255,209,102,.12);border:1px solid rgba(255,209,102,.3);color:var(--gold)" onclick="editAnime(${a.id})">✏️ Editar</button>
        <button class="btn btn-danger btn-sm" onclick="confirmDelete(${a.id},'${escHtml(a.nombre)}')">🗑️ Eliminar</button>
      </div></td></tr>`;
  }).join('');
}
function filterTable(v) { renderAnimeTable(v); }

// ── GENRE CHIPS ────────────────────────────────────────────────
function renderGenreChips() {
  const el = document.getElementById('genre-chips');
  if (!el) return;
  el.innerHTML = allGeneros.map(g=>
    `<div class="chip ${selGenres.has(g.id)?'selected':''}" onclick="toggleGenre(${g.id},this)">${g.nombre}</div>`
  ).join('');
}
function toggleGenre(id, el) {
  selGenres.has(id) ? (selGenres.delete(id), el.classList.remove('selected'))
                    : (selGenres.add(id),    el.classList.add('selected'));
}

// ── LANG TAB CON SELECTOR DE CAPÍTULO ─────────────────────────
function buildLangTab(lang) {
  currentLangTab = lang;
  document.querySelectorAll('.lang-tab').forEach(b => b.classList.remove('active'));
  const btn = document.querySelector(`.lang-tab[data-lang="${lang}"]`);
  if (btn) btn.classList.add('active');

  const info   = langInfo[lang];
  const maxEps = Math.max(1, parseInt(document.getElementById('f-eps')?.value) || 99);
  const assigned = Object.entries(videoFiles).filter(([k])=>k.startsWith(lang+'_'));

  let listHTML = '';
  if (assigned.length) {
    listHTML = `<div style="margin-bottom:14px">
      <p style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:1px;font-weight:800;margin-bottom:8px">Videos en cola</p>
      ${assigned.map(([k,f])=>{
        const ep = k.replace(lang+'_','');
        return `<div style="display:flex;align-items:center;gap:10px;padding:9px 12px;background:rgba(6,214,160,.08);border:1px solid rgba(6,214,160,.2);border-radius:8px;margin-bottom:6px;font-size:13px">
          <span style="color:var(--green);font-size:16px">✓</span>
          <span style="font-weight:800;min-width:60px">Ep. ${ep}</span>
          <span style="color:var(--text2);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${f.name}</span>
          <button onclick="removeVideo('${k}')" style="background:rgba(230,57,70,.15);border:1px solid rgba(230,57,70,.3);color:var(--accent);border-radius:4px;padding:3px 8px;cursor:pointer;font-size:11px;font-weight:800;flex-shrink:0">✕ Quitar</button>
        </div>`;
      }).join('')}
    </div>`;
  }

  document.getElementById('video-tab-content').innerHTML = `
    <p style="font-size:14px;color:var(--text2);margin-bottom:14px">${info.flag} <strong>${info.label}</strong></p>
    ${listHTML}
    <div style="display:grid;grid-template-columns:180px 1fr;gap:12px;align-items:end">
      <div>
        <p style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:1px;font-weight:800;margin-bottom:6px">Capítulo</p>
        <select id="ep-select-${lang}" style="width:100%">
          ${Array.from({length:maxEps},(_,i)=>`<option value="${i+1}">Episodio ${i+1}</option>`).join('')}
        </select>
      </div>
      <div>
        <p style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:1px;font-weight:800;margin-bottom:6px">Archivo MP4</p>
        <label class="upload-zone" for="f-vid-input-${lang}" style="padding:16px;margin:0;display:flex;align-items:center;gap:12px;justify-content:center">
          <span style="font-size:22px">🎬</span>
          <span style="font-size:13px">Clic para seleccionar MP4</span>
        </label>
        <input type="file" id="f-vid-input-${lang}" accept="video/mp4,video/*" onchange="onVideoChange('${lang}',this)">
      </div>
    </div>
    <p style="font-size:12px;color:var(--text3);margin-top:10px">💡 Puedes agregar varios episodios. Los videos se subirán al guardar el anime.</p>`;
}

function onVideoChange(lang, input) {
  const f = input.files[0];
  if (!f) return;
  const ep  = document.getElementById('ep-select-' + lang)?.value || '1';
  const key = lang + '_' + ep;
  videoFiles[key] = f;
  showToast(`✅ Ep. ${ep} listo para subir`);
  buildLangTab(lang);
  input.value = '';
}
function removeVideo(key) {
  delete videoFiles[key];
  const lang = key.startsWith('jpn') ? 'jpn_esp' : key.startsWith('eng') ? 'eng_esp' : 'esp_lat';
  buildLangTab(lang);
}

// ── COVER ──────────────────────────────────────────────────────
function onCoverChange(input) {
  const f = input.files[0];
  if (!f) return;
  document.getElementById('cover-name').textContent = '✓ ' + f.name;
  const prev = document.getElementById('cover-preview');
  prev.src = URL.createObjectURL(f);
  prev.style.display = 'block';
}

// ── GUARDAR ANIME (2 pasos) ─────────────────────────────────
async function submitAnime() {
  const name = document.getElementById('f-name').value.trim();
  if (!name)           { showToast('⚠️ El nombre es obligatorio', true); return; }
  if (!selGenres.size) { showToast('⚠️ Selecciona al menos un género', true); return; }

  const btn = document.getElementById('save-btn');
  btn.innerHTML = '<div class="loader"></div> Guardando info...';
  btn.disabled  = true;

  // animeId se determina AQUÍ y no cambia
  let animeId = editingId ? parseInt(editingId) : null;

  try {
    // ── PASO 1: info + portada SOLAMENTE (sin videos, sin _method en video) ──
    const fd = new FormData();
    fd.append('nombre',      name);
    fd.append('descripcion', document.getElementById('f-desc').value);
    fd.append('anio',        document.getElementById('f-year').value    || new Date().getFullYear());
    fd.append('episodios',   document.getElementById('f-eps').value     || 1);
    fd.append('estado',      document.getElementById('f-status').value);
    fd.append('rating',      document.getElementById('f-rating').value  || 0);
    fd.append('es_nuevo',    document.getElementById('f-new').checked ? '1' : '0');
    fd.append('generos',     JSON.stringify([...selGenres]));

    const coverInput = document.getElementById('f-cover');
    if (coverInput.files[0]) fd.append('cover', coverInput.files[0]);

    let paso1url, paso1method;
    if (animeId) {
      // Edición: POST con _method=PUT
      fd.append('_method', 'PUT');
      fd.append('id',      String(animeId));
      paso1url    = '/animex/api/animes.php?id=' + animeId;
      paso1method = 'POST';
    } else {
      // Nuevo anime
      paso1url    = '/animex/api/animes.php';
      paso1method = 'POST';
    }

    const r1 = await fetch(paso1url, { method: paso1method, credentials: 'include', body: fd });
    const d1 = await r1.json();
    if (d1.error) throw new Error(d1.error);

    // Para nuevo anime, tomar el ID del response
    if (!animeId) {
      animeId = parseInt(d1.id);
      if (!animeId || isNaN(animeId)) throw new Error('No se recibió el ID del anime: ' + JSON.stringify(d1));
    }

    showToast(editingId ? '✅ Info actualizada' : '✅ Anime creado (ID:' + animeId + ')');

    // ── PASO 2: Subir videos uno a uno (FormData limpio, sin _method) ──
    const videoEntries = Object.entries(videoFiles);
    if (videoEntries.length > 0) {
      btn.innerHTML = `<div class="loader"></div> Subiendo videos (0/${videoEntries.length})...`;
      let subidos = 0;

      for (const [key, file] of videoEntries) {
        // key ejemplos: 'esp_lat_1', 'jpn_esp_3', 'eng_esp_12'
        // Separar episodio (último _numero) del idioma (todo lo anterior)
        const lastUnderscore = key.lastIndexOf('_');
        const idioma = key.substring(0, lastUnderscore);   // 'esp_lat' o 'jpn_esp' o 'eng_esp'
        const ep     = key.substring(lastUnderscore + 1);  // '1', '3', '12'

        btn.innerHTML = `<div class="loader"></div> Subiendo video ${subidos+1}/${videoEntries.length} (Ep.${ep} ${idioma})...`;

        // anime_id, idioma y episodio van en la URL (no en el body)
        // para que AppServ no los pierda cuando el video es grande
        const vfd = new FormData();
        vfd.append('video', file, file.name);
        const videoUrl = '/animex/api/animes.php?action=video'
          + '&anime_id=' + encodeURIComponent(String(animeId))
          + '&idioma='   + encodeURIComponent(idioma)
          + '&episodio=' + encodeURIComponent(ep);

        let vd;
        try {
          const vr = await fetch(videoUrl, {
            method: 'POST', credentials: 'include', body: vfd
          });
          vd = await vr.json();
        } catch(fetchErr) {
          showToast(`⚠️ Error de red al subir Ep.${ep}: ${fetchErr.message}`, true);
          continue;
        }

        if (vd.error) {
          showToast(`⚠️ Ep.${ep} (${idioma}): ${vd.error}`, true);
        } else {
          subidos++;
        }
      }

      showToast(subidos === videoEntries.length
        ? `✅ ${subidos} video${subidos>1?'s':''} subido${subidos>1?'s':''} correctamente`
        : `⚠️ ${subidos}/${videoEntries.length} videos subidos (revisa los errores)`,
        subidos < videoEntries.length
      );
    }

    await loadAnimes();
    renderStats();
    resetForm();
    showSection('animes');

  } catch(e) {
    showToast(e.message || 'Error desconocido', true);
  } finally {
    btn.innerHTML = '💾 Guardar Anime';
    btn.disabled  = false;
  }
}

// ── EDIT ───────────────────────────────────────────────────────
async function editAnime(id) {
  const a = allAnimes.find(x=>+x.id===+id);
  if (!a) return;
  editingId = id; videoFiles = {};
  document.getElementById('form-title').textContent = 'Editar Anime';
  document.getElementById('f-name').value   = a.nombre;
  document.getElementById('f-year').value   = a.anio;
  document.getElementById('f-desc').value   = a.descripcion || '';
  document.getElementById('f-eps').value    = a.episodios;
  document.getElementById('f-status').value = a.estado;
  document.getElementById('f-rating').value = a.rating;
  document.getElementById('f-new').checked  = !!+a.es_nuevo;

  selGenres = new Set((a.generos||[]).map(g=>typeof g==='object'?+g.id:+g));
  renderGenreChips();

  if (a.cover_path) {
    document.getElementById('cover-preview').src = coverSrc(a.cover_path);
    document.getElementById('cover-preview').style.display = 'block';
    document.getElementById('cover-name').textContent = '✓ Portada actual';
  }
  showSection('add');
  buildLangTab('esp_lat');
}

// ── DELETE ─────────────────────────────────────────────────────
function confirmDelete(id, name) {
  document.getElementById('del-name').textContent = name;
  document.getElementById('del-confirm-btn').onclick = ()=>deleteAnime(id);
  document.getElementById('del-modal').classList.add('open');
}
async function deleteAnime(id) {
  document.getElementById('del-modal').classList.remove('open');
  try {
    await API.deleteAnime(id);
    await loadAnimes();
    renderStats(); renderAnimeTable(); renderDashboard();
    showToast('🗑️ Anime eliminado');
  } catch(e) { showToast(e.message, true); }
}

// ── RESET ──────────────────────────────────────────────────────
function resetForm() {
  editingId = null; videoFiles = {};
  document.getElementById('form-title').textContent = 'Agregar Anime';
  ['f-name','f-year','f-desc','f-eps','f-rating'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.value='';
  });
  document.getElementById('f-status').value = 'En emisión';
  document.getElementById('f-new').checked  = false;
  document.getElementById('cover-name').textContent = '';
  const prev = document.getElementById('cover-preview');
  prev.src=''; prev.style.display='none';
  document.getElementById('f-cover').value = '';
  selGenres = new Set();
  renderGenreChips();
  buildLangTab('esp_lat');
}

async function doLogout() { await API.logout(); window.location.href=API.root+'/index.html'; }

// ── USERS TABLE ────────────────────────────────────────────────
async function renderUsersTable() {
  try {
    const users = await API.getUsuarios();
    document.getElementById('user-total').textContent = `(${users.length})`;
    const planLabel = { ninguno:'Sin plan', individual:'Individual', familiar:'Familiar', anual:'Anual' };
    const planColor = { ninguno:'var(--text3)', individual:'var(--accent)', familiar:'#a78bfa', anual:'var(--gold)' };
    document.getElementById('users-tbody').innerHTML = users.map(u => `<tr>
      <td>${u.id}</td>
      <td style="font-weight:800">${escHtml(u.username)}</td>
      <td style="color:var(--text2)">${escHtml(u.email)}</td>
      <td><span class="badge ${u.rol==='admin'?'badge-emit':'badge-fin'}">${u.rol}</span></td>
      <td>
        <span style="font-weight:800;color:${planColor[u.plan_suscripcion||'ninguno']||'var(--text3)'}">
          ${planLabel[u.plan_suscripcion||'ninguno']}
        </span>
        <select onchange="cambiarPlanUsuario(${u.id},this.value)" style="margin-left:8px;font-size:11px;padding:2px 6px;border-radius:4px;background:var(--bg4);border:1px solid var(--border);color:var(--text1)">
          <option value="">— Cambiar —</option>
          <option value="ninguno">Sin plan</option>
          <option value="individual">Individual</option>
          <option value="familiar">Familiar</option>
          <option value="anual">Anual</option>
        </select>
      </td>
      <td><span class="badge ${u.activo?'badge-emit':'badge-fin'}">${u.activo?'Activo':'Inactivo'}</span></td>
      <td style="color:var(--text2);font-size:12px">${u.created_at?.slice(0,10)||'—'}</td>
      <td style="color:var(--text2);font-size:12px">${u.last_login?.slice(0,10)||'Nunca'}</td>
      <td><button class="btn btn-sm ${u.activo?'btn-danger':''}" style="${!u.activo?'background:rgba(6,214,160,.15);border:1px solid rgba(6,214,160,.3);color:var(--green)':''}" onclick="toggleUser(${u.id})">${u.activo?'🔒 Desactivar':'🔓 Activar'}</button></td>
    </tr>`).join('');
  } catch(e) { showToast(e.message, true); }
}
async function toggleUser(id) {
  try { await API.toggleUser(id); renderUsersTable(); showToast('✅ Usuario actualizado'); }
  catch(e) { showToast(e.message, true); }
}
async function cambiarPlanUsuario(uid, plan) {
  if (!plan) return;
  try {
    await API.asignarPlan(uid, plan);
    showToast('✅ Plan actualizado');
    renderUsersTable();
  } catch(e) { showToast(e.message, true); }
}

// ── SUSCRIPCIONES ──────────────────────────────────────────────
let planesData = [];
async function renderSubsSection() {
  try {
    planesData = await API.getPlanes();
    const iconos = { individual:'👤', familiar:'👨‍👩‍👧‍👦', anual:'📅' };
    const colores = { individual:'rgba(230,57,70,.15)', familiar:'rgba(167,139,250,.15)', anual:'rgba(255,209,102,.15)' };
    const borderC = { individual:'rgba(230,57,70,.4)', familiar:'rgba(167,139,250,.4)', anual:'rgba(255,209,102,.4)' };
    document.getElementById('subs-cards').innerHTML = planesData.map(plan => `
      <div style="background:${colores[plan.tipo]||'var(--bg3)'};border:1px solid ${borderC[plan.tipo]||'var(--border)'};border-radius:16px;padding:28px;display:flex;flex-direction:column;gap:16px">
        <div style="display:flex;align-items:center;gap:12px">
          <span style="font-size:32px">${iconos[plan.tipo]||'💎'}</span>
          <div>
            <h3 style="margin:0;font-family:'Bebas Neue',sans-serif;font-size:24px;letter-spacing:1px">${escHtml(plan.nombre)}</h3>
            <p style="margin:0;font-size:12px;color:var(--text3);text-transform:uppercase;letter-spacing:1px">${plan.tipo}</p>
          </div>
        </div>
        <div class="form-group" style="margin:0">
          <label>Precio (USD)</label>
          <input type="number" id="price-${plan.tipo}" value="${plan.precio}" step="0.01" min="0" style="max-width:150px">
        </div>
        <div class="form-group" style="margin:0">
          <label>Beneficios (uno por línea)</label>
          <textarea id="bene-${plan.tipo}" rows="5" placeholder="Acceso ilimitado&#10;Sin anuncios&#10;HD">${(plan.beneficios||'').split('|').join('\n')}</textarea>
        </div>
        <div style="display:flex;align-items:center;gap:12px">
          <label style="display:flex;align-items:center;gap:8px;font-size:14px;cursor:pointer;text-transform:none;font-weight:700">
            <input type="checkbox" id="activo-${plan.tipo}" ${plan.activo?'checked':''} style="width:auto;accent-color:var(--accent)"> Plan activo (visible para usuarios)
          </label>
        </div>
        <button class="btn btn-primary" onclick="guardarPlan('${plan.tipo}')">💾 Guardar cambios</button>
      </div>`).join('');
  } catch(e) { showToast(e.message, true); }
}
async function guardarPlan(tipo) {
  const precio    = parseFloat(document.getElementById('price-'+tipo)?.value) || 0;
  const beneRaw   = document.getElementById('bene-'+tipo)?.value || '';
  const beneficios= beneRaw.split('\n').map(b=>b.trim()).filter(Boolean).join('|');
  const activo    = document.getElementById('activo-'+tipo)?.checked ? 1 : 0;
  try {
    await API.updatePlan(tipo, { precio, beneficios, activo });
    showToast('✅ Plan actualizado');
    renderSubsSection();
  } catch(e) { showToast(e.message, true); }
}

// ── ANUNCIOS ───────────────────────────────────────────────────
let todosAnuncios = [];
function onAdImgChange(input) {
  const f = input.files[0]; if (!f) return;
  const prev = document.getElementById('ad-preview');
  prev.src = URL.createObjectURL(f); prev.style.display = 'block';
}
async function guardarAnuncio() {
  const titulo = document.getElementById('ad-titulo').value.trim();
  const link   = document.getElementById('ad-link').value.trim();
  const tipo   = document.getElementById('ad-tipo').value;
  const imgEl  = document.getElementById('ad-imagen');
  if (!titulo) { showToast('⚠️ El título es obligatorio', true); return; }
  const fd = new FormData();
  fd.append('titulo', titulo);
  fd.append('link_url', link);
  fd.append('tipo', tipo);
  fd.append('activo', '1');
  if (imgEl.files[0]) fd.append('imagen', imgEl.files[0]);
  try {
    await API.saveAnuncio(fd);
    showToast('✅ Anuncio guardado');
    document.getElementById('ad-titulo').value = '';
    document.getElementById('ad-link').value   = '';
    imgEl.value = '';
    document.getElementById('ad-preview').style.display = 'none';
    renderAnunciosTable();
  } catch(e) { showToast(e.message, true); }
}
async function renderAnunciosTable() {
  try {
    todosAnuncios = await API.getAnuncios();
    document.getElementById('anuncios-tbody').innerHTML = todosAnuncios.map(ad => `<tr>
      <td><div class="table-thumb">${ad.imagen_path?`<img src="${coverSrc(ad.imagen_path)}" alt="">`:''}</div></td>
      <td style="font-weight:800">${escHtml(ad.titulo)}</td>
      <td><span class="badge ${ad.tipo==='global'?'badge-emit':'badge-fin'}">${ad.tipo==='global'?'🌐 Global':'▶️ Player'}</span></td>
      <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;color:var(--text2)">${ad.link_url?`<a href="${escHtml(ad.link_url)}" target="_blank" style="color:var(--accent)">${escHtml(ad.link_url)}</a>`:'—'}</td>
      <td><span class="badge ${ad.activo?'badge-emit':'badge-fin'}">${ad.activo?'Activo':'Inactivo'}</span></td>
      <td><div class="row-actions">
        <button class="btn btn-sm" style="background:rgba(255,209,102,.12);border:1px solid rgba(255,209,102,.3);color:var(--gold)" onclick="toggleAnuncio(${ad.id},${ad.activo})">${ad.activo?'🔇 Ocultar':'📢 Activar'}</button>
        <button class="btn btn-danger btn-sm" onclick="eliminarAnuncio(${ad.id})">🗑️</button>
      </div></td>
    </tr>`).join('');
  } catch(e) { showToast(e.message, true); }
}
async function toggleAnuncio(id, actual) {
  try { await API.toggleAnuncio(id, actual ? 0 : 1); renderAnunciosTable(); }
  catch(e) { showToast(e.message, true); }
}
async function eliminarAnuncio(id) {
  if (!confirm('¿Eliminar este anuncio?')) return;
  try { await API.deleteAnuncio(id); renderAnunciosTable(); showToast('🗑️ Anuncio eliminado'); }
  catch(e) { showToast(e.message, true); }
}

// ── PRODUCTOS ──────────────────────────────────────────────────
let todosProductos = [];
function onProdImgChange(input) {
  const f = input.files[0]; if (!f) return;
  const prev = document.getElementById('prod-preview');
  prev.src = URL.createObjectURL(f); prev.style.display = 'block';
}
function renderProductosAnimeSelect() {
  const opts = allAnimes.map(a => `<option value="${a.id}">${escHtml(a.nombre)}</option>`).join('');
  document.getElementById('prod-anime').innerHTML = `<option value="">— Selecciona un anime —</option>${opts}`;
  document.getElementById('prod-filter-anime').innerHTML = `<option value="">— Todos —</option>${opts}`;
}
async function guardarProducto() {
  const anime_id  = document.getElementById('prod-anime').value;
  const nombre    = document.getElementById('prod-nombre').value.trim();
  const descripcion=document.getElementById('prod-desc').value.trim();
  const link      = document.getElementById('prod-link').value.trim();
  const imgEl     = document.getElementById('prod-imagen');
  if (!anime_id || !nombre) { showToast('⚠️ Anime y nombre son obligatorios', true); return; }
  const fd = new FormData();
  fd.append('anime_id', anime_id);
  fd.append('nombre', nombre);
  fd.append('descripcion', descripcion);
  fd.append('link_url', link);
  if (imgEl.files[0]) fd.append('imagen', imgEl.files[0]);
  try {
    await API.saveProducto(fd);
    showToast('✅ Producto guardado');
    document.getElementById('prod-nombre').value = '';
    document.getElementById('prod-desc').value   = '';
    document.getElementById('prod-link').value   = '';
    imgEl.value = '';
    document.getElementById('prod-preview').style.display = 'none';
    renderProductosTable();
  } catch(e) { showToast(e.message, true); }
}
async function renderProductosTable(filtroAnime = '') {
  const filterVal = filtroAnime || document.getElementById('prod-filter-anime')?.value || '';
  if (!filterVal) {
    // Cargar todos los productos de todos los animes
    let rows = [];
    for (const a of allAnimes) {
      try {
        const prods = await API.getProductosAdmin(a.id);
        rows.push(...prods.map(p => ({...p, anime_nombre: a.nombre})));
      } catch {}
    }
    todosProductos = rows;
  } else {
    try {
      todosProductos = (await API.getProductosAdmin(filterVal)).map(p => ({
        ...p, anime_nombre: allAnimes.find(a=>+a.id===+filterVal)?.nombre || ''
      }));
    } catch { todosProductos = []; }
  }
  document.getElementById('productos-tbody').innerHTML = todosProductos.map(p => `<tr>
    <td><div class="table-thumb">${p.imagen_path?`<img src="${coverSrc(p.imagen_path)}" alt="">`:''}</div></td>
    <td><div style="font-weight:800">${escHtml(p.nombre)}</div><div style="font-size:12px;color:var(--text3)">${escHtml(p.descripcion||'')}</div></td>
    <td style="font-size:13px;color:var(--text2)">${escHtml(p.anime_nombre||'')}</td>
    <td style="font-size:12px">${p.link_url?`<a href="${escHtml(p.link_url)}" target="_blank" style="color:var(--accent)">Ver link</a>`:'—'}</td>
    <td><div class="row-actions">
      <button class="btn btn-danger btn-sm" onclick="eliminarProducto(${p.id})">🗑️</button>
    </div></td>
  </tr>`).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--text3);padding:24px">No hay productos aún</td></tr>';
}
async function filtrarProductos() { renderProductosTable(); }
async function eliminarProducto(id) {
  if (!confirm('¿Eliminar este producto?')) return;
  try { await API.deleteProducto(id); renderProductosTable(); showToast('🗑️ Producto eliminado'); }
  catch(e) { showToast(e.message, true); }
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ══════════════════════════════════════════════════════════════
//  MANGA
// ══════════════════════════════════════════════════════════════
let mangaAnimeId = null;
let mangaCapitulos = [];

function initMangaSection() {
  const sel = document.getElementById('manga-anime-select');
  sel.innerHTML = '<option value="">— Elige un anime —</option>' +
    allAnimes.map(a => `<option value="${a.id}">${escHtml(a.nombre)}</option>`).join('');
  renderMangaTable();
}

async function onMangaAnimeChange() {
  const val = document.getElementById('manga-anime-select').value;
  mangaAnimeId = val ? parseInt(val) : null;
  renderMangaTable();
}

function onMangaPortadaChange(input) {
  const f = input.files[0]; if (!f) return;
  const p = document.getElementById('manga-portada-preview');
  p.src = URL.createObjectURL(f); p.style.display = 'block';
}

function onMangaPaginasChange(input) {
  const el = document.getElementById('manga-paginas-count');
  el.textContent = input.files.length ? `${input.files.length} página(s) seleccionada(s)` : '';
}

// Subida por lotes: PHP tiene max_file_uploads (usualmente 20).
// Subimos primero el capítulo (con portada), luego las páginas en lotes de 15.
const BATCH_SIZE = 15;

async function guardarCapitulo() {
  if (!mangaAnimeId) { showToast('⚠️ Selecciona un anime primero', true); return; }
  const num      = parseFloat(document.getElementById('manga-num').value);
  const titulo   = document.getElementById('manga-titulo').value.trim();
  const desc     = document.getElementById('manga-desc').value.trim();
  if (!num) { showToast('⚠️ El número de capítulo es obligatorio', true); return; }

  const portadaEl = document.getElementById('manga-portada');
  const paginasEl = document.getElementById('manga-paginas');
  const allPages  = Array.from(paginasEl.files);
  const totalPags = allPages.length;

  const btn = document.querySelector('[onclick="guardarCapitulo()"]');
  btn.disabled = true;

  try {
    // ── PASO 1: crear capítulo (con portada, sin páginas aún) ──
    btn.textContent = '⏳ Creando capítulo...';
    const fd = new FormData();
    fd.append('anime_id', mangaAnimeId);
    fd.append('numero',   num);
    fd.append('titulo',   titulo || `Capítulo ${num}`);
    fd.append('descripcion', desc);
    if (portadaEl.files[0]) fd.append('portada', portadaEl.files[0]);
    // Primera tanda de páginas (hasta BATCH_SIZE)
    const firstBatch = allPages.slice(0, BATCH_SIZE);
    firstBatch.forEach(f => fd.append('paginas[]', f));

    const res = await API.saveCapitulo(fd);
    const capId = res.id;
    let totalSubidas = res.paginas_subidas || 0;

    // ── PASO 2: subir el resto en lotes ──
    if (totalPags > BATCH_SIZE) {
      let lote = 1;
      for (let start = BATCH_SIZE; start < totalPags; start += BATCH_SIZE) {
        lote++;
        const batch = allPages.slice(start, start + BATCH_SIZE);
        btn.textContent = `⏳ Subiendo páginas... (${Math.min(start + BATCH_SIZE, totalPags)}/${totalPags})`;
        const bfd = new FormData();
        bfd.append('capitulo_id', capId);
        batch.forEach(f => bfd.append('paginas[]', f));
        const br = await API.subirPaginas(bfd);
        totalSubidas += br.paginas_subidas || 0;
      }
    }

    showToast(`✅ Capítulo ${num} guardado — ${totalSubidas} páginas subidas`);
    // Limpiar formulario
    document.getElementById('manga-num').value    = '';
    document.getElementById('manga-titulo').value = '';
    document.getElementById('manga-desc').value   = '';
    portadaEl.value = ''; paginasEl.value = '';
    document.getElementById('manga-portada-preview').style.display = 'none';
    document.getElementById('manga-paginas-count').textContent = '';
    renderMangaTable();
  } catch(e) {
    showToast(e.message, true);
  } finally {
    btn.disabled = false;
    btn.textContent = '💾 Guardar Capítulo';
  }
}

async function renderMangaTable() {
  const tbody = document.getElementById('manga-tbody');
  if (!mangaAnimeId) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text3);padding:24px">Selecciona un anime para ver sus capítulos</td></tr>';
    document.getElementById('manga-cap-total').textContent = '';
    return;
  }
  try {
    mangaCapitulos = await API.getCapitulos(mangaAnimeId, true);
    document.getElementById('manga-cap-total').textContent = `(${mangaCapitulos.length})`;
    tbody.innerHTML = mangaCapitulos.length ? mangaCapitulos.map(c => `<tr>
      <td><div class="table-thumb">${c.portada_path ? `<img src="${coverSrc(c.portada_path)}" alt="">` : '📖'}</div></td>
      <td style="font-weight:800;color:var(--gold)">Cap. ${c.numero}</td>
      <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(c.titulo||'')}</td>
      <td><span style="color:var(--green);font-weight:800">${c.total_paginas}</span> págs.</td>
      <td><span class="badge ${+c.activo ? 'badge-emit' : 'badge-fin'}">${+c.activo ? 'Activo' : 'Oculto'}</span></td>
      <td><div class="row-actions">
        <button class="btn btn-sm" style="background:rgba(255,209,102,.12);border:1px solid rgba(255,209,102,.3);color:var(--gold)"
          onclick="toggleCapitulo(${c.id},${c.activo})">👁️ ${+c.activo ? 'Ocultar' : 'Mostrar'}</button>
        <button class="btn btn-danger btn-sm" onclick="eliminarCapitulo(${c.id},'${escHtml(c.titulo||'Cap '+c.numero)}')">🗑️</button>
      </div></td>
    </tr>`).join('') : '<tr><td colspan="6" style="text-align:center;color:var(--text3);padding:24px">No hay capítulos aún</td></tr>';
  } catch(e) { showToast(e.message, true); }
}

async function toggleCapitulo(id, activo) {
  try {
    await API.updateCapitulo(id, { activo: activo ? 0 : 1 });
    showToast(`✅ Capítulo ${activo ? 'ocultado' : 'activado'}`);
    renderMangaTable();
  } catch(e) { showToast(e.message, true); }
}

async function eliminarCapitulo(id, nombre) {
  if (!confirm(`¿Eliminar "${nombre}"? Esto borrará todas sus páginas.`)) return;
  try {
    await API.deleteCapitulo(id);
    showToast('🗑️ Capítulo eliminado');
    renderMangaTable();
  } catch(e) { showToast(e.message, true); }
}

// ══════════════════════════════════════════════════════════════
//  CHAT ADMIN
// ══════════════════════════════════════════════════════════════
function initChatAdminSection() {
  const sel = document.getElementById('chat-anime-filter');
  sel.innerHTML = '<option value="">🌐 Chat global</option>' +
    allAnimes.map(a => `<option value="${a.id}">🎌 ${escHtml(a.nombre)}</option>`).join('');
  cargarChatAdmin();
}

async function cargarChatAdmin() {
  const animeId = document.getElementById('chat-anime-filter').value;
  const params = { limit: 50 };
  if (animeId) params.anime_id = animeId;
  const tbody = document.getElementById('chat-tbody');
  try {
    const msgs = await API.getChatMensajes(params);
    if (!msgs.length) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text3);padding:24px">No hay mensajes aún</td></tr>';
      return;
    }
    // Mostrar más recientes arriba
    tbody.innerHTML = [...msgs].reverse().map(m => `<tr>
      <td>
        <div style="display:flex;align-items:center;gap:8px">
          <div style="width:32px;height:32px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;font-weight:900;font-size:14px">
            ${escHtml(m.username.charAt(0).toUpperCase())}
          </div>
          <div>
            <div style="font-weight:800;font-size:13px">${escHtml(m.username)}</div>
            <div style="font-size:11px;color:${m.rol==='admin'?'var(--gold)':'var(--text3)'}">
              ${m.rol==='admin'?'👑 Admin':'👤 Usuario'}
            </div>
          </div>
        </div>
      </td>
      <td style="max-width:320px;word-break:break-word;font-size:13px">${escHtml(m.mensaje)}</td>
      <td style="font-size:12px;color:var(--text3)">${m.anime_id ? (allAnimes.find(a=>+a.id===+m.anime_id)?.nombre||'#'+m.anime_id) : '🌐 Global'}</td>
      <td style="font-size:12px;color:var(--text3);white-space:nowrap">${new Date(m.created_at).toLocaleString('es-MX',{dateStyle:'short',timeStyle:'short'})}</td>
      <td><button class="btn btn-danger btn-sm" onclick="eliminarMensajeAdmin(${m.id})">🗑️</button></td>
    </tr>`).join('');
  } catch(e) { showToast(e.message, true); }
}

async function eliminarMensajeAdmin(id) {
  if (!confirm('¿Eliminar este mensaje?')) return;
  try {
    await API.eliminarMensaje(id);
    showToast('🗑️ Mensaje eliminado');
    cargarChatAdmin();
  } catch(e) { showToast(e.message, true); }
}
