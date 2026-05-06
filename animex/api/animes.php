<?php
require_once __DIR__.'/../includes/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

if ($method==='POST' && !empty($_POST['_method']) && $action==='') {
    $method = strtoupper($_POST['_method']);
}

$db = getDB();

function getGeneros(PDO $db, int $id): array {
    $s=$db->prepare("SELECT g.id,g.nombre FROM generos g JOIN anime_generos ag ON g.id=ag.genero_id WHERE ag.anime_id=?");
    $s->execute([$id]); return $s->fetchAll();
}
function getVideos(PDO $db, int $id): array {
    $s=$db->prepare("SELECT idioma,episodio,video_path FROM anime_videos WHERE anime_id=? ORDER BY idioma,episodio");
    $s->execute([$id]); $out=[];
    foreach($s->fetchAll() as $r) $out[$r['idioma']][$r['episodio']]=$r['video_path'];
    return $out;
}
function subirPortada(): ?string {
    if (empty($_FILES['cover']['tmp_name'])||$_FILES['cover']['error']!==0) return null;
    $ext=strtolower(pathinfo($_FILES['cover']['name'],PATHINFO_EXTENSION));
    if (!in_array($ext,['jpg','jpeg','png','webp','gif'])) jsonResponse(['error'=>'Formato de imagen no permitido'],400);
    crearDirs();
    $fn=uniqid('cover_').'.'.$ext;
    if (!move_uploaded_file($_FILES['cover']['tmp_name'],COVERS_DIR.$fn)) jsonResponse(['error'=>'No se pudo guardar la portada. Verifica permisos en uploads/covers/'],500);
    return 'uploads/covers/'.$fn;
}

// ── Subir video: parámetros vienen en GET para evitar que AppServ los borre ──
if ($method==='POST' && $action==='video') {
    requireAdmin();
    $animeId = (int)($_GET['anime_id'] ?? 0);
    $idioma  = trim($_GET['idioma']    ?? '');
    $ep      = max(1,(int)($_GET['episodio'] ?? 1));
    $validos = ['esp_lat','jpn_esp','eng_esp'];
    if (!$animeId)                    jsonResponse(['error'=>'anime_id requerido'],400);
    if (!in_array($idioma,$validos))  jsonResponse(['error'=>"Idioma '$idioma' no válido"],400);
    $chk=$db->prepare("SELECT id FROM animes WHERE id=?"); $chk->execute([$animeId]);
    if (!$chk->fetch()) jsonResponse(['error'=>'Anime no encontrado'],404);
    if (empty($_FILES['video']['tmp_name'])) {
        $errs=[1=>'Supera upload_max_filesize en php.ini',2=>'Supera MAX_FILE_SIZE',3=>'Subida parcial',4=>'No se seleccionó archivo',6=>'Sin carpeta temporal',7=>'Sin permisos de escritura'];
        $c=$_FILES['video']['error']??4;
        jsonResponse(['error'=> $errs[$c]??"Error de subida código $c"],400);
    }
    if ($_FILES['video']['error']!==0) {
        $errs=[1=>'El video supera upload_max_filesize — edita php.ini y aumenta ese valor',2=>'Supera MAX_FILE_SIZE',3=>'Subida parcial',6=>'Sin carpeta temporal',7=>'Sin permisos en disco'];
        jsonResponse(['error'=> $errs[$_FILES['video']['error']]??"Error código ".$_FILES['video']['error']],400);
    }
    crearDirs();
    $vn=uniqid($idioma.'_ep'.$ep.'_').'.mp4';
    if (!move_uploaded_file($_FILES['video']['tmp_name'],VIDEOS_DIR.$vn)) jsonResponse(['error'=>'No se pudo mover el video. Verifica permisos en uploads/videos/'],500);
    $db->prepare("INSERT INTO anime_videos (anime_id,episodio,idioma,video_path) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE video_path=VALUES(video_path)")
       ->execute([$animeId,$ep,$idioma,'uploads/videos/'.$vn]);
    jsonResponse(['success'=>true,'path'=>'uploads/videos/'.$vn,'episodio'=>$ep,'idioma'=>$idioma]);
}

switch ($method) {
    case 'GET':
        if (isset($_GET['id'])) {
            $s=$db->prepare("SELECT * FROM animes WHERE id=?"); $s->execute([(int)$_GET['id']]);
            $a=$s->fetch(); if (!$a) jsonResponse(['error'=>'No encontrado'],404);
            $a['generos']=getGeneros($db,$a['id']); $a['videos']=getVideos($db,$a['id']); jsonResponse($a);
        }
        $w=['1=1']; $p=[];
        if (!empty($_GET['q']))      {$w[]='a.nombre LIKE ?'; $p[]='%'.$_GET['q'].'%';}
        if (!empty($_GET['nuevo']))  {$w[]='a.es_nuevo=1';}
        if (!empty($_GET['genero'])) {$w[]='EXISTS(SELECT 1 FROM anime_generos ag JOIN generos g ON g.id=ag.genero_id WHERE ag.anime_id=a.id AND g.nombre=?)'; $p[]=$_GET['genero'];}
        if (!empty($_GET['estado'])) {$w[]='a.estado=?'; $p[]=$_GET['estado'];}
        $s=$db->prepare('SELECT a.* FROM animes a WHERE '.implode(' AND ',$w).' ORDER BY a.id DESC');
        $s->execute($p); $animes=$s->fetchAll();
        foreach($animes as &$a){$a['generos']=getGeneros($db,$a['id']); $a['videos']=getVideos($db,$a['id']);}
        jsonResponse($animes);
        break;

    case 'POST':
        requireAdmin();
        $nombre=trim($_POST['nombre']??'');
        if ($nombre==='') jsonResponse(['error'=>'El nombre es obligatorio','post'=>array_keys($_POST),'content_type'=>$_SERVER['CONTENT_TYPE']??'none'],400);
        $desc=trim($_POST['descripcion']??''); $anio=(int)($_POST['anio']??date('Y'));
        $eps=max(1,(int)($_POST['episodios']??1)); $estado=$_POST['estado']??'En emisión';
        $rating=(float)($_POST['rating']??0); $nuevo=!empty($_POST['es_nuevo'])?1:0;
        $gids=json_decode($_POST['generos']??'[]',true)?:[];
        $cover=subirPortada();
        $db->prepare("INSERT INTO animes(nombre,descripcion,anio,episodios,estado,rating,es_nuevo,cover_path)VALUES(?,?,?,?,?,?,?,?)")
           ->execute([$nombre,$desc,$anio,$eps,$estado,$rating,$nuevo,$cover]);
        $id=(int)$db->lastInsertId();
        if ($gids){$g=$db->prepare("INSERT IGNORE INTO anime_generos(anime_id,genero_id)VALUES(?,?)"); foreach($gids as $gid)$g->execute([$id,(int)$gid]);}
        jsonResponse(['success'=>true,'id'=>$id,'cover'=>$cover],201);
        break;

    case 'PUT':
        requireAdmin();
        $id=(int)($_GET['id']??$_POST['id']??0); if(!$id) jsonResponse(['error'=>'ID requerido'],400);
        $src=!empty($_POST)?$_POST:(json_decode(file_get_contents('php://input'),true)??[]);
        $f=[];$v=[];
        if(!empty($src['nombre']))    {$f[]='nombre=?';     $v[]=$src['nombre'];}
        if(isset($src['descripcion'])){$f[]='descripcion=?';$v[]=$src['descripcion'];}
        if(!empty($src['anio']))      {$f[]='anio=?';       $v[]=(int)$src['anio'];}
        if(!empty($src['episodios'])) {$f[]='episodios=?';  $v[]=(int)$src['episodios'];}
        if(!empty($src['estado']))    {$f[]='estado=?';     $v[]=$src['estado'];}
        if(isset($src['rating']))     {$f[]='rating=?';     $v[]=(float)$src['rating'];}
        if(isset($src['es_nuevo']))   {$f[]='es_nuevo=?';   $v[]=(int)$src['es_nuevo'];}
        $nc=subirPortada(); if($nc){$f[]='cover_path=?';$v[]=$nc;}
        if($f){$v[]=$id;$db->prepare("UPDATE animes SET ".implode(',',$f)." WHERE id=?")->execute($v);}
        if(!empty($src['generos'])){
            $gids=is_array($src['generos'])?$src['generos']:json_decode($src['generos'],true);
            $db->prepare("DELETE FROM anime_generos WHERE anime_id=?")->execute([$id]);
            $g=$db->prepare("INSERT IGNORE INTO anime_generos(anime_id,genero_id)VALUES(?,?)");
            foreach((array)$gids as $gid)$g->execute([$id,(int)$gid]);
        }
        jsonResponse(['success'=>true]);
        break;

    case 'DELETE':
        requireAdmin();
        $id=(int)($_GET['id']??0); if(!$id) jsonResponse(['error'=>'ID requerido'],400);
        $r=$db->prepare("SELECT cover_path FROM animes WHERE id=?"); $r->execute([$id]); $a=$r->fetch();
        if($a&&$a['cover_path']){$f=__DIR__.'/../'.$a['cover_path']; if(file_exists($f))unlink($f);}
        $vs=$db->prepare("SELECT video_path FROM anime_videos WHERE anime_id=?"); $vs->execute([$id]);
        foreach($vs->fetchAll() as $v){$f=__DIR__.'/../'.$v['video_path']; if(file_exists($f))unlink($f);}
        $db->prepare("DELETE FROM animes WHERE id=?")->execute([$id]);
        jsonResponse(['success'=>true]);
        break;

    default: jsonResponse(['error'=>'Método no permitido'],405);
}
