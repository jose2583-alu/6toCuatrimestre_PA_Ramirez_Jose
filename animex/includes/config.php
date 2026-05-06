<?php
ob_start();

define('DB_HOST',    'mysql-animex.alwaysdata.net');
define('DB_NAME',    'animex_db');
define('DB_USER',    'animex');
define('DB_PASS',    '13dediciembre');
define('DB_CHARSET', 'utf8mb4');

define('UPLOAD_DIR', __DIR__ . '/../uploads/');
define('COVERS_DIR', UPLOAD_DIR . 'covers/');
define('VIDEOS_DIR', UPLOAD_DIR . 'videos/');
define('BASE_URL', (function() {
    $proto = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host  = $_SERVER['HTTP_HOST'] ?? 'localhost';
    $script = $_SERVER['SCRIPT_NAME'] ?? '';
    // If running from a subfolder /animex/
    if (strpos($script, '/animex/') === 0) return $proto.'://'.$host.'/animex';
    return $proto.'://'.$host;
})());

if (session_status() === PHP_SESSION_NONE) session_start();

function getDB(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        try {
            $pdo = new PDO(
                "mysql:host=".DB_HOST.";dbname=".DB_NAME.";charset=".DB_CHARSET,
                DB_USER, DB_PASS,
                [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC, PDO::ATTR_EMULATE_PREPARES=>false]
            );
        } catch (PDOException $e) {
            jsonResponse(['error'=>'Error de conexión: '.$e->getMessage()], 500);
        }
    }
    return $pdo;
}

function jsonResponse(array $data, int $code = 200): void {
    ob_clean();
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-cache');
    echo json_encode($data, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
    exit;
}

function requireAuth(): array {
    if (empty($_SESSION['user_id'])) jsonResponse(['error'=>'No autenticado'], 401);
    return ['id'=>$_SESSION['user_id'], 'rol'=>$_SESSION['rol']];
}

function requireAdmin(): void {
    $u = requireAuth();
    if ($u['rol'] !== 'admin') jsonResponse(['error'=>'Acceso denegado'], 403);
}

function crearDirs(): void {
    foreach ([COVERS_DIR, VIDEOS_DIR] as $d) {
        if (!is_dir($d)) @mkdir($d, 0755, true);
    }
}

function crearDirSeguro(string $path): bool {
    if (is_dir($path)) return true;
    // Intentar con 0777 para máxima compatibilidad en hosting compartido
    if (@mkdir($path, 0777, true)) return true;
    // Si falla, intentar sin @ para ver el error real
    return false;
}
