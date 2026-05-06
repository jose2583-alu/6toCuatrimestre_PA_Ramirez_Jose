-- ============================================================
--  AnimeX - Migración: Suscripciones, Anuncios y Productos
-- ============================================================

USE animex;

-- Planes de suscripción
CREATE TABLE IF NOT EXISTS planes_suscripcion (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    nombre      VARCHAR(100) NOT NULL,
    tipo        ENUM('individual','familiar','anual') NOT NULL UNIQUE,
    precio      DECIMAL(8,2) NOT NULL DEFAULT 0.00,
    beneficios  TEXT DEFAULT NULL,
    activo      TINYINT(1) NOT NULL DEFAULT 1,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Suscripción del usuario
ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS plan_suscripcion ENUM('ninguno','individual','familiar','anual') NOT NULL DEFAULT 'ninguno' AFTER rol,
    ADD COLUMN IF NOT EXISTS suscripcion_desde DATETIME DEFAULT NULL AFTER plan_suscripcion;

-- Anuncios (banners)
CREATE TABLE IF NOT EXISTS anuncios (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    titulo      VARCHAR(200) NOT NULL,
    imagen_path VARCHAR(255) DEFAULT NULL,
    link_url    VARCHAR(500) DEFAULT NULL,
    activo      TINYINT(1) NOT NULL DEFAULT 1,
    tipo        ENUM('global','player') NOT NULL DEFAULT 'global',
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Productos por anime
CREATE TABLE IF NOT EXISTS anime_productos (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    anime_id    INT NOT NULL,
    nombre      VARCHAR(200) NOT NULL,
    descripcion TEXT DEFAULT NULL,
    imagen_path VARCHAR(255) DEFAULT NULL,
    link_url    VARCHAR(500) DEFAULT NULL,
    orden       INT NOT NULL DEFAULT 0,
    activo      TINYINT(1) NOT NULL DEFAULT 1,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (anime_id) REFERENCES animes(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Planes por defecto
INSERT IGNORE INTO planes_suscripcion (nombre, tipo, precio, beneficios) VALUES
('Plan Individual', 'individual', 9.99, 'Acceso ilimitado a todo el catálogo|Sin anuncios|1 pantalla simultánea|Calidad HD'),
('Plan Familiar',   'familiar',  19.99, 'Acceso ilimitado a todo el catálogo|Sin anuncios|Hasta 5 pantallas simultáneas|Calidad 4K|Perfiles personalizados'),
('Plan Anual',      'anual',     89.99, 'Todo lo del Plan Individual|Ahorro del 25%|Acceso a contenido exclusivo|Descarga de episodios|Soporte prioritario');
