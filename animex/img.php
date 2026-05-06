<?php
// Servir archivos de uploads (imágenes y videos)
$file = $_GET['f'] ?? '';
if (!preg_match('/^[a-zA-Z0-9_\-\.\/]+$/', $file) || strpos($file,'..') !== false) {
    http_response_code(400); exit;
}
$base  = realpath(__DIR__.'/uploads');
$full  = realpath($base.'/'.$file);
if (!$full || strpos($full,$base)!==0 || !is_file($full)) {
    http_response_code(404); exit;
}
$ext  = strtolower(pathinfo($full,PATHINFO_EXTENSION));
$mime = ['jpg'=>'image/jpeg','jpeg'=>'image/jpeg','png'=>'image/png','webp'=>'image/webp','gif'=>'image/gif','mp4'=>'video/mp4'][$ext] ?? 'application/octet-stream';
$size = filesize($full);
header('Content-Type: '.$mime);
header('Cache-Control: public, max-age=86400');
header('Accept-Ranges: bytes');
if ($mime==='video/mp4' && isset($_SERVER['HTTP_RANGE'])) {
    preg_match('/bytes=(\d+)-(\d*)/',$_SERVER['HTTP_RANGE'],$m);
    $start=(int)$m[1]; $end=($m[2]!==''?(int)$m[2]:$size-1); $end=min($end,$size-1); $len=$end-$start+1;
    http_response_code(206);
    header('Content-Range: bytes '.$start.'-'.$end.'/'.$size);
    header('Content-Length: '.$len);
    $fp=fopen($full,'rb'); fseek($fp,$start);
    $sent=0; while($sent<$len&&!feof($fp)){$chunk=min(8192,$len-$sent);echo fread($fp,$chunk);$sent+=$chunk;if(ob_get_level())ob_flush();flush();}
    fclose($fp);
} else {
    header('Content-Length: '.$size);
    readfile($full);
}
