const API = {
    base: (function(){ var p=window.location.pathname; return p.startsWith('/animex/')?'/animex/api':'/api'; })(),
    root: (function(){ return window.location.pathname.startsWith('/animex/')?'/animex':''; })(),

    async _req(url, opts = {}) {
        try {
            const res = await fetch(url, { credentials: 'include', ...opts });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error del servidor');
            return data;
        } catch (e) { throw e; }
    },

    login: (username, password) => API._req(`${API.base}/auth.php?action=login`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({username,password}) }),
    register: (username, email, password) => API._req(`${API.base}/auth.php?action=register`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({username,email,password}) }),
    logout: () => API._req(`${API.base}/auth.php?action=logout`),
    session: () => API._req(`${API.base}/auth.php?action=session`),
    getAnimes: (params={}) => { const qs=new URLSearchParams(params).toString(); return API._req(`${API.base}/animes.php${qs?'?'+qs:''}`); },
    getAnime: (id) => API._req(`${API.base}/animes.php?id=${id}`),
    saveAnime: (fd) => API._req(`${API.base}/animes.php`, {method:'POST',body:fd}),
    updateAnime: (id,data) => API._req(`${API.base}/animes.php?id=${id}`, {method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}),
    deleteAnime: (id) => API._req(`${API.base}/animes.php?id=${id}`, {method:'DELETE'}),
    getFavoritos: () => API._req(`${API.base}/user.php?action=favoritos`),
    toggleFav: (id) => API._req(`${API.base}/user.php?action=favorito`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({anime_id:id})}),
    getHistorial: () => API._req(`${API.base}/user.php?action=historial`),
    saveProgreso: (data) => API._req(`${API.base}/user.php?action=progreso`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}),
    getGeneros: () => API._req(`${API.base}/user.php?action=generos`),
    getPerfil: () => API._req(`${API.base}/user.php?action=perfil`),
    getUsuarios: () => API._req(`${API.base}/user.php?action=usuarios`),
    toggleUser: (id) => API._req(`${API.base}/user.php?action=toggle_usuario`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})}),

    // Planes de suscripción
    getPlanes: () => API._req(`${API.base}/extras.php?action=planes`),
    updatePlan: (tipo, data) => API._req(`${API.base}/extras.php?action=planes`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tipo,...data})}),
    getMiPlan: () => API._req(`${API.base}/extras.php?action=mi_plan`),
    asignarPlan: (usuario_id, plan) => API._req(`${API.base}/extras.php?action=asignar_plan`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({usuario_id,plan})}),

    // Anuncios
    getAnuncios: (params={}) => { const qs=new URLSearchParams(params).toString(); return API._req(`${API.base}/extras.php?action=anuncios${qs?'&'+qs:''}`); },
    getAnuncioActivo: (tipo='global') => API._req(`${API.base}/extras.php?action=anuncios_activos&tipo=${tipo}`),
    saveAnuncio: (fd) => API._req(`${API.base}/extras.php?action=anuncios`, {method:'POST',body:fd}),
    deleteAnuncio: (id) => API._req(`${API.base}/extras.php?action=anuncios&id=${id}`, {method:'DELETE'}),
    toggleAnuncio: (id, activo) => API._req(`${API.base}/extras.php?action=anuncios&id=${id}`, {method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({activo})}),

    // Productos
    getProductos: (anime_id) => API._req(`${API.base}/extras.php?action=productos&anime_id=${anime_id}&activos`),
    getProductosAdmin: (anime_id) => API._req(`${API.base}/extras.php?action=productos&anime_id=${anime_id}`),
    saveProducto: (fd) => API._req(`${API.base}/extras.php?action=productos`, {method:'POST',body:fd}),
    deleteProducto: (id) => API._req(`${API.base}/extras.php?action=productos&id=${id}`, {method:'DELETE'}),

    // Manga
    getCapitulos: (anime_id, all=false) => API._req(`${API.base}/manga.php?anime_id=${anime_id}${all?'&all':''}`),
    saveCapitulo: (fd) => API._req(`${API.base}/manga.php`, {method:'POST', body:fd}),
    updateCapitulo: (id, data) => API._req(`${API.base}/manga.php?id=${id}`, {method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data)}),
    deleteCapitulo: (id) => API._req(`${API.base}/manga.php?id=${id}`, {method:'DELETE'}),
    getPaginas: (capitulo_id) => API._req(`${API.base}/manga.php?action=paginas&capitulo_id=${capitulo_id}`),
    subirPaginas: (fd) => API._req(`${API.base}/manga.php?action=paginas`, {method:'POST', body:fd}),
    deletePagina: (id) => API._req(`${API.base}/manga.php?action=paginas&id=${id}`, {method:'DELETE'}),
    getMangaProgreso: (anime_id) => API._req(`${API.base}/manga.php?action=progreso&anime_id=${anime_id}`),
    saveMangaProgreso: (data) => API._req(`${API.base}/manga.php?action=progreso`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data)}),

    // Chat comunitario
    getChatMensajes: (params={}) => { const qs=new URLSearchParams(params).toString(); return API._req(`${API.base}/chat.php${qs?'?'+qs:''}`); },
    enviarMensaje: (data) => API._req(`${API.base}/chat.php`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data)}),
    eliminarMensaje: (id) => API._req(`${API.base}/chat.php?id=${id}`, {method:'DELETE'}),

};

function showToast(msg, isError=false) {
    let t=document.getElementById('toast');
    if(!t){t=document.createElement('div');t.id='toast';document.body.appendChild(t);}
    t.textContent=msg; t.className=isError?'error':''; t.classList.add('show');
    clearTimeout(t._timer); t._timer=setTimeout(()=>t.classList.remove('show'),3200);
}

async function guardAuth(requiredRole=null) {
    try {
        const s=await API.session();
        var _r=window.location.pathname.startsWith('/animex/')?'/animex':''; if(!s.loggedIn){window.location.href=_r+'/index.html';return null;}
        if(requiredRole&&s.user.rol!==requiredRole){
            window.location.href=requiredRole==='admin'?_r+'/user/index.html':_r+'/admin/index.html';
            return null;
        }
        return s.user;
    } catch { window.location.href=(window.location.pathname.startsWith('/animex/')?'/animex':'')+'/index.html'; return null; }
}

// Usar img.php para servir archivos de uploads (evita 404 de Apache)
function coverSrc(path) {
    if(!path) return '';
    if(path.startsWith('http')) return path;
    const filePart = path.replace('uploads/','');
    var _root=window.location.pathname.startsWith('/animex/')?'/animex':''; return _root+'/img.php?f=' + encodeURIComponent(filePart);
}
