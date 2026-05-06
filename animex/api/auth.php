<?php
require_once __DIR__.'/../includes/config.php';
$action=$_GET['action']??'';
switch($action){
    case 'login':
        if($_SERVER['REQUEST_METHOD']!=='POST') jsonResponse(['error'=>'POST requerido'],405);
        $d=json_decode(file_get_contents('php://input'),true)??[];
        $u=trim($d['username']??''); $p=$d['password']??'';
        if(!$u||!$p) jsonResponse(['error'=>'Completa todos los campos'],400);
        $db=getDB();
        $s=$db->prepare("SELECT id,username,email,password,rol,activo FROM usuarios WHERE username=? OR email=? LIMIT 1");
        $s->execute([$u,$u]); $user=$s->fetch();
        if(!$user||!password_verify($p,$user['password'])) jsonResponse(['error'=>'Usuario o contraseña incorrectos'],401);
        if(!$user['activo']) jsonResponse(['error'=>'Cuenta desactivada'],403);
        $db->prepare("UPDATE usuarios SET last_login=NOW() WHERE id=?")->execute([$user['id']]);
        $_SESSION['user_id']=$user['id']; $_SESSION['username']=$user['username']; $_SESSION['rol']=$user['rol'];
        jsonResponse(['success'=>true,'user'=>['id'=>$user['id'],'username'=>$user['username'],'email'=>$user['email'],'rol'=>$user['rol']]]);
        break;
    case 'register':
        if($_SERVER['REQUEST_METHOD']!=='POST') jsonResponse(['error'=>'POST requerido'],405);
        $d=json_decode(file_get_contents('php://input'),true)??[];
        $u=trim($d['username']??''); $e=trim($d['email']??''); $p=$d['password']??'';
        if(!$u||!$e||!$p) jsonResponse(['error'=>'Completa todos los campos'],400);
        if(!filter_var($e,FILTER_VALIDATE_EMAIL)) jsonResponse(['error'=>'Correo no válido'],400);
        if(strlen($p)<6) jsonResponse(['error'=>'Contraseña mínimo 6 caracteres'],400);
        $db=getDB();
        $c=$db->prepare("SELECT id FROM usuarios WHERE username=? OR email=?"); $c->execute([$u,$e]);
        if($c->fetch()) jsonResponse(['error'=>'Usuario o correo ya registrado'],409);
        $hash=password_hash($p,PASSWORD_BCRYPT);
        $db->prepare("INSERT INTO usuarios(username,email,password,rol)VALUES(?,?,?,'user')")->execute([$u,$e,$hash]);
        $nid=(int)$db->lastInsertId();
        $_SESSION['user_id']=$nid; $_SESSION['username']=$u; $_SESSION['rol']='user';
        jsonResponse(['success'=>true,'user'=>['id'=>$nid,'username'=>$u,'email'=>$e,'rol'=>'user']]);
        break;
    case 'logout':
        session_destroy(); jsonResponse(['success'=>true]); break;
    case 'session':
        if(!empty($_SESSION['user_id']))
            jsonResponse(['loggedIn'=>true,'user'=>['id'=>$_SESSION['user_id'],'username'=>$_SESSION['username'],'rol'=>$_SESSION['rol']]]);
        else jsonResponse(['loggedIn'=>false]);
        break;
    default: jsonResponse(['error'=>'Acción no válida'],404);
}
