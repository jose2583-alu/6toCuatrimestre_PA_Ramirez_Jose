<?php
require_once __DIR__.'/../includes/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$db     = getDB();

// ── GET: obtener mensajes ─────────────────────────────────
if ($method === 'GET') {
    $u = requireAuth();
    $animeId = isset($_GET['anime_id']) ? (int)$_GET['anime_id'] : null;
    $antes   = isset($_GET['antes_de']) ? (int)$_GET['antes_de'] : null;
    $limit   = min(50, max(10, (int)($_GET['limit'] ?? 30)));

    $w = ['cm.activo = 1'];
    $p = [];
    if ($animeId) { $w[] = 'cm.anime_id = ?'; $p[] = $animeId; }
    else           { $w[] = 'cm.anime_id IS NULL'; }
    if ($antes)   { $w[] = 'cm.id < ?'; $p[] = $antes; }

    $sql = "SELECT cm.id, cm.mensaje, cm.created_at,
                   u.id AS usuario_id, u.username, u.avatar, u.rol
            FROM chat_mensajes cm
            JOIN usuarios u ON u.id = cm.usuario_id
            WHERE " . implode(' AND ', $w) . "
            ORDER BY cm.id DESC LIMIT $limit";
    $st = $db->prepare($sql);
    $st->execute($p);
    $rows = array_reverse($st->fetchAll()); // orden cronológico
    jsonResponse($rows);
}

// ── POST: enviar mensaje ──────────────────────────────────
if ($method === 'POST') {
    $u = requireAuth();
    $d = json_decode(file_get_contents('php://input'), true) ?? [];
    $mensaje  = trim($d['mensaje'] ?? '');
    $animeId  = isset($d['anime_id']) ? (int)$d['anime_id'] : null;

    if (strlen($mensaje) < 1)   jsonResponse(['error' => 'Mensaje vacío'], 400);
    if (strlen($mensaje) > 500) jsonResponse(['error' => 'Máximo 500 caracteres'], 400);

    // Rate limit simple: máximo 1 mensaje cada 2 segundos por usuario
    $last = $db->prepare("SELECT created_at FROM chat_mensajes WHERE usuario_id=? ORDER BY id DESC LIMIT 1");
    $last->execute([$u['id']]);
    $row = $last->fetch();
    if ($row && (time() - strtotime($row['created_at'])) < 2)
        jsonResponse(['error' => 'Espera un momento antes de enviar otro mensaje'], 429);

    $db->prepare("INSERT INTO chat_mensajes (usuario_id, anime_id, mensaje) VALUES(?,?,?)")
       ->execute([$u['id'], $animeId ?: null, $mensaje]);
    $msgId = (int)$db->lastInsertId();

    // Devolver el mensaje creado con datos de usuario
    $st = $db->prepare("SELECT cm.id, cm.mensaje, cm.created_at,
                               u.id AS usuario_id, u.username, u.avatar, u.rol
                        FROM chat_mensajes cm JOIN usuarios u ON u.id=cm.usuario_id
                        WHERE cm.id=?");
    $st->execute([$msgId]);
    jsonResponse($st->fetch(), 201);
}

// ── DELETE: eliminar mensaje (admin o dueño) ──────────────
if ($method === 'DELETE') {
    $u  = requireAuth();
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) jsonResponse(['error' => 'id requerido'], 400);
    $st = $db->prepare("SELECT usuario_id FROM chat_mensajes WHERE id=?");
    $st->execute([$id]);
    $msg = $st->fetch();
    if (!$msg) jsonResponse(['error' => 'No encontrado'], 404);
    if ($u['rol'] !== 'admin' && $msg['usuario_id'] !== $u['id'])
        jsonResponse(['error' => 'No autorizado'], 403);
    $db->prepare("UPDATE chat_mensajes SET activo=0 WHERE id=?")->execute([$id]);
    jsonResponse(['success' => true]);
}

jsonResponse(['error' => 'Método no permitido'], 405);
