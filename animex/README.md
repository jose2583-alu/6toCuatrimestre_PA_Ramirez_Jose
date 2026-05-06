# AnimeX — Guía de Instalación Rápida

## Requisitos
- XAMPP / AppServ / Laragon (PHP 8+ y MySQL 8+)

---

## Pasos

### 1. Copiar archivos
Coloca la carpeta `animex/` dentro de tu servidor web:
- AppServ → `C:\AppServ\www\animex\`
- XAMPP   → `C:\xampp\htdocs\animex\`
- Laragon → `C:\laragon\www\animex\`

### 2. Crear la base de datos
En **phpMyAdmin** → pestaña **Importar** → selecciona `database/animex.sql` → Continuar.

### 3. Configurar la conexión
Abre `includes/config.php` y cambia:
```php
define('DB_USER', 'root');        // tu usuario MySQL
define('DB_PASS', '');            // tu contraseña MySQL
```

### 4. Ejecutar el setup
Visita en tu navegador:
```
http://localhost/animex/setup.php
```
Este paso genera los hashes de contraseñas correctamente.
Verás ✅ en cada paso. Luego haz clic en "Ir a AnimeX".

⚠️ **Borra `setup.php` después de usarlo.**

### 5. ¡Listo!
Accede a: `http://localhost/animex/`

---

## Credenciales por defecto

| Usuario  | Contraseña | Rol   |
|----------|-----------|-------|
| admin    | admin123  | Admin |
| usuario  | user123   | User  |

---

## Estructura
```
animex/
├── index.html          ← Login / Registro
├── setup.php           ← Instalador (borra después)
├── database/
│   └── animex.sql      ← Esquema de base de datos
├── includes/
│   └── config.php      ← Configuración BD ← EDITAR AQUÍ
├── api/
│   ├── auth.php        ← Autenticación
│   ├── animes.php      ← CRUD animes
│   └── user.php        ← Favoritos, historial
├── assets/
│   ├── css/global.css
│   └── js/api.js
├── user/               ← Portal de usuario
├── admin/              ← Panel administración
└── uploads/            ← Imágenes y videos subidos
```
