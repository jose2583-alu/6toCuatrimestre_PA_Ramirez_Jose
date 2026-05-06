// ============================================================
//  AnimeX - Lógica del Portal de Usuario
// ============================================================

let currentUser   = null;
let allAnimes     = [];
let allGeneros    = [];
let favIds        = new Set();
let currentAnime  = null;
let currentLang   = 'esp_lat';
let currentEp     = 1;
let activeGenre   = 'all';
let prevTab       = 'home';
let miPlan        = 'ninguno';
let carruselIndex = 0;
let carruselItems = [];

const langLabels = {
  esp_lat: '🇲🇽 Reproduciendo en Español Latino (doblaje)',
  jpn_esp: '🇯🇵 Reproduciendo en Japonés con subtítulos en Español',
  eng_esp: '🇺🇸 Reproduciendo en Inglés con subtítulos en Español',
};

const planInfo = {
  ninguno:    { label: 'Sin suscripción', color: 'var(--text3)', icon: '⚪' },
  individual: { label: 'Plan Individual',  color: 'var(--accent)',  icon: '👤' },
  familiar:   { label: 'Plan Familiar',    color: '#a78bfa',        icon: '👨‍👩‍👧‍👦' },
  anual:      { label: 'Plan Anual',       color: 'var(--gold)',    icon: '📅' },
};

// ── INIT ──────────────────────────────────────────────────────
(async () => {
  currentUser = await guardAuth('user');
  if (!currentUser) return;

  document.getElementById('navbar').style.display = 'flex';
  document.getElementById('nav-avatar').textContent = currentUser.username.charAt(0).toUpperCase();

  await Promise.all([loadAnimes(), loadGeneros(), loadFavoritos(), loadHistorial(), cargarMiPlan()]);
  renderHome();
  showTab('home');

  // Mostrar banner suscripción al entrar si no tiene plan
  if (miPlan === 'ninguno') {
    setTimeout(() => mostrarBannerSub(), 1200);
  }
  // Mostrar anuncio global si no tiene suscripción
  if (miPlan === 'ninguno') {
    setTimeout(() => mostrarAnuncio('global'), 2500);
  }
})();

// ── DATA LOADERS ──────────────────────────────────────────────
async function loadAnimes() {
  allAnimes = await API.getAnimes().catch(() => []);
}
async function loadGeneros() {
  allGeneros = await API.getGeneros().catch(() => []);
}
async function loadFavoritos() {
  const favs = await API.getFavoritos().catch(() => []);
  favIds = new Set(favs.map(f => f.id));
}
async function loadHistorial() {
  // historial se renderiza cuando se abre esa tab
}
async function cargarMiPlan() {
  try {
    const res = await API.getMiPlan();
    miPlan = res.plan_suscripcion || 'ninguno';
  } catch { miPlan = 'ninguno'; }
}

// ── TABS ──────────────────────────────────────────────────────
function showTab(tab) {
  if (tab !== 'player') prevTab = tab;
  document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
  document.querySelectorAll('.nav-link').forEach(b => b.classList.remove('active'));

  const view = document.getElementById('view-' + tab);
  if (view) view.style.display = 'block';

  const link = document.getElementById('tab-' + tab);
  if (link) link.classList.add('active');

  if (tab === 'favorites') renderFavorites();
  if (tab === 'continue')  renderContinue();
  if (tab === 'catalog')   renderCatalog();
  if (tab === 'profile')   renderProfile();
  if (tab === 'manga')     initMangaTab();
  if (tab === 'chat')      initChatTab();
}

// ── HOME ──────────────────────────────────────────────────────
function renderHome() {
  if (!allAnimes.length) return;
  renderHero(allAnimes[0]);
  renderScrollRow('new-list', allAnimes.filter(a => +a.es_nuevo), true);
  renderScrollRow('popular-list', [...allAnimes].sort((a,b) => b.rating - a.rating).slice(0,8));
  renderGenreChips('home-genres', g => { activeGenre = g; showTab('catalog'); });
}

function renderHero(a) {
  document.getElementById('hero-title').innerHTML = a.nombre.toUpperCase();
  document.getElementById('hero-desc').textContent = a.descripcion || '';
  if (a.cover_path) document.getElementById('hero-img').src = coverSrc(a.cover_path);

  const genres = (a.generos || []).map(g => typeof g === 'object' ? g.nombre : g);
  document.getElementById('hero-meta').innerHTML =
    `<span>⭐ ${a.rating}</span><span>📺 ${a.episodios} eps</span>
     <span>🎭 ${genres.slice(0,2).join(' · ')}</span><span>📅 ${a.anio}</span>`;

  document.getElementById('hero-watch-btn').onclick = () => openPlayer(a);
  document.getElementById('hero-fav-btn').onclick   = () => toggleFav(a.id);
}

// ── SCROLL ROW ────────────────────────────────────────────────
function renderScrollRow(containerId, animes, showNew = false) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = animes.slice(0, 12).map(a => animeCardHTML(a, showNew)).join('');
}

// ── CATALOG ───────────────────────────────────────────────────
function renderCatalog(search = '') {
  let filtered = allAnimes;
  if (activeGenre !== 'all') {
    filtered = filtered.filter(a => {
      const gs = (a.generos || []).map(g => typeof g === 'object' ? g.nombre : g);
      return gs.includes(activeGenre);
    });
  }
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(a => a.nombre.toLowerCase().includes(q));
  }

  const grid  = document.getElementById('catalog-grid');
  const empty = document.getElementById('catalog-empty');
  const count = document.getElementById('catalog-count');

  count.textContent = `${filtered.length} anime${filtered.length !== 1 ? 's' : ''}`;
  grid.innerHTML    = filtered.map(a => animeCardHTML(a, true)).join('');
  empty.classList.toggle('hidden', filtered.length > 0);
  grid.style.display = filtered.length ? 'grid' : 'none';

  renderGenreChips('catalog-genres', g => { activeGenre = g; renderCatalog(document.getElementById('search-input').value); });
}

function handleSearch(val) {
  if (document.getElementById('view-catalog').style.display === 'none') showTab('catalog');
  renderCatalog(val);
}

// ── GENRE CHIPS ───────────────────────────────────────────────
function renderGenreChips(containerId, onClick) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = `<div class="cat-chip ${activeGenre==='all'?'active':''}" onclick="setGenre('all','${containerId}',${onClick.toString()})">Todos</div>` +
    allGeneros.map(g =>
      `<div class="cat-chip ${activeGenre===g.nombre?'active':''}" onclick="setGenre('${g.nombre}','${containerId}',${onClick.toString()})">${g.nombre}</div>`
    ).join('');
}

function setGenre(g, containerId, fn) {
  activeGenre = g;
  fn(g);
  // Re-render chips to reflect selection
  document.querySelectorAll(`#${containerId} .cat-chip`).forEach(c => {
    c.classList.toggle('active', c.textContent.trim() === (g === 'all' ? 'Todos' : g));
  });
}

// ── ANIME CARD HTML ───────────────────────────────────────────
function animeCardHTML(a, showNew = false) {
  const isFav  = favIds.has(+a.id);
  const genres = (a.generos || []).map(g => typeof g === 'object' ? g.nombre : g);
  const cover  = a.cover_path ? `<img src="${coverSrc(a.cover_path)}" alt="${a.nombre}" loading="lazy" onerror="this.style.display='none'">` : '';
  const emoji  = a.emoji || '🎌';

  return `<div class="anime-card" onclick="openModal(${a.id})">
    <div class="anime-thumb">
      ${emoji}${cover}
      ${(showNew && +a.es_nuevo) ? '<div class="new-badge">NUEVO</div>' : ''}
      <div class="anime-thumb-overlay"></div>
      <div class="anime-thumb-btns">
        <button class="ov-btn ov-btn-play" onclick="event.stopPropagation();openPlayerById(${a.id})">▶ Ver</button>
        <button class="ov-btn ov-btn-fav ${isFav?'active':''}" id="fav-btn-${a.id}" onclick="event.stopPropagation();toggleFav(${a.id})">${isFav?'❤️':'🤍'}</button>
      </div>
    </div>
    <div class="anime-card-info">
      <div class="anime-card-name" title="${a.nombre}">${a.nombre}</div>
      <div class="anime-card-meta">
        ${genres.slice(0,1).map(g=>`<span class="tag">${g}</span>`).join('')}
        ${a.estado==='En emisión'?'<span class="tag tag-green">En emisión</span>':''}
        <span class="anime-ep">${a.episodios} eps</span>
      </div>
    </div>
  </div>`;
}

// ── FAVORITES ─────────────────────────────────────────────────
async function toggleFav(id) {
  try {
    const res = await API.toggleFav(id);
    if (res.action === 'added') { favIds.add(+id); showToast('❤️ Agregado a favoritos'); }
    else                        { favIds.delete(+id); showToast('💔 Eliminado de favoritos'); }

    // Update all fav buttons on page
    document.querySelectorAll(`#fav-btn-${id}`).forEach(btn => {
      btn.textContent = favIds.has(+id) ? '❤️' : '🤍';
      btn.classList.toggle('active', favIds.has(+id));
    });

    if (document.getElementById('view-favorites').style.display !== 'none') renderFavorites();
  } catch (e) { showToast(e.message, true); }
}

function renderFavorites() {
  const favAnimes = allAnimes.filter(a => favIds.has(+a.id));
  const grid  = document.getElementById('fav-grid');
  const empty = document.getElementById('fav-empty');
  grid.innerHTML = favAnimes.map(a => animeCardHTML(a, false)).join('');
  empty.classList.toggle('hidden', favAnimes.length > 0);
  grid.style.display = favAnimes.length ? 'grid' : 'none';
}

// ── CONTINUE WATCHING ─────────────────────────────────────────
async function renderContinue() {
  const list  = document.getElementById('continue-list');
  const empty = document.getElementById('continue-empty');
  const hist  = await API.getHistorial().catch(() => []);

  if (!hist.length) { list.style.display='none'; empty.classList.remove('hidden'); return; }

  list.style.display = 'flex';
  empty.classList.add('hidden');

  list.innerHTML = hist.map(h => {
    const cover = h.cover_path
      ? `<img src="${coverSrc(h.cover_path)}" style="width:100%;height:100%;object-fit:cover">`
      : (h.emoji || '🎌');
    return `<div class="continue-card">
      <div class="continue-thumb">${cover}</div>
      <div class="continue-info">
        <h4>${h.nombre}</h4>
        <p>Episodio ${h.episodio} · ${h.progreso}% completado · ${h.idioma === 'esp_lat' ? '🇲🇽 Español' : h.idioma === 'jpn_esp' ? '🇯🇵 Japonés' : '🇺🇸 Inglés'}</p>
        <div class="progress-track"><div class="progress-fill" style="width:${h.progreso}%"></div></div>
      </div>
      <button class="btn btn-primary btn-sm" onclick="openPlayerById(${h.id})">▶ Continuar</button>
    </div>`;
  }).join('');
}

// ── MODAL ─────────────────────────────────────────────────────
function openModal(id) {
  const a = allAnimes.find(x => +x.id === +id);
  if (!a) return;
  const genres = (a.generos || []).map(g => typeof g === 'object' ? g.nombre : g);

  document.getElementById('modal-title').textContent = a.nombre;
  const cv = document.getElementById('modal-cover');
  cv.innerHTML = a.cover_path ? `<img src="${coverSrc(a.cover_path)}" style="width:100%;height:100%;object-fit:cover">` : (a.emoji || '🎌');
  document.getElementById('modal-tags').innerHTML =
    genres.map(g => `<span class="tag">${g}</span>`).join('') +
    `<span class="tag tag-gold">⭐ ${a.rating}</span>`;
  document.getElementById('modal-desc').textContent = a.descripcion || '';
  document.getElementById('modal-meta').innerHTML =
    `<span>📅 ${a.anio}</span><span>📺 ${a.episodios} eps</span><span>🔄 ${a.estado}</span>`;
  document.getElementById('modal-play-btn').onclick = () => { closeModalBtn(); openPlayer(a); };
  document.getElementById('modal-fav-btn').onclick  = () => { toggleFav(a.id); closeModalBtn(); };
  document.getElementById('modal').classList.add('open');
}
function closeModal(e) { if (e.target === document.getElementById('modal')) closeModalBtn(); }
function closeModalBtn() { document.getElementById('modal').classList.remove('open'); }

// ── PLAYER ────────────────────────────────────────────────────
function openPlayerById(id) {
  const a = allAnimes.find(x => +x.id === +id);
  if (a) openPlayer(a);
}

function openPlayer(a) {
  currentAnime = a;
  currentEp    = 1;
  showTab('player');

  const genres = (a.generos || []).map(g => typeof g === 'object' ? g.nombre : g);
  document.getElementById('player-title').textContent = a.nombre;
  document.getElementById('player-desc').textContent  = a.descripcion || '';
  document.getElementById('player-tags').innerHTML    = genres.map(g => `<span class="tag">${g}</span>`).join('');
  document.getElementById('player-now-playing').textContent = `Reproduciendo: ${a.nombre}`;

  // Fav button state
  const favBtn = document.getElementById('player-fav-btn');
  favBtn.textContent = favIds.has(+a.id) ? '❤️ En Favoritos' : '❤️ Agregar a Favoritos';

  // Episodes
  const epGrid = document.getElementById('ep-grid');
  epGrid.innerHTML = Array.from({length: Math.min(a.episodios, 30)}, (_, i) =>
    `<div class="ep-btn ${i===0?'active':''}" onclick="selectEp(${i+1},this)">Ep ${i+1}</div>`
  ).join('');

  loadVideo('esp_lat');
  document.querySelectorAll('.lang-btn').forEach((b,i) => b.classList.toggle('active', i===0));

  // Carrusel de productos
  cargarProductosCarrusel(a.id);

  // Mostrar anuncio del player si no tiene suscripción
  if (miPlan === 'ninguno') {
    setTimeout(() => mostrarAnuncio('player'), 800);
  }
}

function loadVideo(lang) {
  currentLang = lang;
  const vid      = document.getElementById('main-video');
  const ph       = document.getElementById('video-placeholder');
  const statusTx = document.getElementById('video-status-text');
  const videos   = currentAnime?.videos || {};

  document.getElementById('lang-info').textContent = langLabels[lang] || '';

  if (videos[lang] && videos[lang][currentEp]) {
    vid.src          = coverSrc(videos[lang][currentEp]);
    vid.style.display = 'block';
    ph.style.display  = 'none';
    vid.play().catch(() => {});
  } else {
    vid.style.display = 'none';
    ph.style.display  = 'flex';
    statusTx.textContent = 'Video no disponible para este idioma';
  }
}

function setLang(lang, btn) {
  document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  loadVideo(lang);
}

function selectEp(ep, el) {
  currentEp = ep;
  document.querySelectorAll('.ep-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  // Load video for the selected episode
  loadVideo(currentLang);
}

function tryPlay() {
  const vid = document.getElementById('main-video');
  if (vid.src) { vid.style.display='block'; document.getElementById('video-placeholder').style.display='none'; vid.play().catch(()=>{}); }
}

function onProgress() {
  const vid = document.getElementById('main-video');
  if (!vid.duration || !currentAnime) return;
  const pct = Math.round((vid.currentTime / vid.duration) * 100);
  if (pct % 5 === 0) { // Save every 5%
    API.saveProgreso({ anime_id: currentAnime.id, episodio: currentEp, progreso: pct, idioma: currentLang }).catch(() => {});
  }
}

function onVideoEnd() {
  API.saveProgreso({ anime_id: currentAnime.id, episodio: currentEp, progreso: 100, idioma: currentLang }).catch(() => {});
  showToast('✅ Episodio completado');
}

async function togglePlayerFav() {
  if (!currentAnime) return;
  await toggleFav(currentAnime.id);
  const isFav = favIds.has(+currentAnime.id);
  document.getElementById('player-fav-btn').textContent = isFav ? '❤️ En Favoritos' : '❤️ Agregar a Favoritos';
}

// ── LOGOUT ────────────────────────────────────────────────────
async function doLogout() {
  await API.logout();
  window.location.href = '../index.html';
}

// ── BANNER SUSCRIPCIÓN ────────────────────────────────────────
async function mostrarBannerSub() {
  try {
    const planes = await API.getPlanes();
    const iconos = { individual:'👤', familiar:'👨‍👩‍👧‍👦', anual:'📅' };
    const colores = {
      individual: 'linear-gradient(135deg,rgba(230,57,70,.18),rgba(230,57,70,.04))',
      familiar:   'linear-gradient(135deg,rgba(167,139,250,.18),rgba(167,139,250,.04))',
      anual:      'linear-gradient(135deg,rgba(255,209,102,.18),rgba(255,209,102,.04))',
    };
    const borderC = { individual:'rgba(230,57,70,.35)', familiar:'rgba(167,139,250,.35)', anual:'rgba(255,209,102,.35)' };

    document.getElementById('planes-banner').innerHTML = planes.filter(p=>p.activo).map(p => {
      const benes = (p.beneficios||'').split('|').filter(Boolean);
      return `<div style="background:${colores[p.tipo]||'var(--bg3)'};border:1px solid ${borderC[p.tipo]||'var(--border)'};border-radius:14px;padding:20px;text-align:left;display:flex;flex-direction:column;gap:12px">
        <div style="font-size:28px">${iconos[p.tipo]||'💎'}</div>
        <div>
          <h4 style="margin:0 0 2px;font-family:'Bebas Neue',sans-serif;font-size:20px;letter-spacing:1px">${escHtml(p.nombre)}</h4>
          <div style="font-size:22px;font-weight:900;color:var(--gold)">$${parseFloat(p.precio).toFixed(2)}<span style="font-size:12px;color:var(--text3);font-weight:400"> USD</span></div>
        </div>
        ${benes.length ? `<ul style="margin:0;padding-left:18px;font-size:12px;color:var(--text2);display:flex;flex-direction:column;gap:4px">${benes.map(b=>`<li>${escHtml(b)}</li>`).join('')}</ul>` : ''}
      </div>`;
    }).join('');
  } catch {}
  const b = document.getElementById('banner-suscripcion');
  b.style.display = 'flex';
}
function cerrarBannerSub() {
  document.getElementById('banner-suscripcion').style.display = 'none';
}

// ── ANUNCIOS ──────────────────────────────────────────────────
async function mostrarAnuncio(tipo = 'global') {
  try {
    const ad = await API.getAnuncioActivo(tipo);
    if (!ad || !ad.imagen_path) return;
    const img  = document.getElementById('anuncio-img');
    const link = document.getElementById('anuncio-link');
    img.src  = coverSrc(ad.imagen_path);
    link.href = ad.link_url || '#';
    if (!ad.link_url) link.onclick = e => e.preventDefault();
    document.getElementById('banner-anuncio').style.display = 'flex';
  } catch {}
}
function cerrarAnuncio() {
  document.getElementById('banner-anuncio').style.display = 'none';
}

// ── CARRUSEL DE PRODUCTOS ─────────────────────────────────────
const PROD_VISIBLE = 3;

async function cargarProductosCarrusel(animeId) {
  const sec = document.getElementById('productos-section');
  try {
    carruselItems = await API.getProductos(animeId);
  } catch { carruselItems = []; }
  if (!carruselItems.length) { sec.style.display = 'none'; return; }
  sec.style.display = 'block';
  carruselIndex = 0;
  renderCarrusel();
}

function renderCarrusel() {
  const track = document.getElementById('productos-carrusel');
  track.innerHTML = carruselItems.map(p => `
    <div style="flex:0 0 calc(33.33% - 11px);min-width:200px;background:var(--bg2);border:1px solid var(--border);border-radius:14px;overflow:hidden;transition:.2s;cursor:pointer" onclick="abrirProducto('${escHtml(p.link_url||'')}')">
      <div style="height:160px;background:var(--bg4);overflow:hidden">
        ${p.imagen_path ? `<img src="${coverSrc(p.imagen_path)}" alt="${escHtml(p.nombre)}" style="width:100%;height:100%;object-fit:cover">` : '<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:48px">🛒</div>'}
      </div>
      <div style="padding:14px">
        <h4 style="margin:0 0 6px;font-size:14px;font-weight:800;line-height:1.3">${escHtml(p.nombre)}</h4>
        ${p.descripcion ? `<p style="margin:0;font-size:12px;color:var(--text3);line-height:1.5;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">${escHtml(p.descripcion)}</p>` : ''}
        ${p.link_url ? `<div style="margin-top:10px;font-size:11px;color:var(--accent);font-weight:800;text-transform:uppercase;letter-spacing:.5px">Ver producto →</div>` : ''}
      </div>
    </div>`).join('');

  // Mover el track
  const itemW = track.parentElement.offsetWidth / Math.min(PROD_VISIBLE, carruselItems.length);
  track.style.transform = `translateX(-${carruselIndex * (itemW + 16)}px)`;

  // Dots
  const totalPages = Math.ceil(carruselItems.length / PROD_VISIBLE);
  document.getElementById('prod-dots').innerHTML = Array.from({length: totalPages}, (_, i) =>
    `<div onclick="irAPagina(${i})" style="width:${i===Math.floor(carruselIndex/PROD_VISIBLE)?'24':'8'}px;height:8px;border-radius:4px;background:${i===Math.floor(carruselIndex/PROD_VISIBLE)?'var(--accent)':'var(--bg4)'};cursor:pointer;transition:.3s"></div>`
  ).join('');
}

function moverCarrusel(dir) {
  const max = Math.max(0, carruselItems.length - PROD_VISIBLE);
  carruselIndex = Math.max(0, Math.min(carruselIndex + dir, max));
  renderCarrusel();
}
function irAPagina(page) {
  carruselIndex = page * PROD_VISIBLE;
  renderCarrusel();
}
function abrirProducto(url) {
  if (url && url.startsWith('http')) window.open(url, '_blank', 'noopener noreferrer');
}

// ── PERFIL ────────────────────────────────────────────────────
async function renderProfile() {
  try {
    const perfil = await API.getPerfil();
    miPlan = perfil.plan_suscripcion || 'ninguno';
    const info = planInfo[miPlan] || planInfo.ninguno;
    document.getElementById('prof-avatar').textContent = perfil.username.charAt(0).toUpperCase();
    document.getElementById('prof-username').textContent = perfil.username;
    document.getElementById('prof-email').textContent   = perfil.email;
    document.getElementById('prof-rol').textContent     = perfil.rol === 'admin' ? '🛡️ Administrador' : '👤 Usuario';
    document.getElementById('prof-desde').textContent   = perfil.created_at?.slice(0,10) || '—';
    document.getElementById('prof-favs').textContent    = perfil.total_favoritos || 0;
    document.getElementById('prof-hist').textContent    = perfil.total_historial || 0;

    const planes = await API.getPlanes().catch(() => []);
    const planActual = planes.find(p => p.tipo === miPlan);
    const benes = planActual ? (planActual.beneficios||'').split('|').filter(Boolean) : [];

    document.getElementById('prof-sub-content').innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
        <span style="font-size:36px">${info.icon}</span>
        <div>
          <div style="font-weight:900;font-size:18px;color:${info.color}">${info.label}</div>
          ${miPlan !== 'ninguno' && perfil.suscripcion_desde ? `<div style="font-size:12px;color:var(--text3)">Desde: ${perfil.suscripcion_desde?.slice(0,10)}</div>` : ''}
        </div>
      </div>
      ${miPlan === 'ninguno'
        ? `<p style="color:var(--text3);font-size:13px;margin:0">No tienes ningún plan activo. ¡Suscríbete para disfrutar sin anuncios y con todos los beneficios!</p>`
        : benes.length ? `<ul style="margin:0;padding-left:18px;font-size:13px;color:var(--text2);display:flex;flex-direction:column;gap:6px">${benes.map(b=>`<li>${escHtml(b)}</li>`).join('')}</ul>` : ''
      }
    `;
  } catch(e) { console.error(e); }
}

function escHtml(str) {
  return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ══════════════════════════════════════════════════════════════
//  MANGA – LÓGICA DE USUARIO
// ══════════════════════════════════════════════════════════════
let mangaCurrentAnimeId = null;
let mangaCapitulosList  = [];
let mangaCurrentCapIdx  = 0;

async function initMangaTab() {
  // Mostrar botones por anime
  const pills = document.getElementById('manga-anime-pills');
  pills.innerHTML = allAnimes.map(a =>
    `<button class="btn btn-sm ${+a.id === mangaCurrentAnimeId ? 'btn-primary' : 'btn-secondary'}"
       onclick="selectMangaAnime(${a.id},'${a.nombre.replace(/'/g,"\\'")}')">${a.nombre}</button>`
  ).join('');

  if (mangaCurrentAnimeId) {
    await cargarCapitulosManga(mangaCurrentAnimeId);
  } else if (allAnimes.length) {
    selectMangaAnime(allAnimes[0].id, allAnimes[0].nombre);
  }
}

async function selectMangaAnime(id, nombre) {
  mangaCurrentAnimeId = id;
  // Actualizar pills
  document.querySelectorAll('#manga-anime-pills .btn').forEach(b => {
    b.className = b.textContent.trim() === nombre ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-secondary';
  });
  await cargarCapitulosManga(id);
}

async function cargarCapitulosManga(animeId) {
  const grid  = document.getElementById('manga-caps-grid');
  const empty = document.getElementById('manga-empty');
  grid.innerHTML = '<div style="color:var(--text3);padding:24px">Cargando...</div>';
  try {
    mangaCapitulosList = await API.getCapitulos(animeId);
    grid.innerHTML = '';
    if (!mangaCapitulosList.length) {
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');

    // Obtener progreso
    let progresoMap = {};
    try {
      const prog = await API.getMangaProgreso(animeId);
      prog.forEach(p => progresoMap[p.capitulo_id] = p.pagina);
    } catch {}

    grid.innerHTML = mangaCapitulosList.map((c, idx) => {
      const prog = progresoMap[c.id];
      const pct  = (c.total_paginas > 0 && prog) ? Math.round((prog / c.total_paginas) * 100) : 0;
      return `<div onclick="abrirCapitulo(${idx})"
        style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;overflow:hidden;cursor:pointer;transition:.2s"
        onmouseover="this.style.borderColor='var(--accent)';this.style.transform='translateY(-3px)'"
        onmouseout="this.style.borderColor='var(--border)';this.style.transform=''">
        <div style="height:200px;background:var(--bg4);display:flex;align-items:center;justify-content:center;overflow:hidden;font-size:48px">
          ${c.portada_path ? `<img src="${coverSrc(c.portada_path)}" alt="" style="width:100%;height:100%;object-fit:cover">` : '📖'}
        </div>
        <div style="padding:12px">
          <div style="font-size:11px;color:var(--gold);font-weight:900;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px">
            Cap. ${c.numero}
          </div>
          <div style="font-weight:800;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${c.titulo || 'Capítulo ' + c.numero}</div>
          <div style="font-size:11px;color:var(--text3);margin-top:4px">${c.total_paginas} páginas</div>
          ${pct > 0 ? `<div style="margin-top:8px">
            <div style="background:var(--bg4);border-radius:4px;height:4px;overflow:hidden">
              <div style="background:var(--accent);width:${pct}%;height:100%;border-radius:4px;transition:.3s"></div>
            </div>
            <div style="font-size:10px;color:var(--text3);margin-top:2px">${pct}% leído</div>
          </div>` : ''}
        </div>
      </div>`;
    }).join('');
  } catch(e) {
    grid.innerHTML = `<div style="color:var(--accent);padding:24px">${e.message}</div>`;
  }
}

async function abrirCapitulo(idx) {
  mangaCurrentCapIdx = idx;
  const cap = mangaCapitulosList[idx];
  document.getElementById('reader-title').textContent = (cap.titulo || 'Capítulo ' + cap.numero);
  document.getElementById('reader-cap-label').textContent = `Cap. ${cap.numero}`;
  document.getElementById('reader-prev-cap').disabled  = idx === 0;
  document.getElementById('reader-prev-cap2').disabled = idx === 0;
  document.getElementById('reader-next-cap').disabled  = idx >= mangaCapitulosList.length - 1;
  document.getElementById('reader-next-cap2').disabled = idx >= mangaCapitulosList.length - 1;

  // Mostrar vista reader
  document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
  document.getElementById('view-manga-reader').style.display = 'block';
  window.scrollTo(0, 0);

  const pagesDiv = document.getElementById('reader-pages');
  const loading  = document.getElementById('reader-loading');
  pagesDiv.innerHTML = '';
  loading.style.display = 'block';

  try {
    const paginas = await API.getPaginas(cap.id);
    loading.style.display = 'none';
    if (!paginas.length) {
      pagesDiv.innerHTML = '<div style="text-align:center;color:var(--text3);padding:40px">Este capítulo no tiene páginas aún</div>';
      return;
    }
    pagesDiv.innerHTML = paginas.map((p, i) =>
      `<img src="${coverSrc(p.imagen_path)}" alt="Página ${p.numero}"
        style="width:100%;display:block;max-width:100%"
        onload="if(${i}===${Math.floor(paginas.length/2)})guardarProgresoManga(${cap.id},${p.numero})">`
    ).join('');
  } catch(e) {
    loading.style.display = 'none';
    pagesDiv.innerHTML = `<div style="color:var(--accent);padding:24px">${e.message}</div>`;
  }
}

async function guardarProgresoManga(capId, pag) {
  try { await API.saveMangaProgreso({ capitulo_id: capId, pagina: pag }); } catch {}
}

function navegarCapitulo(dir) {
  const newIdx = mangaCurrentCapIdx + dir;
  if (newIdx < 0 || newIdx >= mangaCapitulosList.length) return;
  abrirCapitulo(newIdx);
}

// ══════════════════════════════════════════════════════════════
//  CHAT COMUNITARIO – LÓGICA DE USUARIO
// ══════════════════════════════════════════════════════════════
let chatAnimeId     = null;
let chatPollingTimer = null;
let chatLastId      = 0;

async function initChatTab() {
  // Botones de animes
  const btns = document.getElementById('chat-anime-btns');
  btns.innerHTML = allAnimes.map(a =>
    `<button class="btn btn-sm btn-secondary" id="chat-btn-${a.id}"
       onclick="setChatAnime(${a.id},'${a.nombre.replace(/'/g,"\\'")}')">${a.nombre}</button>`
  ).join('');
  await setChatAnime(chatAnimeId);
  // Polling cada 8 segundos
  clearInterval(chatPollingTimer);
  chatPollingTimer = setInterval(pollingChat, 8000);
}

async function setChatAnime(animeId, nombre) {
  chatAnimeId = animeId;
  chatLastId  = 0;
  // Actualizar botones
  document.getElementById('chat-btn-global').style.background = animeId === null ? 'var(--accent)' : 'var(--bg4)';
  document.getElementById('chat-btn-global').style.color      = animeId === null ? '#fff' : 'var(--text2)';
  allAnimes.forEach(a => {
    const b = document.getElementById('chat-btn-'+a.id);
    if (b) {
      b.style.background = +a.id === +animeId ? 'var(--accent)' : 'var(--bg4)';
      b.style.color      = +a.id === +animeId ? '#fff' : 'var(--text2)';
    }
  });
  const label = document.getElementById('chat-context-label');
  label.textContent = animeId ? `💬 Hablando en el chat de "${nombre}"` : '🌐 Hablando en el chat global';
  await cargarMensajes();
}

async function cargarMensajes() {
  const div = document.getElementById('chat-messages');
  const params = { limit: 40 };
  if (chatAnimeId) params.anime_id = chatAnimeId;
  try {
    const msgs = await API.getChatMensajes(params);
    if (!msgs.length) {
      div.innerHTML = '<div style="text-align:center;color:var(--text3);padding:40px 0">Sé el primero en escribir algo 👋</div>';
      chatLastId = 0; return;
    }
    chatLastId = msgs[msgs.length - 1].id;
    renderMensajes(msgs, div);
  } catch(e) { console.error(e); }
}

async function pollingChat() {
  if (document.getElementById('view-chat').style.display === 'none') return;
  const params = { limit: 20 };
  if (chatAnimeId) params.anime_id = chatAnimeId;
  try {
    const msgs = await API.getChatMensajes(params);
    if (!msgs.length) return;
    const newLast = msgs[msgs.length-1].id;
    if (newLast === chatLastId) return;
    chatLastId = newLast;
    const div = document.getElementById('chat-messages');
    const wasBottom = div.scrollHeight - div.scrollTop - div.clientHeight < 60;
    renderMensajes(msgs, div);
    if (wasBottom) div.scrollTop = div.scrollHeight;
  } catch {}
}

function renderMensajes(msgs, div) {
  const atBottom = div.scrollHeight - div.scrollTop - div.clientHeight < 60;
  div.innerHTML = msgs.map(m => {
    const esPropio = m.usuario_id === currentUser?.id;
    return `<div style="display:flex;gap:10px;align-items:flex-start;${esPropio?'flex-direction:row-reverse':''}">
      <div style="width:34px;height:34px;border-radius:50%;background:${esPropio?'var(--accent)':'var(--bg4)'};
        display:flex;align-items:center;justify-content:center;font-weight:900;font-size:14px;flex-shrink:0;
        border:2px solid ${m.rol==='admin'?'var(--gold)':'transparent'}">
        ${m.username.charAt(0).toUpperCase()}
      </div>
      <div style="max-width:75%;${esPropio?'align-items:flex-end':''}">
        <div style="font-size:11px;color:${m.rol==='admin'?'var(--gold)':'var(--text3)'};font-weight:800;margin-bottom:3px;${esPropio?'text-align:right':''}">
          ${m.rol==='admin'?'👑 ':''} ${m.username} · ${new Date(m.created_at).toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'})}
          ${esPropio?`<button onclick="borrarMiMensaje(${m.id})" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:11px;margin-left:4px">🗑️</button>`:''}
        </div>
        <div style="background:${esPropio?'var(--accent)':'var(--bg4)'};color:${esPropio?'#fff':'var(--text1)'};
          padding:10px 14px;border-radius:${esPropio?'16px 4px 16px 16px':'4px 16px 16px 16px'};
          font-size:14px;line-height:1.5;word-break:break-word">
          ${escHtmlUser(m.mensaje)}
        </div>
      </div>
    </div>`;
  }).join('');
  if (atBottom) div.scrollTop = div.scrollHeight;
}

async function enviarChatMensaje() {
  const input = document.getElementById('chat-input');
  const msg   = input.value.trim();
  if (!msg) return;
  input.value = '';
  input.disabled = true;
  try {
    const data = { mensaje: msg };
    if (chatAnimeId) data.anime_id = chatAnimeId;
    await API.enviarMensaje(data);
    await cargarMensajes();
    const div = document.getElementById('chat-messages');
    div.scrollTop = div.scrollHeight;
  } catch(e) { showToast(e.message, true); input.value = msg; }
  finally { input.disabled = false; input.focus(); }
}

async function borrarMiMensaje(id) {
  try {
    await API.eliminarMensaje(id);
    await cargarMensajes();
  } catch(e) { showToast(e.message, true); }
}

function escHtmlUser(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
}
