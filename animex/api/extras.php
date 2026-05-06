<?php
require_once __DIR__.'/../includes/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
$db     = getDB();

// ── Subir imagen (anuncios o productos) ──────────────────────
function subirImagen(string $campo = 'imagen', string $subcarpeta = 'ads'): ?string {
    if (empty($_FILES[$campo]['tmp_name']) || $_FILES[$campo]['error'] !== 0) return null;
    $ext = strtolower(pathinfo($_FILES[$campo]['name'], PATHINFO_EXTENSION));
    if (!in_array($ext, ['jpg','jpeg','png','webp','gif']))
        jsonResponse(['error' => 'Formato de imagen no permitido'], 400);
    $dir = UPLOAD_DIR . $subcarpeta . '/';
    if (!is_dir($dir)) @mkdir($dir, 0755, true);
    $fn = uniqid($subcarpeta.'_') . '.' . $ext;
    if (!move_uploaded_file($_FILES[$campo]['tmp_name'], $dir . $fn))
        jsonResponse(['error' => 'No se pudo guardar la imagen'], 500);
    return 'uploads/' . $subcarpeta . '/' . $fn;
}

// ────────────────────────────────────────────────────────────
// PLANES DE SUSCRIPCIÓN
// ────────────────────────────────────────────────────────────
if ($action === 'planes') {
    if ($method === 'GET') {
        $planes = $db->query("SELECT * FROM planes_suscripcion ORDER BY id ASC")->fetchAll();
        jsonResponse($planes);
    }
    if ($method === 'POST') {
        requireAdmin();
        $d = json_decode(file_get_contents('php://input'), true) ?? [];
        $tipo        = trim($d['tipo'] ?? '');
        $precio      = (float)($d['precio'] ?? 0);
        $beneficios  = trim($d['beneficios'] ?? '');
        $activo      = isset($d['activo']) ? (int)$d['activo'] : 1;
        if (!$tipo) jsonResponse(['error' => 'tipo requerido'], 400);
        $db->prepare("UPDATE planes_suscripcion SET precio=?, beneficios=?, activo=? WHERE tipo=?")
           ->execute([$precio, $beneficios, $activo, $tipo]);
        jsonResponse(['success' => true]);
    }
}

// ────────────────────────────────────────────────────────────
// SUSCRIPCIÓN DE USUARIO
// ────────────────────────────────────────────────────────────
if ($action === 'mi_plan') {
    $u = requireAuth();
    $s = $db->prepare("SELECT plan_suscripcion, suscripcion_desde FROM usuarios WHERE id=?");
    $s->execute([$u['id']]);
    jsonResponse($s->fetch() ?: ['plan_suscripcion'=>'ninguno','suscripcion_desde'=>null]);
}

if ($action === 'asignar_plan' && $method === 'POST') {
    requireAdmin();
    $d    = json_decode(file_get_contents('php://input'), true) ?? [];
    $uid  = (int)($d['usuario_id'] ?? 0);
    $plan = $d['plan'] ?? 'ninguno';
    $validos = ['ninguno','individual','familiar','anual'];
    if (!$uid || !in_array($plan, $validos))
        jsonResponse(['error' => 'Datos inválidos'], 400);
    $db->prepare("UPDATE usuarios SET plan_suscripcion=?, suscripcion_desde=? WHERE id=?")
       ->execute([$plan, $plan !== 'ninguno' ? date('Y-m-d H:i:s') : null, $uid]);
    jsonResponse(['success' => true]);
}

// ────────────────────────────────────────────────────────────
// ANUNCIOS
// ────────────────────────────────────────────────────────────
if ($action === 'anuncios') {
    if ($method === 'GET') {
        $tipo = $_GET['tipo'] ?? null;
        $solo_activos = isset($_GET['activos']);
        $w = []; $p = [];
        if ($tipo) { $w[] = 'tipo=?'; $p[] = $tipo; }
        if ($solo_activos) { $w[] = 'activo=1'; }
        $sql = 'SELECT * FROM anuncios' . ($w ? ' WHERE '.implode(' AND ', $w) : '') . ' ORDER BY id DESC';
        $st = $db->prepare($sql); $st->execute($p); jsonResponse($st->fetchAll());
    }
    if ($method === 'POST') {
        requireAdmin();
        $titulo  = trim($_POST['titulo'] ?? '');
        $link    = trim($_POST['link_url'] ?? '');
        $tipo    = $_POST['tipo'] ?? 'global';
        $activo  = isset($_POST['activo']) ? (int)$_POST['activo'] : 1;
        if (!$titulo) jsonResponse(['error' => 'Título requerido'], 400);
        $img = subirImagen('imagen', 'ads');
        $db->prepare("INSERT INTO anuncios (titulo, imagen_path, link_url, activo, tipo) VALUES (?,?,?,?,?)")
           ->execute([$titulo, $img, $link, $activo, $tipo]);
        jsonResponse(['success' => true, 'id' => (int)$db->lastInsertId()], 201);
    }
    if ($method === 'PUT') {
        requireAdmin();
        $id  = (int)($_GET['id'] ?? 0);
        if (!$id) jsonResponse(['error' => 'ID requerido'], 400);
        $src = !empty($_POST) ? $_POST : (json_decode(file_get_contents('php://input'), true) ?? []);
        $f=[]; $v=[];
        if (isset($src['titulo']))   { $f[]='titulo=?';   $v[]=$src['titulo']; }
        if (isset($src['link_url'])) { $f[]='link_url=?'; $v[]=$src['link_url']; }
        if (isset($src['activo']))   { $f[]='activo=?';   $v[]=(int)$src['activo']; }
        if (isset($src['tipo']))     { $f[]='tipo=?';     $v[]=$src['tipo']; }
        $ni = subirImagen('imagen', 'ads');
        if ($ni) { $f[]='imagen_path=?'; $v[]=$ni; }
        if ($f) { $v[]=$id; $db->prepare("UPDATE anuncios SET ".implode(',',$f)." WHERE id=?")->execute($v); }
        jsonResponse(['success' => true]);
    }
    if ($method === 'DELETE') {
        requireAdmin();
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) jsonResponse(['error' => 'ID requerido'], 400);
        $r = $db->prepare("SELECT imagen_path FROM anuncios WHERE id=?"); $r->execute([$id]);
        $an = $r->fetch();
        if ($an && $an['imagen_path']) { $f = __DIR__.'/../'.$an['imagen_path']; if(file_exists($f)) unlink($f); }
        $db->prepare("DELETE FROM anuncios WHERE id=?")->execute([$id]);
        jsonResponse(['success' => true]);
    }
}

// ────────────────────────────────────────────────────────────
// PRODUCTOS POR ANIME
// ────────────────────────────────────────────────────────────
if ($action === 'productos') {
    if ($method === 'GET') {
        $anime_id = (int)($_GET['anime_id'] ?? 0);
        if (!$anime_id) jsonResponse(['error' => 'anime_id requerido'], 400);
        $solo_activos = isset($_GET['activos']);
        $sql = "SELECT * FROM anime_productos WHERE anime_id=?" . ($solo_activos ? " AND activo=1" : "") . " ORDER BY orden ASC, id ASC";
        $st = $db->prepare($sql); $st->execute([$anime_id]); jsonResponse($st->fetchAll());
    }
    if ($method === 'POST') {
        requireAdmin();
        $anime_id   = (int)($_POST['anime_id'] ?? 0);
        $nombre     = trim($_POST['nombre'] ?? '');
        $descripcion= trim($_POST['descripcion'] ?? '');
        $link       = trim($_POST['link_url'] ?? '');
        $orden      = (int)($_POST['orden'] ?? 0);
        if (!$anime_id || !$nombre) jsonResponse(['error' => 'anime_id y nombre son requeridos'], 400);
        $img = subirImagen('imagen', 'productos');
        $db->prepare("INSERT INTO anime_productos (anime_id, nombre, descripcion, imagen_path, link_url, orden) VALUES (?,?,?,?,?,?)")
           ->execute([$anime_id, $nombre, $descripcion, $img, $link, $orden]);
        jsonResponse(['success' => true, 'id' => (int)$db->lastInsertId()], 201);
    }
    if ($method === 'PUT') {
        requireAdmin();
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) jsonResponse(['error' => 'ID requerido'], 400);
        $src = !empty($_POST) ? $_POST : (json_decode(file_get_contents('php://input'), true) ?? []);
        $f=[]; $v=[];
        if (isset($src['nombre']))      { $f[]='nombre=?';      $v[]=$src['nombre']; }
        if (isset($src['descripcion'])) { $f[]='descripcion=?'; $v[]=$src['descripcion']; }
        if (isset($src['link_url']))    { $f[]='link_url=?';    $v[]=$src['link_url']; }
        if (isset($src['orden']))       { $f[]='orden=?';       $v[]=(int)$src['orden']; }
        if (isset($src['activo']))      { $f[]='activo=?';      $v[]=(int)$src['activo']; }
        $ni = subirImagen('imagen', 'productos');
        if ($ni) { $f[]='imagen_path=?'; $v[]=$ni; }
        if ($f) { $v[]=$id; $db->prepare("UPDATE anime_productos SET ".implode(',',$f)." WHERE id=?")->execute($v); }
        jsonResponse(['success' => true]);
    }
    if ($method === 'DELETE') {
        requireAdmin();
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) jsonResponse(['error' => 'ID requerido'], 400);
        $r = $db->prepare("SELECT imagen_path FROM anime_productos WHERE id=?"); $r->execute([$id]);
        $p = $r->fetch();
        if ($p && $p['imagen_path']) { $f = __DIR__.'/../'.$p['imagen_path']; if(file_exists($f)) unlink($f); }
        $db->prepare("DELETE FROM anime_productos WHERE id=?")->execute([$id]);
        jsonResponse(['success' => true]);
    }
}

// Anuncios activos para usuario (GET rápido)
if ($action === 'anuncios_activos') {
    $tipo = $_GET['tipo'] ?? 'global';
    $st = $db->prepare("SELECT * FROM anuncios WHERE activo=1 AND tipo=? ORDER BY RAND() LIMIT 1");
    $st->execute([$tipo]);
    $anuncio = $st->fetch();
    jsonResponse($anuncio ?: null);
}

jsonResponse(['error' => 'Acción no válida'], 404);
