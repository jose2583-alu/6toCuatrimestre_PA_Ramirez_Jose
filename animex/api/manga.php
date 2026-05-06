<?php
@ini_set('display_errors', 0);
error_reporting(0);

require_once __DIR__.'/../includes/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
$db     = getDB();

// ── Crear directorio con diagnóstico de error ──────────────
function mkdirManga(string $dir): void {
    if (is_dir($dir)) return;
    // Intentar crear recursivamente con 0777
    if (!@mkdir($dir, 0777, true)) {
        // Diagnóstico: ver qué parte de la ruta falla
        $parts = explode(DIRECTORY_SEPARATOR, $dir);
        $path  = '';
        foreach ($parts as $part) {
            if ($part === '') { $path = DIRECTORY_SEPARATOR; continue; }
            $path .= ($path && $path !== DIRECTORY_SEPARATOR ? DIRECTORY_SEPARATOR : '') . $part;
            if (!is_dir($path)) {
                if (!@mkdir($path, 0777)) {
                    jsonResponse([
                        'error'   => 'No se pudo crear el directorio. Contacta al admin del hosting.',
                        'detalle' => "mkdir falló en: $path",
                        'sugerencia' => 'Crea manualmente la carpeta uploads/manga/portadas/ y uploads/manga/paginas/ con permisos 755'
                    ], 500);
                }
            }
        }
    }
}

// ── Subir imagen única ──────────────────────────────────────
function subirImagenManga(string $campo, string $sub): ?string {
    if (!isset($_FILES[$campo]) || empty($_FILES[$campo]['tmp_name']) || $_FILES[$campo]['error'] !== 0) return null;
    $ext = strtolower(pathinfo($_FILES[$campo]['name'], PATHINFO_EXTENSION));
    if (!in_array($ext, ['jpg','jpeg','png','webp','gif']))
        jsonResponse(['error' => 'Formato no permitido: ' . $ext], 400);
    $dir = UPLOAD_DIR . $sub . '/';
    mkdirManga(rtrim($dir, '/'));
    $fn = uniqid($sub.'_') . '.' . $ext;
    $dest = $dir . $fn;
    if (!move_uploaded_file($_FILES[$campo]['tmp_name'], $dest)) {
        jsonResponse([
            'error'   => 'No se pudo mover la imagen. Verifica permisos en uploads/',
            'detalle' => 'Destino: ' . $dest . ' | is_writable: ' . (is_writable($dir) ? 'si' : 'no')
        ], 500);
    }
    return 'uploads/' . $sub . '/' . $fn;
}

// ── Subir páginas en lote ──────────────────────────────────
function subirPaginasManga(int $capId, PDO $db): int {
    if (!isset($_FILES['paginas']) || empty($_FILES['paginas']['name'][0])) return 0;
    $files = $_FILES['paginas'];
    $st = $db->prepare("SELECT COALESCE(MAX(numero),0) FROM manga_paginas WHERE capitulo_id=?");
    $st->execute([$capId]);
    $base = (int)$st->fetchColumn();
    $dir  = UPLOAD_DIR . 'manga/paginas/';
    mkdirManga(rtrim($dir, '/'));
    // Ordenar por nombre natural
    $total   = count($files['name']);
    $indices = range(0, $total - 1);
    usort($indices, fn($a,$b) => strnatcasecmp($files['name'][$a], $files['name'][$b]));
    $count = 0;
    $ins = $db->prepare(
        "INSERT INTO manga_paginas (capitulo_id, numero, imagen_path)
         VALUES(?,?,?) ON DUPLICATE KEY UPDATE imagen_path=VALUES(imagen_path)"
    );
    foreach ($indices as $i) {
        if ((int)$files['error'][$i] !== 0) continue;
        $ext = strtolower(pathinfo($files['name'][$i], PATHINFO_EXTENSION));
        if (!in_array($ext, ['jpg','jpeg','png','webp'])) continue;
        $fn = uniqid('pag_') . '.' . $ext;
        if (!move_uploaded_file($files['tmp_name'][$i], $dir . $fn)) continue;
        $base++;
        $ins->execute([$capId, $base, 'uploads/manga/paginas/' . $fn]);
        $count++;
    }
    return $count;
}

// ═══════════════════════════════════════════════════════════
//  CAPÍTULOS
// ═══════════════════════════════════════════════════════════
if ($action === '' || $action === 'capitulos') {

    if ($method === 'GET') {
        $animeId = (int)($_GET['anime_id'] ?? 0);
        if (!$animeId) jsonResponse(['error' => 'anime_id requerido'], 400);
        $soloActivos = !isset($_GET['all']);
        $w = ['mc.anime_id = ?'];
        if ($soloActivos) $w[] = 'mc.activo = 1';
        $st = $db->prepare(
            "SELECT mc.*, COUNT(mp.id) AS total_paginas
             FROM manga_capitulos mc
             LEFT JOIN manga_paginas mp ON mp.capitulo_id = mc.id
             WHERE " . implode(' AND ', $w) . "
             GROUP BY mc.id ORDER BY mc.numero ASC"
        );
        $st->execute([$animeId]);
        jsonResponse($st->fetchAll());
    }

    if ($method === 'POST') {
        requireAdmin();
        $animeId = (int)($_POST['anime_id'] ?? 0);
        $numero  = (float)($_POST['numero']  ?? 0);
        $titulo  = trim($_POST['titulo']      ?? '');
        $desc    = trim($_POST['descripcion'] ?? '');
        if (!$animeId) jsonResponse(['error' => 'anime_id es requerido'], 400);
        if (!$numero)  jsonResponse(['error' => 'El numero de capitulo es requerido'], 400);
        $chk = $db->prepare("SELECT id FROM animes WHERE id=?"); $chk->execute([$animeId]);
        if (!$chk->fetch()) jsonResponse(['error' => 'Anime no encontrado'], 404);

        $portada = subirImagenManga('portada', 'manga/portadas');

        $db->prepare(
            "INSERT INTO manga_capitulos (anime_id, numero, titulo, descripcion, portada_path)
             VALUES(?,?,?,?,?)
             ON DUPLICATE KEY UPDATE titulo=VALUES(titulo), descripcion=VALUES(descripcion),
             portada_path=COALESCE(VALUES(portada_path),portada_path)"
        )->execute([$animeId, $numero, $titulo ?: "Capítulo $numero", $desc, $portada]);

        $capId = (int)$db->lastInsertId();
        if (!$capId) {
            $st = $db->prepare("SELECT id FROM manga_capitulos WHERE anime_id=? AND numero=?");
            $st->execute([$animeId, $numero]);
            $capId = (int)$st->fetchColumn();
        }
        if (!$capId) jsonResponse(['error' => 'No se pudo crear el capitulo en BD'], 500);

        $pageCount = subirPaginasManga($capId, $db);
        jsonResponse(['success' => true, 'id' => $capId, 'paginas_subidas' => $pageCount], 201);
    }

    if ($method === 'PUT') {
        requireAdmin();
        $capId = (int)($_GET['id'] ?? 0);
        if (!$capId) jsonResponse(['error' => 'id requerido'], 400);
        $src = !empty($_POST) ? $_POST : (json_decode(file_get_contents('php://input'), true) ?? []);
        $f=[]; $v=[];
        if (isset($src['titulo']))      { $f[]='titulo=?';      $v[]=$src['titulo']; }
        if (isset($src['descripcion'])) { $f[]='descripcion=?'; $v[]=$src['descripcion']; }
        if (isset($src['numero']))      { $f[]='numero=?';      $v[]=(float)$src['numero']; }
        if (isset($src['activo']))      { $f[]='activo=?';      $v[]=(int)$src['activo']; }
        $np = subirImagenManga('portada', 'manga/portadas');
        if ($np) { $f[]='portada_path=?'; $v[]=$np; }
        if ($f) { $v[]=$capId; $db->prepare("UPDATE manga_capitulos SET ".implode(',',$f)." WHERE id=?")->execute($v); }
        jsonResponse(['success' => true]);
    }

    if ($method === 'DELETE') {
        requireAdmin();
        $capId = (int)($_GET['id'] ?? 0);
        if (!$capId) jsonResponse(['error' => 'id requerido'], 400);
        $pags = $db->prepare("SELECT imagen_path FROM manga_paginas WHERE capitulo_id=?");
        $pags->execute([$capId]);
        foreach ($pags->fetchAll() as $p) { $f=__DIR__.'/../'.$p['imagen_path']; if(file_exists($f))@unlink($f); }
        $cap = $db->prepare("SELECT portada_path FROM manga_capitulos WHERE id=?"); $cap->execute([$capId]);
        $c = $cap->fetch();
        if ($c && $c['portada_path']) { $f=__DIR__.'/../'.$c['portada_path']; if(file_exists($f))@unlink($f); }
        $db->prepare("DELETE FROM manga_capitulos WHERE id=?")->execute([$capId]);
        jsonResponse(['success' => true]);
    }
}

// ═══════════════════════════════════════════════════════════
//  PÁGINAS
// ═══════════════════════════════════════════════════════════
if ($action === 'paginas') {

    if ($method === 'GET') {
        $capId = (int)($_GET['capitulo_id'] ?? 0);
        if (!$capId) jsonResponse(['error' => 'capitulo_id requerido'], 400);
        $st = $db->prepare("SELECT id, numero, imagen_path FROM manga_paginas WHERE capitulo_id=? ORDER BY numero ASC");
        $st->execute([$capId]);
        jsonResponse($st->fetchAll());
    }

    if ($method === 'POST') {
        requireAdmin();
        $capId = (int)($_POST['capitulo_id'] ?? $_GET['capitulo_id'] ?? 0);
        if (!$capId) jsonResponse(['error' => 'capitulo_id requerido'], 400);
        $count = subirPaginasManga($capId, $db);
        jsonResponse(['success' => true, 'paginas_subidas' => $count]);
    }

    if ($method === 'DELETE') {
        requireAdmin();
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) jsonResponse(['error' => 'id requerido'], 400);
        $st = $db->prepare("SELECT imagen_path FROM manga_paginas WHERE id=?"); $st->execute([$id]);
        $p = $st->fetch();
        if ($p) { $f=__DIR__.'/../'.$p['imagen_path']; if(file_exists($f))@unlink($f); }
        $db->prepare("DELETE FROM manga_paginas WHERE id=?")->execute([$id]);
        jsonResponse(['success' => true]);
    }
}

// ═══════════════════════════════════════════════════════════
//  PROGRESO
// ═══════════════════════════════════════════════════════════
if ($action === 'progreso') {
    $u = requireAuth();
    if ($method === 'GET') {
        $animeId = (int)($_GET['anime_id'] ?? 0);
        if (!$animeId) jsonResponse(['error' => 'anime_id requerido'], 400);
        $st = $db->prepare(
            "SELECT mp2.capitulo_id, mp2.pagina, mc.numero, mc.titulo
             FROM manga_progreso mp2
             JOIN manga_capitulos mc ON mc.id = mp2.capitulo_id
             WHERE mp2.usuario_id=? AND mc.anime_id=?"
        );
        $st->execute([$u['id'], $animeId]);
        jsonResponse($st->fetchAll());
    }
    if ($method === 'POST') {
        $d = json_decode(file_get_contents('php://input'), true) ?? [];
        $capId = (int)($d['capitulo_id'] ?? 0);
        $pag   = max(1, (int)($d['pagina'] ?? 1));
        if (!$capId) jsonResponse(['error' => 'capitulo_id requerido'], 400);
        $db->prepare("INSERT INTO manga_progreso (usuario_id, capitulo_id, pagina) VALUES(?,?,?)
                      ON DUPLICATE KEY UPDATE pagina=VALUES(pagina), updated_at=NOW()")
           ->execute([$u['id'], $capId, $pag]);
        jsonResponse(['success' => true]);
    }
}

// ── Diagnóstico de permisos (GET ?action=check_dirs) ───────
if ($action === 'check_dirs') {
    requireAdmin();
    $dirs = [
        UPLOAD_DIR,
        UPLOAD_DIR . 'manga/',
        UPLOAD_DIR . 'manga/portadas/',
        UPLOAD_DIR . 'manga/paginas/',
    ];
    $info = [];
    foreach ($dirs as $d) {
        $info[] = [
            'path'       => $d,
            'exists'     => is_dir($d),
            'writable'   => is_writable($d),
            'perms'      => is_dir($d) ? substr(sprintf('%o', fileperms($d)), -4) : 'N/A',
        ];
    }
    jsonResponse(['dirs' => $info, 'php_user' => get_current_user(), 'posix_user' => function_exists('posix_getpwuid') ? posix_getpwuid(posix_geteuid())['name'] ?? '?' : 'no-posix']);
}

jsonResponse(['error' => 'Accion no reconocida'], 404);
