<?php
/**
 * AnimeX – Setup de carpetas para Manga
 * Ejecuta este script UNA VEZ en el navegador:
 *   https://tu-dominio.com/animex/setup_manga.php
 * Luego bórralo por seguridad.
 */
$baseDir = __DIR__ . '/uploads/';
$dirs = [
    $baseDir,
    $baseDir . 'manga/',
    $baseDir . 'manga/portadas/',
    $baseDir . 'manga/paginas/',
    $baseDir . 'covers/',
    $baseDir . 'videos/',
    $baseDir . 'ads/',
    $baseDir . 'products/',
];

echo '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>AnimeX – Setup Manga</title>
<style>
  body{font-family:monospace;background:#0d0d0d;color:#eee;padding:40px;max-width:700px;margin:0 auto}
  h1{color:#e63946;font-size:28px}
  .ok{color:#06d6a0} .err{color:#e63946} .warn{color:#ffd166}
  .box{background:#1a1a2e;border:1px solid #333;border-radius:8px;padding:20px;margin-top:20px}
  code{background:#111;padding:2px 8px;border-radius:4px;font-size:13px}
</style></head><body>';
echo '<h1>🔧 AnimeX – Setup de Carpetas</h1>';
echo '<div class="box">';

$allOk = true;
foreach ($dirs as $dir) {
    $short = str_replace(__DIR__ . '/', '', $dir);
    if (is_dir($dir)) {
        $w = is_writable($dir);
        $p = substr(sprintf('%o', fileperms($dir)), -4);
        echo $w
            ? "<p class='ok'>✅ <code>$short</code> — existe, escribible (perms: $p)</p>"
            : "<p class='warn'>⚠️ <code>$short</code> — existe pero NO escribible (perms: $p)</p>";
        if (!$w) { @chmod($dir, 0755); echo "<p class='ok'>  → chmod 0755 aplicado</p>"; }
    } else {
        if (@mkdir($dir, 0755, true)) {
            echo "<p class='ok'>✅ <code>$short</code> — creado correctamente</p>";
        } elseif (@mkdir($dir, 0777, true)) {
            echo "<p class='ok'>✅ <code>$short</code> — creado con 0777</p>";
        } else {
            echo "<p class='err'>❌ <code>$short</code> — NO se pudo crear. Créalo manualmente.</p>";
            $allOk = false;
        }
    }
}

echo '</div>';

// Diagnóstico adicional
echo '<div class="box">';
echo '<h2 style="color:#ffd166;font-size:16px">ℹ️ Info del servidor</h2>';
echo '<p>PHP ejecuta como usuario: <code>' . (function_exists('posix_getpwuid') ? (posix_getpwuid(posix_geteuid())['name'] ?? '?') : get_current_user()) . '</code></p>';
echo '<p>UPLOAD_TMP_DIR: <code>' . (ini_get('upload_tmp_dir') ?: sys_get_temp_dir()) . '</code></p>';
echo '<p>upload_max_filesize: <code>' . ini_get('upload_max_filesize') . '</code></p>';
echo '<p>post_max_size: <code>' . ini_get('post_max_size') . '</code></p>';
echo '<p>max_file_uploads: <code>' . ini_get('max_file_uploads') . '</code></p>';
echo '</div>';

if ($allOk) {
    echo '<div class="box"><p class="ok" style="font-size:18px;font-weight:bold">🎉 Todo listo. Ya puedes subir manga desde el panel admin.</p>';
    echo '<p class="warn">⚠️ Borra este archivo (<code>setup_manga.php</code>) por seguridad.</p></div>';
} else {
    echo '<div class="box"><p class="err">❌ Algunas carpetas no se pudieron crear. Créalas manualmente via FTP/SSH con permisos 755.</p></div>';
}

echo '</body></html>';
