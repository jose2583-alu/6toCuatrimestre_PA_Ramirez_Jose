<?php
require_once __DIR__.'/../includes/config.php';
$action=$_GET['action']??''; $db=getDB();
switch($action){
    case 'favoritos':
        $u=requireAuth();
        $s=$db->prepare("SELECT a.*,f.created_at AS fav_at FROM favoritos f JOIN animes a ON a.id=f.anime_id WHERE f.usuario_id=? ORDER BY f.created_at DESC");
        $s->execute([$u['id']]); $favs=$s->fetchAll();
        foreach($favs as &$a){$g=$db->prepare("SELECT g.nombre FROM generos g JOIN anime_generos ag ON g.id=ag.genero_id WHERE ag.anime_id=?"); $g->execute([$a['id']]); $a['generos']=array_column($g->fetchAll(),'nombre');}
        jsonResponse($favs); break;
    case 'favorito':
        if($_SERVER['REQUEST_METHOD']!=='POST') jsonResponse(['error'=>'POST requerido'],405);
        $u=requireAuth(); $d=json_decode(file_get_contents('php://input'),true)??[];
        $aid=(int)($d['anime_id']??0); if(!$aid) jsonResponse(['error'=>'anime_id requerido'],400);
        $c=$db->prepare("SELECT id FROM favoritos WHERE usuario_id=? AND anime_id=?"); $c->execute([$u['id'],$aid]);
        if($c->fetch()){$db->prepare("DELETE FROM favoritos WHERE usuario_id=? AND anime_id=?")->execute([$u['id'],$aid]); jsonResponse(['action'=>'removed','anime_id'=>$aid]);}
        else{$db->prepare("INSERT INTO favoritos(usuario_id,anime_id)VALUES(?,?)")->execute([$u['id'],$aid]); jsonResponse(['action'=>'added','anime_id'=>$aid]);}
        break;
    case 'historial':
        $u=requireAuth();
        $s=$db->prepare("SELECT a.id,a.nombre,a.cover_path,h.episodio,h.progreso,h.idioma,h.updated_at FROM historial_visto h JOIN animes a ON a.id=h.anime_id WHERE h.usuario_id=? ORDER BY h.updated_at DESC LIMIT 20");
        $s->execute([$u['id']]); jsonResponse($s->fetchAll()); break;
    case 'progreso':
        if($_SERVER['REQUEST_METHOD']!=='POST') jsonResponse(['error'=>'POST requerido'],405);
        $u=requireAuth(); $d=json_decode(file_get_contents('php://input'),true)??[];
        $aid=(int)($d['anime_id']??0); $ep=(int)($d['episodio']??1); $prog=min(100,max(0,(int)($d['progreso']??0))); $idioma=$d['idioma']??'esp_lat';
        if(!$aid) jsonResponse(['error'=>'anime_id requerido'],400);
        $db->prepare("INSERT INTO historial_visto(usuario_id,anime_id,episodio,progreso,idioma)VALUES(?,?,?,?,?) ON DUPLICATE KEY UPDATE episodio=VALUES(episodio),progreso=VALUES(progreso),idioma=VALUES(idioma)")
           ->execute([$u['id'],$aid,$ep,$prog,$idioma]);
        jsonResponse(['success'=>true]); break;
    case 'generos':
        jsonResponse($db->query("SELECT * FROM generos ORDER BY nombre")->fetchAll()); break;
    case 'perfil':
        $u=requireAuth(); $s=$db->prepare("SELECT id,username,email,rol,plan_suscripcion,suscripcion_desde,created_at,last_login FROM usuarios WHERE id=?"); $s->execute([$u['id']]); $prof=$s->fetch();
        if(!$prof) jsonResponse(['error'=>'No encontrado'],404);
        $cf=$db->prepare("SELECT COUNT(*) c FROM favoritos WHERE usuario_id=?"); $cf->execute([$u['id']]);
        $ch=$db->prepare("SELECT COUNT(*) c FROM historial_visto WHERE usuario_id=?"); $ch->execute([$u['id']]);
        $prof['total_favoritos']=(int)$cf->fetch()['c']; $prof['total_historial']=(int)$ch->fetch()['c'];
        jsonResponse($prof); break;
    case 'usuarios':
        requireAdmin(); jsonResponse($db->query("SELECT id,username,email,rol,plan_suscripcion,activo,created_at,last_login FROM usuarios ORDER BY id DESC")->fetchAll()); break;
    case 'toggle_usuario':
        if($_SERVER['REQUEST_METHOD']!=='POST') jsonResponse(['error'=>'POST requerido'],405);
        requireAdmin(); $d=json_decode(file_get_contents('php://input'),true)??[]; $uid=(int)($d['id']??0);
        if(!$uid) jsonResponse(['error'=>'id requerido'],400);
        $db->prepare("UPDATE usuarios SET activo=NOT activo WHERE id=?")->execute([$uid]); jsonResponse(['success'=>true]); break;
    default: jsonResponse(['error'=>'Acción no válida'],404);
}
