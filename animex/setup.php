<?php
// ============================================================
//  AnimeX Setup — Solo necesario si actualizas desde v1-v8
//  Si instalas desde cero con animex.sql, NO necesitas esto
// ============================================================
require_once 'includes/config.php';
$db = getDB(); $log = [];

// Migración: columna episodio en anime_videos (v1 no la tenía)
try { $db->exec("ALTER TABLE anime_videos ADD COLUMN episodio INT NOT NULL DEFAULT 1 AFTER anime_id"); $log[]="✅ Columna episodio agregada"; }
catch (PDOException) { $log[]="ℹ️ Columna episodio ya existe (OK)"; }
try { $db->exec("ALTER TABLE anime_videos DROP INDEX uq_anime_idioma"); } catch (PDOException) {}
try { $db->exec("ALTER TABLE anime_videos ADD UNIQUE KEY uq_anime_ep_idioma (anime_id,episodio,idioma)"); $log[]="✅ Índice actualizado"; }
catch (PDOException) { $log[]="ℹ️ Índice ya actualizado (OK)"; }

// Actualizar hashes si vienen de versión antigua
$h_admin = '$2y$10$qW7mjkZoOn.T/VnsAHKFsuyWu5dg0FE60LfWvwTgHf0kTAEPXx/Ii';
$h_user  = '$2y$10$n/XpmUlFRdlDIwZdEFc4p.OLk4In5UFWPgVZOS8f0q5X8w9irZiVi';

$chk = $db->prepare("SELECT id FROM usuarios WHERE username=?");
$chk->execute(['admin']);
if ($chk->fetch()) {
    $db->prepare("UPDATE usuarios SET password=? WHERE username='admin'")->execute([$h_admin]);
    $db->prepare("UPDATE usuarios SET password=? WHERE username='usuario'")->execute([$h_user]);
    $log[] = "✅ Hashes actualizados";
} else {
    $db->prepare("INSERT INTO usuarios(username,email,password,rol)VALUES(?,?,?,?)")->execute(['admin','admin@animex.com',$h_admin,'admin']);
    $db->prepare("INSERT INTO usuarios(username,email,password,rol)VALUES(?,?,?,?)")->execute(['usuario','usuario@animex.com',$h_user,'user']);
    $log[] = "✅ Usuarios creados";
}

// Verificar
foreach ($db->query("SELECT username,password FROM usuarios WHERE username IN('admin','usuario')")->fetchAll() as $r) {
    $p = $r['username']==='admin' ? 'admin123' : 'user123';
    $ok = password_verify($p, $r['password']);
    $log[] = ($ok?'✅':'❌')." Hash <strong>{$r['username']}</strong>: ".($ok?'CORRECTO ✓':'FALLÓ ✗');
}

// Migración: Nuevas tablas (suscripciones, anuncios, productos)
try { $db->exec("ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS plan_suscripcion ENUM('ninguno','individual','familiar','anual') NOT NULL DEFAULT 'ninguno' AFTER rol"); $log[]="✅ Columna plan_suscripcion agregada"; }
catch (PDOException) { $log[]="ℹ️ Columna plan_suscripcion ya existe (OK)"; }
try { $db->exec("ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS suscripcion_desde DATETIME DEFAULT NULL AFTER plan_suscripcion"); $log[]="✅ Columna suscripcion_desde agregada"; }
catch (PDOException) { $log[]="ℹ️ Columna suscripcion_desde ya existe (OK)"; }
try { $db->exec("CREATE TABLE IF NOT EXISTS planes_suscripcion (id INT AUTO_INCREMENT PRIMARY KEY, nombre VARCHAR(100) NOT NULL, tipo ENUM('individual','familiar','anual') NOT NULL UNIQUE, precio DECIMAL(8,2) NOT NULL DEFAULT 0.00, beneficios TEXT DEFAULT NULL, activo TINYINT(1) NOT NULL DEFAULT 1, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB"); $log[]="✅ Tabla planes_suscripcion creada"; }
catch (PDOException $e) { $log[]="ℹ️ Tabla planes_suscripcion: ".$e->getMessage(); }
try { $db->exec("INSERT IGNORE INTO planes_suscripcion (nombre, tipo, precio, beneficios) VALUES ('Plan Individual','individual',9.99,'Acceso ilimitado a todo el catálogo|Sin anuncios|1 pantalla simultánea|Calidad HD'),('Plan Familiar','familiar',19.99,'Acceso ilimitado a todo el catálogo|Sin anuncios|Hasta 5 pantallas simultáneas|Calidad 4K|Perfiles personalizados'),('Plan Anual','anual',89.99,'Todo lo del Plan Individual|Ahorro del 25%|Acceso a contenido exclusivo|Descarga de episodios|Soporte prioritario')"); $log[]="✅ Planes insertados"; }
catch (PDOException $e) { $log[]="ℹ️ Planes: ".$e->getMessage(); }
try { $db->exec("CREATE TABLE IF NOT EXISTS anuncios (id INT AUTO_INCREMENT PRIMARY KEY, titulo VARCHAR(200) NOT NULL, imagen_path VARCHAR(255) DEFAULT NULL, link_url VARCHAR(500) DEFAULT NULL, activo TINYINT(1) NOT NULL DEFAULT 1, tipo ENUM('global','player') NOT NULL DEFAULT 'global', created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB"); $log[]="✅ Tabla anuncios creada"; }
catch (PDOException $e) { $log[]="ℹ️ Tabla anuncios: ".$e->getMessage(); }
try { $db->exec("CREATE TABLE IF NOT EXISTS anime_productos (id INT AUTO_INCREMENT PRIMARY KEY, anime_id INT NOT NULL, nombre VARCHAR(200) NOT NULL, descripcion TEXT DEFAULT NULL, imagen_path VARCHAR(255) DEFAULT NULL, link_url VARCHAR(500) DEFAULT NULL, orden INT NOT NULL DEFAULT 0, activo TINYINT(1) NOT NULL DEFAULT 1, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (anime_id) REFERENCES animes(id) ON DELETE CASCADE) ENGINE=InnoDB"); $log[]="✅ Tabla anime_productos creada"; }
catch (PDOException $e) { $log[]="ℹ️ Tabla anime_productos: ".$e->getMessage(); }

// Carpetas adicionales
foreach (['ads','productos'] as $sub) {
    $dir = UPLOAD_DIR.$sub.'/';
    if (!is_dir($dir)) @mkdir($dir,0755,true);
    $w = is_writable($dir);
    $log[] = ($w?'✅':'❌')." <code>uploads/$sub/</code>: ".($w?'permisos OK':'SIN PERMISOS');
}
    if (!is_dir($path)) @mkdir($path,0755,true);
    $w = is_writable($path);
    $log[] = ($w?'✅':'❌')." <code>$label</code>: ".($w?'permisos OK':'SIN PERMISOS');
}
$log[] = "ℹ️ PHP ".phpversion()." | upload_max: ".ini_get('upload_max_filesize')." | post_max: ".ini_get('post_max_size');
?>
<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>AnimeX Setup</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;background:#0a0a12;color:#f0f0f8;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px}.box{background:#16162a;border:1px solid rgba(230,57,70,.3);border-radius:16px;padding:36px;max-width:640px;width:100%}h1{font-size:40px;letter-spacing:4px;color:#e63946;margin-bottom:4px}h2{font-size:12px;color:#6060a0;letter-spacing:2px;text-transform:uppercase;margin-bottom:24px}.log div{padding:9px 14px;border-radius:6px;font-size:14px;margin-bottom:5px;background:rgba(255,255,255,.04);line-height:1.6}code{background:rgba(230,57,70,.15);color:#ff6b6b;padding:2px 8px;border-radius:4px;font-size:12px}.warn{margin-top:20px;padding:14px;background:rgba(230,57,70,.1);border:1px solid rgba(230,57,70,.3);border-radius:8px;font-size:13px;color:#ff6b6b}.btn{display:inline-block;margin-top:24px;padding:14px 32px;background:#e63946;color:#fff;border-radius:8px;font-weight:800;font-size:15px;text-decoration:none}</style>
</head><body><div class="box"><h1>ANIMEX</h1><h2>Migración / Setup</h2>
<div class="log"><?php foreach($log as $l) echo "<div>$l</div>"; ?></div>
<div class="warn">⚠️ Borra <code>setup.php</code> después de usarlo.</div>
<a href="/animex/index.html" class="btn">🚀 Ir a AnimeX</a>
</div></body></html>
